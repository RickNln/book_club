import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Item } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { readingHabit } from "@/lib/data";
import { diffDays, shortDate } from "@/lib/dates";
import { Cover } from "@/components/BookProgress";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";

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
  // одна и та же книга у нескольких участников — по названию без учёта регистра
  const titleKey = (t: string) => t.trim().toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
  const club = new Map<string, { readers: number; ratings: number[] }>();
  for (const b of books) {
    if (b.status !== "finished") continue;
    const c = club.get(titleKey(b.title)) ?? { readers: 0, ratings: [] };
    c.readers++;
    if (b.rating) c.ratings.push(b.rating);
    club.set(titleKey(b.title), c);
  }
  const clubOf = (b: Item) => {
    const c = club.get(titleKey(b.title));
    return c && c.readers > 1 && c.ratings.length ? { avg: c.ratings.reduce((a, r) => a + r, 0) / c.ratings.length, n: c.ratings.length } : null;
  };
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
      {b.status === "finished" && (
        b.rating
          ? <div className="mt-0.5"><Stars value={b.rating} className="text-[14px]" /></div>
          : b.userId === me.id
            ? <div className="mt-0.5"><Link href={`/books/${b.id}`} className="text-[12px] text-teal">☆ Оценить</Link></div>
            : <div className="mt-0.5 text-[12px] text-muted">без оценки</div>
      )}
      {b.status === "finished" && b.review && (
        <p className="mt-1 line-clamp-3 text-[12px] italic leading-snug text-muted [overflow-wrap:anywhere]" title={b.review}>«{b.review}»</p>
      )}
      {(() => {
        const c = b.status === "finished" ? clubOf(b) : null;
        return c && (
          <div className="mt-1 text-[11px] text-muted" title="Средняя оценка клуба">
            клуб <span className="text-lamp">★</span> <span className="num text-ink">{c.avg.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}</span> · {c.n} {c.n === 1 ? "оценка" : c.n < 5 ? "оценки" : "оценок"}
          </div>
        );
      })()}
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
