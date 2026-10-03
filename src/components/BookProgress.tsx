import type { Item } from "@/db/schema";

export function BookProgress({ book, who, whoAvatar }: { book: Item & { pagesRead: number }; who?: string; whoAvatar?: React.ReactNode }) {
  const pct = book.totalPages ? Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100)) : null;
  return (
    <div className="flex gap-4">
      <Cover title={book.title} url={book.coverUrl} className="h-28 w-[76px] lg:h-36 lg:w-24" />
      <div className="min-w-0 flex-1">
        {who && <div className="label flex min-w-0 items-center gap-2">{whoAvatar}<span className="truncate">{who} читает</span></div>}
        <div className="mt-1 line-clamp-2 font-medium leading-snug [overflow-wrap:anywhere]" title={book.title}>{book.title}</div>
        {book.author && <div className="truncate text-[13px] text-muted">{book.author}</div>}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-raised">
            <div className="h-1.5 rounded-full bg-teal" style={{ width: `${pct ?? 0}%` }} />
          </div>
          <span className="num shrink-0 text-[12px] text-muted">
            {book.totalPages ? `${book.pagesRead} / ${book.totalPages}` : `${book.pagesRead} стр.`}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Карточка в блоке «Читают сейчас»: крупная обложка 2:3 (96×144, на компьютере 128×192),
 * кто читает, название до двух строк, автор, «X / Y стр.» и процент.
 */
export function ReadingNowCard({ book, who, avatar }: { book: Item & { pagesRead: number }; who: string; avatar: React.ReactNode }) {
  const pct = book.totalPages ? Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100)) : null;
  return (
    <article className="flex min-w-0 gap-4 lg:gap-5">
      <Cover title={book.title} url={book.coverUrl}
        className="h-36 w-24 !rounded-lg !p-2.5 !text-[13px] shadow-[0_8px_20px_-6px_rgba(0,0,0,.6)] lg:h-48 lg:w-32 lg:!text-[15px]" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
          {avatar}<span className="truncate"><span className="text-ink">{who}</span> · читает</span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[17px] font-semibold leading-snug [overflow-wrap:anywhere] lg:text-[19px]" title={book.title}>{book.title}</h3>
        {book.author && <div className="mt-0.5 truncate text-[14px] text-muted">{book.author}</div>}
        <div className="mt-auto pt-3">
          <div className="h-2 rounded-full bg-raised" role="progressbar" aria-label="Прочитано"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
            <div className="h-2 rounded-full bg-teal shadow-[0_0_10px_rgba(44,224,199,.45)]" style={{ width: `${Math.max(pct ?? 0, book.pagesRead ? 2 : 0)}%` }} />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[13px]">
            <span className="num text-muted">
              {book.totalPages ? <><span className="text-ink">{book.pagesRead}</span> / {book.totalPages} стр.</> : `${book.pagesRead} стр.`}
            </span>
            {pct !== null && <span className="num font-semibold text-teal">{pct}%</span>}
          </div>
        </div>
      </div>
    </article>
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
    <div className={`${className} shrink-0 rounded-md p-2 text-[12px] font-bold leading-tight text-night overflow-hidden [overflow-wrap:anywhere]`} style={{ background: h }}>
      {title}
    </div>
  );
}
