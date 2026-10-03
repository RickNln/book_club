import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import type { PersonalContext } from "@/content/facts";
import type { StreakInfo } from "@/components/Streak";
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
  const members = await db().select({
    id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl, createdAt: schema.users.createdAt,
  })
    .from(schema.users)
    .where(and(eq(schema.users.groupId, me.groupId), eq(schema.users.isActive, true)));
  const entries = await db().select().from(schema.entries)
    .where(and(eq(schema.entries.habitId, habit.id), gte(schema.entries.day, habit.startedOn)));
  const books = await db().select().from(schema.items).where(eq(schema.items.habitId, habit.id));
  const stats = members
    .map((m) => memberStats(m, habit, entries, books, t))
    .sort((a, b) => (b.consistency30 ?? -1) - (a.consistency30 ?? -1) || b.current - a.current);
  // среднее по тем, у кого в окне уже есть дни: новичок без дней не тянет группу вниз
  const avg = (k: "consistency30" | "thisWeek" | "lastWeek") => {
    const xs = stats.map((m) => m[k]).filter((x): x is number => x !== null);
    return xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0;
  };
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

/** Цифры для персональных фактов и признак «вчера был пропуск». */
export function factContext(d: Awaited<ReturnType<typeof groupDashboard>>, me: User) {
  const mine = d.stats.find((s) => s.user.id === me.id);
  const states = mine ? [...mine.states.values()] : [];
  const ctx: PersonalContext = {
    pages: mine?.pagesTotal ?? 0,
    days: states.filter((s) => s === "norm" || s === "minimum").length,
    groupPages: d.totalPages,
    streak: mine?.current ?? 0,
  };
  const y = mine?.states.get(addDays(d.today, -1));
  return { ctx, missedYesterday: y === "missed" || y === "frozen" };
}

/** Личная серия, заморозки и вчерашний день — для панели на дашборде и «Сегодня». */
export function streakInfo(d: Awaited<ReturnType<typeof groupDashboard>>, me: User): StreakInfo {
  const mine = d.stats.find((s) => s.user.id === me.id);
  const todayState = mine?.states.get(d.today);
  return {
    current: mine?.current ?? 0, best: mine?.best ?? 0,
    freezes: mine?.freezes ?? { total: d.habit.freezesPerWeek, used: 0, left: d.habit.freezesPerWeek },
    frozenYesterday: mine?.frozenYesterday ?? false, brokeYesterday: mine?.brokeYesterday ?? false,
    doneToday: todayState === "norm" || todayState === "minimum",
    yesterday: addDays(d.today, -1),
  };
}
