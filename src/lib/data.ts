import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { addDays, today } from "./dates";
import { memberStats, groupPagesSeries } from "./stats";

export async function readingHabit(groupId: number) {
  const [h] = await db().select().from(schema.habits)
    .where(and(eq(schema.habits.groupId, groupId), eq(schema.habits.slug, "reading")));
  if (!h) throw new Error("Привычка «Чтение» не найдена. Запустите npm run db:seed");
  return h;
}

export async function groupDashboard(me: User) {
  const t = today();
  const habit = await readingHabit(me.groupId);
  const members = await db().select({ id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl })
    .from(schema.users)
    .where(and(eq(schema.users.groupId, me.groupId), eq(schema.users.isActive, true)));
  const entries = await db().select().from(schema.entries)
    .where(and(eq(schema.entries.habitId, habit.id), gte(schema.entries.day, habit.startedOn)));
  const books = await db().select().from(schema.items).where(eq(schema.items.habitId, habit.id));
  const stats = members
    .map((m) => memberStats(m, habit, entries, books, t))
    .sort((a, b) => b.consistency30 - a.consistency30 || b.current - a.current);
  const avg = (k: "consistency30" | "thisWeek" | "lastWeek") =>
    stats.length ? Math.round(stats.reduce((s, m) => s + m[k], 0) / stats.length) : 0;
  return {
    today: t, habit, stats, books,
    series: groupPagesSeries(entries, t, 30),
    overall: avg("consistency30"),
    thisWeek: avg("thisWeek"),
    deltaWeek: avg("thisWeek") - avg("lastWeek"),
    bestStreak: stats.reduce((m, s) => Math.max(m, s.current), 0),
    totalPages: stats.reduce((s, m) => s + m.pagesTotal, 0),
    totalBooks: books.filter((b) => b.status === "finished").length,
    monthStart: addDays(t, -(Number(t.slice(8)) - 1)),
  };
}
