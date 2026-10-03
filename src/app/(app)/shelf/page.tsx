import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Item } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { readingHabit } from "@/lib/data";
import { diffDays, shortDate } from "@/lib/dates";
import { Cover } from "@/components/BookProgress";
import { Avatar } from "@/components/Avatar";

export default async function Shelf() {
  const me = await requireUser();
  const habit = await readingHabit(me.groupId);
  const users = await db().select({ id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl }).from(schema.users)
    .where(eq(schema.users.groupId, me.groupId));
  const books = await db().select().from(schema.items).where(eq(schema.items.habitId, habit.id));
  const entries = await db().select().from(schema.entries).where(eq(schema.entries.habitId, habit.id));
  const finishedCount = books.filter((b) => b.status === "finished").length;
  const evenings = (id: number) => new Set(entries.filter((e) => e.itemId === id).map((e) => e.day)).size;
  const pages = (id: number) => entries.filter((e) => e.itemId === id).reduce((a, e) => a + Number(e.values?.pages ?? 0), 0);
  const canEdit = (b: Item) => b.userId === me.id || me.role === "admin";
  // свои — первыми
  const ordered = [...users].sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : a.name.localeCompare(b.name)));

  const BookCard = ({ b }: { b: Item }) => (
    <li className="group relative min-w-0">
      <Cover title={b.title} url={b.coverUrl} className="aspect-[2/3] w-full" />
      {b.status === "active" && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-night/85 px-1.5 py-0.5 text-[10px] font-semibold text-teal">читает</span>
      )}
      <div className="mt-1.5 truncate text-[13px] font-medium" title={b.title}>{b.title}</div>
      {b.author && <div className="truncate text-[12px] text-muted">{b.author}</div>}
      <div className="text-[12px] text-muted">{evenings(b.id)} веч. · {pages(b.id)} стр.</div>
      {b.status === "finished" && b.finishedOn && (
        <div className="text-[11px] text-muted">
          {shortDate(b.startedOn)} – {shortDate(b.finishedOn)} ({diffDays(b.finishedOn, b.startedOn) + 1} дн.)
        </div>
      )}
      {canEdit(b) && (
        <Link href={`/books/${b.id}`}
          className="mt-1 inline-block text-[12px] text-teal lg:absolute lg:right-1.5 lg:top-1.5 lg:mt-0 lg:rounded-md lg:bg-night/85 lg:px-2 lg:py-1 lg:opacity-0 lg:transition lg:group-hover:opacity-100 lg:focus:opacity-100">
          Изменить
        </Link>
      )}
    </li>
  );

  return (
    <div className="space-y-4 lg:space-y-5">
      <header>
        <div className="label">Прочитано за челлендж</div>
        <h1 className="font-display text-xl font-bold lg:text-3xl">Полка · <span className="num">{finishedCount}</span></h1>
      </header>

      {books.length === 0 && (
        <div className="card p-5 text-muted">
          Полка пока пустая. <Link href="/today" className="text-teal">Добавьте книгу</Link>, которую читаете, — дочитанные появятся здесь с датами и числом вечеров.
        </div>
      )}

      {ordered.map((u) => {
        const mine = books.filter((b) => b.userId === u.id)
          .sort((a, b) => (a.status === b.status ? (b.finishedOn ?? b.startedOn).localeCompare(a.finishedOn ?? a.startedOn) : a.status === "active" ? -1 : 1));
        if (!mine.length) return null;
        const done = mine.filter((b) => b.status === "finished").length;
        return (
          <section key={u.id} id={`u-${u.id}`} className="card p-5 lg:p-7">
            <h2 className="flex min-w-0 items-center gap-3 font-semibold"><Avatar name={u.name} url={u.avatarUrl} size={36} /><span className="truncate">{u.id === me.id ? "Вы" : u.name}</span> <span className="num shrink-0 text-muted">· {done}</span></h2>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-6">
              {mine.map((b) => <BookCard key={b.id} b={b} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
