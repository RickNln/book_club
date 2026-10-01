import type { Item } from "@/db/schema";

export function BookProgress({ book, who, whoAvatar }: { book: Item & { pagesRead: number }; who?: string; whoAvatar?: React.ReactNode }) {
  const pct = book.totalPages ? Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100)) : null;
  return (
    <div className="flex gap-4">
      <Cover title={book.title} url={book.coverUrl} className="h-28 w-[76px] lg:h-36 lg:w-24" />
      <div className="min-w-0 flex-1">
        {who && <div className="label flex items-center gap-2">{whoAvatar}{who} читает</div>}
        <div className="mt-1 line-clamp-2 font-medium leading-snug">{book.title}</div>
        {book.author && <div className="truncate text-[13px] text-muted">{book.author}</div>}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-raised">
            <div className="h-1.5 rounded-full bg-teal" style={{ width: `${pct ?? 0}%` }} />
          </div>
          <span className="num text-[12px] text-muted">
            {book.totalPages ? `${book.pagesRead} / ${book.totalPages}` : `${book.pagesRead} стр.`}
          </span>
        </div>
      </div>
    </div>
  );
}

const hues = ["#2CE0C7", "#FFB547", "#8B9CFF", "#F27FA5", "#7CD992"];
export function Cover({ title, url, className = "" }: { title: string; url: string | null; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${className} shrink-0 rounded-md object-cover`} />;
  }
  const h = hues[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];
  return (
    <div className={`${className} shrink-0 rounded-md p-2 text-[11px] font-bold leading-tight text-night overflow-hidden`} style={{ background: h }}>
      {title}
    </div>
  );
}
