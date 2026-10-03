import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { editableBook } from "@/lib/books";
import { EditBookForm } from "@/components/forms";
import { RateBookForm } from "@/components/FinishBook";
import { Stars } from "@/components/Stars";

export default async function EditBook({ params }: { params: { id: string } }) {
  const me = await requireUser();
  const book = await editableBook(me, Number(params.id));
  if (!book) notFound();
  const foreign = book.userId !== me.id;
  const finished = book.status === "finished";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <Link href="/shelf" className="text-[13px] text-teal">← Полка</Link>
        <h1 className="mt-1 font-display text-xl font-bold lg:text-3xl">Редактировать книгу</h1>
        {foreign && <p className="label mt-1 [overflow-wrap:anywhere]">Книга участника {book.ownerName} — вы правите её как админ</p>}
      </header>

      {/* оценку и отзыв правит только тот, кто читал */}
      {finished && !foreign && <RateBookForm itemId={book.id} rating={book.rating} review={book.review} />}
      {finished && foreign && (
        <section className="card p-5">
          <h2 className="font-semibold">Оценка {book.ownerName}</h2>
          {book.rating
            ? <p className="mt-2"><Stars value={book.rating} className="text-[20px]" /></p>
            : <p className="mt-2 text-muted">Без оценки</p>}
          {book.review && <p className="mt-2 whitespace-pre-wrap text-[15px] [overflow-wrap:anywhere]">{book.review}</p>}
        </section>
      )}

      <EditBookForm book={book} />
    </div>
  );
}
