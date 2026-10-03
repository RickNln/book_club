import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { readingHabit } from "@/lib/data";
import { canBackfillYesterday, today } from "@/lib/dates";
import { AddBookForm, LogForm } from "@/components/forms";
import { finishBook, undoEntry } from "@/app/actions";
import { BookProgress } from "@/components/BookProgress";
import Link from "next/link";

export default async function Today() {
  const me = await requireUser();
  const habit = await readingHabit(me.groupId);
  const t = today();
  const books = await db().select().from(schema.items)
    .where(and(eq(schema.items.userId, me.id), eq(schema.items.status, "active")));
  const myEntries = await db().select().from(schema.entries)
    .where(and(eq(schema.entries.userId, me.id), eq(schema.entries.habitId, habit.id)))
    .orderBy(desc(schema.entries.createdAt));
  const todays = myEntries.filter((e) => e.day === t);
  const read = (id: number) => myEntries.filter((e) => e.itemId === id).reduce((a, e) => a + Number(e.values?.pages ?? 0), 0);

  return (
    <div className="space-y-4 lg:space-y-6">
      <header>
        <div className="label">Норма — {habit.targetMinutes} минут, засчитывается от {habit.minMinutes}</div>
        <h1 className="font-display text-xl font-bold lg:text-3xl">{todays.length ? "Вечер засчитан" : "Как прошёл вечер?"}</h1>
      </header>

      {todays.length > 0 && (
        <section className="card p-5">
          <ul className="space-y-2">
            {todays.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  <span className="num text-teal">+{String(e.values?.pages ?? 0)}</span> стр. · {books.find((b) => b.id === e.itemId)?.title ?? "книга"}
                  {e.level === "minimum" && <span className="text-muted"> · минимум</span>}
                </span>
                <form action={undoEntry} className="shrink-0">
                  <input type="hidden" name="entryId" value={e.id} />
                  <button className="text-[13px] text-muted underline-offset-2 hover:underline">Отменить</button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-muted">Читали ещё одну книгу? Отметьте и её — день засчитается один раз.</p>
        </section>
      )}

      {books.length === 0 ? (
        <div className="card p-5">
          <p>Сначала добавьте книгу, которую читаете сейчас.</p>
          <AddBookForm open />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-6 [&>*]:min-w-0">
          <LogForm books={books.map((b) => ({ id: b.id, title: b.title }))} canYesterday={canBackfillYesterday()} />
          <div className="space-y-4">
          <section className="card space-y-4 p-5">
            <h2 className="font-semibold">Читаю сейчас</h2>
            {books.map((b) => (
              <div key={b.id}>
                <BookProgress book={{ ...b, pagesRead: read(b.id) }} />
                <div className="mt-2 flex justify-end gap-4">
                  <Link href={`/books/${b.id}`} className="text-[13px] text-muted hover:text-ink">Изменить</Link>
                  <form action={finishBook}>
                    <input type="hidden" name="itemId" value={b.id} />
                    <button className="text-[13px] text-teal">Дочитал — на полку</button>
                  </form>
                </div>
              </div>
            ))}
          </section>
          <AddBookForm />
          </div>
        </div>
      )}
    </div>
  );
}
