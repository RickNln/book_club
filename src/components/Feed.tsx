"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  addComment, deleteComment, deleteNote, loadFeed, markFeedSeen, refreshComments, saveNote, updateComment,
} from "@/app/actions";
import type { FeedComment, FeedItem, FeedPage } from "@/lib/feed";
import { Avatar } from "./Avatar";
import { Cover } from "./BookProgress";

const NOTE_MAX = 1000;
const POLL_MS = 15_000;

/** Лента мыслей: подгрузка по 20, комментарии обновляются без перезагрузки. */
export function FeedList({ initial }: { initial: FeedPage }) {
  const [items, setItems] = useState(initial.items);
  const [next, setNext] = useState(initial.next);
  const [loading, startLoading] = useTransition();
  const ids = useRef<number[]>([]);
  ids.current = items.map((i) => i.id);

  // открыли ленту — бейдж непрочитанного обнуляется
  useEffect(() => { markFeedSeen(); }, []);

  // новые комментарии других участников появляются сами, пока лента открыта
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== "visible" || !ids.current.length) return;
      try {
        const fresh = await refreshComments(ids.current);
        setItems((list) => list.map((i) => (fresh[i.id] ? { ...i, comments: fresh[i.id] } : i)));
      } catch { /* сеть пропала — попробуем в следующий раз */ }
    };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, []);

  const update = (id: number, patch: Partial<FeedItem> | null) =>
    setItems((list) => (patch ? list.map((i) => (i.id === id ? { ...i, ...patch } : i)) : list.filter((i) => i.id !== id)));

  if (!items.length) {
    return (
      <div className="card p-6 text-center lg:p-10">
        <p className="font-display text-lg font-bold">Здесь пока тихо</p>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          Отметьте вечер и напишите, что запомнилось, — мысль появится здесь, и друзья смогут ответить.
        </p>
        <Link href="/today" className="btn-primary mt-5">Написать первую мысль</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {items.map((it) => <li key={it.id}><FeedCard item={it} onChange={(p) => update(it.id, p)} /></li>)}
      </ul>
      {next && (
        <button type="button" disabled={loading} className="btn-ghost w-full"
          onClick={() => startLoading(async () => {
            const page = await loadFeed(next);
            setItems((list) => [...list, ...page.items.filter((p) => !list.some((i) => i.id === p.id))]);
            setNext(page.next);
          })}>
          {loading ? "Загружаю…" : "Показать ещё"}
        </button>
      )}
    </div>
  );
}

function FeedCard({ item, onChange }: { item: FeedItem; onChange: (patch: Partial<FeedItem> | null) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, startBusy] = useTransition();
  const [err, setErr] = useState("");
  const hidden = item.isSpoiler && !revealed;

  return (
    <article className="card min-w-0 p-4 sm:p-5 lg:p-6">
      <header className="flex items-center gap-3">
        <Avatar name={item.name} url={item.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{item.mine ? "Вы" : item.name}</div>
          <div className="truncate text-[12px] text-muted">вечер {item.day} · {item.at}</div>
        </div>
        {item.pages > 0 && <span className="num shrink-0 text-[14px] text-teal">+{item.pages} стр.</span>}
      </header>

      {item.book && (
        <div className="mt-3 flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="shrink-0"><Cover title={item.book.title} url={item.book.coverUrl} className="h-10 w-7 !p-0 !text-[0px]" /></span>
          <span className="truncate text-[13px] text-muted" title={item.book.title}>{item.book.title}</span>
        </div>
      )}

      <div className="mt-3">
        {editing ? (
          <NoteEditor entryId={item.id} note={item.note} isSpoiler={item.isSpoiler} autoFocus
            onCancel={() => setEditing(false)}
            onSaved={(note, isSpoiler) => { setEditing(false); onChange(note ? { note, isSpoiler } : null); }} />
        ) : hidden ? (
          <button type="button" onClick={() => setRevealed(true)}
            className="w-full rounded-xl border border-dashed border-lamp/40 bg-lamp/5 px-4 py-3 text-left text-[14px] text-lamp hover:bg-lamp/10">
            Спойлер{item.book ? <> к «{item.book.title}»</> : null} — <span className="underline underline-offset-2">показать</span>
          </button>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">{item.note}</p>
        )}
      </div>

      {!editing && (item.mine || item.canDelete) && (
        <div className="mt-2 flex flex-wrap gap-x-4 text-[13px]">
          {item.mine && <button type="button" className="text-muted hover:text-ink" onClick={() => setEditing(true)}>Изменить</button>}
          {item.canDelete && (
            <button type="button" disabled={busy} className="text-muted hover:text-lamp"
              onClick={() => {
                if (!confirm("Удалить мысль? Комментарии к ней тоже удалятся. Отметка вечера и серия останутся.")) return;
                startBusy(async () => { const r = await deleteNote(item.id); if (r.error) setErr(r.error); else onChange(null); });
              }}>
              Удалить{item.mine ? "" : " как админ"}
            </button>
          )}
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-[13px] text-lamp">{err}</p>}

      <Comments entryId={item.id} comments={item.comments} onChange={(comments) => onChange({ comments })} />
    </article>
  );
}

function Comments({ entryId, comments, onChange }: { entryId: number; comments: FeedComment[]; onChange: (c: FeedComment[]) => void }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const run = (p: Promise<{ error?: string; comments?: FeedComment[] }>, after?: () => void) => start(async () => {
    const r = await p;
    if (r.error) { setErr(r.error); return; }
    setErr(""); if (r.comments) onChange(r.comments); after?.();
  });

  return (
    <section className="mt-4 border-t border-line pt-3" aria-label="Комментарии">
      {comments.length > 0 && (
        <ul className="mb-3 space-y-3">
          {comments.map((c) => <CommentRow key={c.id} c={c} busy={busy}
            onSave={(t, done) => run(updateComment(c.id, t), done)}
            onDelete={() => confirm("Удалить комментарий?") && run(deleteComment(c.id))} />)}
        </ul>
      )}
      <form className="flex items-end gap-2" onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) run(addComment(entryId, text), () => setText(""));
      }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={NOTE_MAX}
          placeholder="Ответить…" aria-label="Ответить на мысль"
          className="input min-h-[44px] flex-1 resize-none py-2.5 lg:text-[14px]"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }} />
        <button type="submit" disabled={busy || !text.trim()} className="btn-primary shrink-0 px-4 py-2.5 text-[14px]">
          {busy ? "…" : "Отправить"}
        </button>
      </form>
      {err && <p role="alert" className="mt-2 text-[13px] text-lamp">{err}</p>}
    </section>
  );
}

function CommentRow({ c, busy, onSave, onDelete }: {
  c: FeedComment; busy: boolean; onSave: (text: string, done: () => void) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.text);
  return (
    <li className="flex gap-2.5">
      <Avatar name={c.name} url={c.avatarUrl} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2 text-[13px]">
          <span className="truncate font-medium">{c.mine ? "Вы" : c.name}</span>
          <span className="shrink-0 text-[12px] text-muted">{c.at}{c.edited ? " · изменён" : ""}</span>
        </div>
        {editing ? (
          <form className="mt-1 space-y-2" onSubmit={(e) => { e.preventDefault(); onSave(text, () => setEditing(false)); }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={NOTE_MAX} rows={2} autoFocus
              aria-label="Текст комментария" className="input resize-y py-2 lg:text-[14px]" />
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !text.trim()} className="btn-primary px-3 py-1.5 text-[13px]">Сохранить</button>
              <button type="button" className="btn-ghost px-3 py-1.5 text-[13px]" onClick={() => { setText(c.text); setEditing(false); }}>Отмена</button>
            </div>
          </form>
        ) : (
          <p className="whitespace-pre-wrap text-[14px] leading-snug [overflow-wrap:anywhere]">{c.text}</p>
        )}
        {!editing && (c.mine || c.canDelete) && (
          <div className="mt-1 flex gap-3 text-[12px] text-muted">
            {c.mine && <button type="button" className="hover:text-ink" onClick={() => setEditing(true)}>Изменить</button>}
            {c.canDelete && <button type="button" disabled={busy} className="hover:text-lamp" onClick={onDelete}>Удалить</button>}
          </div>
        )}
      </div>
    </li>
  );
}

/** Добавить или изменить свою мысль — в ленте и на «Сегодня». Пустой текст удаляет мысль. */
export function NoteEditor({ entryId, note, isSpoiler, onSaved, onCancel, autoFocus }: {
  entryId: number; note: string | null; isSpoiler: boolean; autoFocus?: boolean;
  onSaved?: (note: string, isSpoiler: boolean) => void; onCancel?: () => void;
}) {
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [busy, start] = useTransition();
  const [len, setLen] = useState(note?.length ?? 0);
  return (
    <form className="space-y-2" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      start(async () => {
        const r = await saveNote({}, fd);
        setMsg(r);
        if (!r.error) onSaved?.(String(fd.get("note") ?? "").trim(), fd.get("isSpoiler") === "on");
      });
    }}>
      <input type="hidden" name="entryId" value={entryId} />
      <textarea name="note" defaultValue={note ?? ""} maxLength={NOTE_MAX} rows={3} autoFocus={autoFocus}
        placeholder="Что запомнилось?" aria-label="Что запомнилось?"
        onChange={(e) => setLen(e.target.value.length)} className="input resize-y" />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-[14px] text-muted">
          <input type="checkbox" name="isSpoiler" defaultChecked={isSpoiler} className="h-4 w-4 accent-teal" /> Спойлер
        </label>
        {len > NOTE_MAX - 100 && <span className="num text-[12px] text-muted">{len} / {NOTE_MAX}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-primary px-4 py-2 text-[14px]">{busy ? "Секунду…" : "Сохранить"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2 text-[14px]">Отмена</button>}
      </div>
      {msg.error && <p role="alert" className="text-[13px] text-lamp">{msg.error}</p>}
      {msg.ok && !onSaved && <p role="status" className="text-[13px] text-teal">{msg.ok}</p>}
    </form>
  );
}
