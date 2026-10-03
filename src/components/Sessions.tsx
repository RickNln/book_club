"use client";
import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { deleteSession, updateSession } from "@/app/actions";

export type Session = {
  id: number; date: string; itemId: number | null; title: string | null; pages: number;
  level: "norm" | "minimum"; note: string | null; isSpoiler: boolean; noteEdited: boolean;
};
type Book = { id: number; title: string; status: "active" | "finished" };

function Save() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-[14px]">{pending ? "Секунду…" : "Сохранить"}</button>;
}

/** Одна сессия: просмотр, правка (свои) и удаление (свои или админ). Дата не меняется. */
export function SessionRow({ s, books, editable }: { s: Session; books: Book[]; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const [state, act] = useFormState(updateSession, {});
  useEffect(() => { if (state.ok) setEditing(false); }, [state]);

  const remove = () => {
    if (!confirm(`Удалить сессию за ${s.date}? Если это единственная отметка за вечер, день станет пропуском.`)) return;
    start(async () => { const r = await deleteSession(s.id); if (r.error) setErr(r.error); });
  };

  if (editing) {
    return (
      <form action={act} className="card space-y-4 p-4 sm:p-5">
        <input type="hidden" name="entryId" value={s.id} />
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{s.date}</span>
          <span className="text-[12px] text-muted">дата не меняется</span>
        </div>
        <label className="block">
          <span className="label">Книга</span>
          <select name="itemId" defaultValue={s.itemId ?? ""} required className="input mt-1">
            {!s.itemId && <option value="" disabled>Книга удалена — выберите</option>}
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}{b.status === "finished" ? " (дочитана)" : ""}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Страниц</span>
          <input name="pages" type="number" inputMode="numeric" min={0} max={2000} defaultValue={s.pages} required className="input num mt-1" />
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="label mb-1">Сколько читали</legend>
          {(["norm", "minimum"] as const).map((v) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="level" value={v} defaultChecked={s.level === v} className="peer sr-only" />
              <span className="block rounded-xl border border-line px-3 py-2.5 text-center text-[14px] text-muted
                peer-checked:border-teal peer-checked:bg-teal/10 peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-teal/50">
                {v === "norm" ? "20+ минут" : "Минимум, 5+"}
              </span>
            </label>
          ))}
        </fieldset>
        <label className="block">
          <span className="label">Что запомнилось? Пусто — убрать мысль</span>
          <textarea name="note" rows={3} maxLength={1000} defaultValue={s.note ?? ""} className="input mt-1 resize-y" />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-muted">
          <input type="checkbox" name="isSpoiler" defaultChecked={s.isSpoiler} className="h-4 w-4 accent-teal" /> Спойлер
        </label>
        {state.error && <p role="alert" className="text-[14px] text-lamp">{state.error}</p>}
        <div className="flex flex-wrap gap-2">
          <Save />
          <button type="button" onClick={() => setEditing(false)} className="btn-ghost px-4 py-2 text-[14px]">Отмена</button>
        </div>
      </form>
    );
  }

  return (
    <article className="card min-w-0 p-4 sm:p-5" data-session-id={s.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{s.date}</div>
          <div className="truncate text-[14px] text-muted" title={s.title ?? undefined}>{s.title ?? "книга удалена"}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-teal">+{s.pages} стр.</div>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.level === "norm" ? "bg-teal/15 text-teal" : "bg-raised text-muted"}`}>
            {s.level === "norm" ? "норма" : "минимум"}
          </span>
        </div>
      </div>
      {s.note && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-raised/60 px-3 py-2 text-[14px] text-ink/90 [overflow-wrap:anywhere]">
          {s.isSpoiler && <span className="mr-1.5 rounded bg-lamp/15 px-1.5 py-0.5 text-[11px] font-semibold text-lamp">спойлер</span>}
          {s.note}
          {s.noteEdited && <span className="ml-1.5 text-[12px] text-muted">· изменено</span>}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 text-[13px]">
        {editable && <button type="button" onClick={() => setEditing(true)} className="text-muted hover:text-ink">Изменить</button>}
        <button type="button" disabled={busy} onClick={remove} className="text-muted hover:text-lamp">
          {busy ? "Удаляю…" : editable ? "Удалить" : "Удалить как админ"}
        </button>
      </div>
      {(err || state.ok) && <p role={err ? "alert" : "status"} className={`mt-2 text-[13px] ${err ? "text-lamp" : "text-teal"}`}>{err || state.ok}</p>}
    </article>
  );
}
