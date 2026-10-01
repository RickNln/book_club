import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { editableBook } from "@/lib/books";
import { EditBookForm } from "@/components/forms";

export default async function EditBook({ params }: { params: { id: string } }) {
  const me = await requireUser();
  const book = await editableBook(me, Number(params.id));
  if (!book) notFound();
  const foreign = book.userId !== me.id;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <Link href="/shelf" className="text-[13px] text-teal">← Полка</Link>
        <h1 className="mt-1 font-display text-xl font-bold lg:text-3xl">Редактировать книгу</h1>
        {foreign && <p className="label mt-1">Книга участника {book.ownerName} — вы правите её как админ</p>}
      </header>
      <EditBookForm book={book} />
    </div>
  );
}
