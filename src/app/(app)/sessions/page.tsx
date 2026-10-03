import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { readingHabit } from "@/lib/data";
import { shortDate } from "@/lib/dates";
import { SessionRow, type Session } from "@/components/Sessions";

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

/** История сессий: свои — правка и удаление; админ смотрит чужие (?user=ID) и может только удалить. */
export default async function Sessions({ searchParams }: { searchParams: { user?: string } }) {
  const me = await requireUser();
  const habit = await readingHabit(me.groupId);
  const requested = Number(searchParams.user) || me.id;
  if (requested !== me.id && me.role !== "admin") notFound();
  const [owner] = await db().select({ id: schema.users.id, name: schema.users.name, groupId: schema.users.groupId })
    .from(schema.users).where(eq(schema.users.id, requested));
  if (!owner || owner.groupId !== me.groupId) notFound();
  const own = owner.id === me.id;

  const rows = await db().select({ e: schema.entries, title: schema.items.title })
    .from(schema.entries)
    .leftJoin(schema.items, eq(schema.items.id, schema.entries.itemId))
    .where(and(eq(schema.entries.userId, owner.id), eq(schema.entries.habitId, habit.id)))
    .orderBy(desc(schema.entries.day), desc(schema.entries.createdAt));
  const books = own
    ? await db().select({ id: schema.items.id, title: schema.items.title, status: schema.items.status })
      .from(schema.items).where(and(eq(schema.items.userId, me.id), eq(schema.items.habitId, habit.id)))
    : [];

  const sessions: Session[] = rows.map(({ e, title }) => ({
    id: e.id,
    date: `${shortDate(e.day)}, ${WEEKDAYS[new Date(e.day + "T00:00:00Z").getUTCDay()]}`,
    itemId: e.itemId, title, pages: Number(e.values?.pages ?? 0), level: e.level,
    note: e.note, isSpoiler: e.isSpoiler,
    noteEdited: !!e.noteCreatedAt && !!e.noteUpdatedAt && e.noteUpdatedAt.getTime() - e.noteCreatedAt.getTime() > 1000,
  }));
  const evenings = new Set(rows.map((r) => r.e.day)).size;

  return (
    <div className="mx-auto max-w-2xl space-y-4 lg:space-y-5">
      <header>
        <Link href={own ? "/profile" : "/admin"} className="text-[13px] text-teal">← {own ? "Профиль" : "Админка"}</Link>
        <h1 className="mt-1 font-display text-xl font-bold [overflow-wrap:anywhere] lg:text-3xl">{own ? "Мои сессии" : `Сессии: ${owner.name}`}</h1>
        <p className="label mt-1">
          {sessions.length ? `Отметок: ${sessions.length}, вечеров: ${evenings} · новые сверху. ` : ""}
          {own ? "Дату не изменить — так пропуск задним числом не закрыть." : "Как админ вы можете только удалить ошибочную сессию."}
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="card p-6 text-center text-muted">
          Пока ни одной сессии. {own && <Link href="/today" className="text-teal">Отметить вечер</Link>}
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => <li key={s.id}><SessionRow s={s} books={books} editable={own} /></li>)}
        </ul>
      )}
    </div>
  );
}
