"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addEmoji, deleteEmoji, renameEmoji, reorderEmoji, setEmojiHidden } from "@/app/actions";

const SIZE = 128;
const MAX_BYTES = 60 * 1024;
const LIMIT = 60;

export type AdminEmoji = { id: number; code: string; label: string; hidden: boolean; used: number };

const bytesOf = (dataUrl: string) => Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 3 / 4);

/**
 * Смайлик из картинки: 128×128. С прозрачностью — вписываем как есть;
 * обычное фото — квадрат из центра, обрезанный в круг. Итог PNG или WebP до 60 КБ.
 */
async function makeEmoji(file: File): Promise<{ dataUrl: string; transparent: boolean; bytes: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error("Не получилось открыть картинку")); i.src = url;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    // есть ли прозрачность: смотрим уменьшенную копию
    const probe = document.createElement("canvas");
    const ps = Math.min(1, 256 / Math.max(w, h));
    probe.width = Math.max(1, Math.round(w * ps)); probe.height = Math.max(1, Math.round(h * ps));
    const pc = probe.getContext("2d")!;
    pc.drawImage(img, 0, 0, probe.width, probe.height);
    const alpha = pc.getImageData(0, 0, probe.width, probe.height).data;
    let transparent = false;
    for (let i = 3; i < alpha.length; i += 4) if (alpha[i] < 245) { transparent = true; break; }

    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    if (transparent) {
      const k = SIZE / Math.max(w, h);
      ctx.drawImage(img, (SIZE - w * k) / 2, (SIZE - h * k) / 2, w * k, h * k);
    } else {
      const side = Math.min(w, h);
      ctx.beginPath(); ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
    }
    // PNG без потерь, если влезает; иначе WebP с понижением качества (прозрачность WebP сохраняет)
    let out = c.toDataURL("image/png");
    for (const q of [0.92, 0.85, 0.75, 0.6]) {
      if (bytesOf(out) <= MAX_BYTES) break;
      const webp = c.toDataURL("image/webp", q);
      if (webp.startsWith("data:image/webp")) out = webp;
    }
    if (bytesOf(out) > MAX_BYTES) throw new Error("Не удалось сжать до 60 КБ — попробуйте другое фото");
    return { dataUrl: out, transparent, bytes: bytesOf(out) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const slug = (s: string) => s.toLowerCase().normalize("NFKD")
  .replace(/[а-яё]/g, (ch) => ({ а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" } as Record<string, string>)[ch] ?? "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="btn-primary w-full">{pending ? "Сохраняю…" : "Добавить смайлик"}</button>;
}

function AddEmojiForm({ count }: { count: number }) {
  const [s, act] = useFormState(addEmoji, {});
  const [img, setImg] = useState<{ dataUrl: string; transparent: boolean; bytes: number } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (s.ok) { form.current?.reset(); setImg(null); setLabel(""); setCode(""); setCodeTouched(false); }
  }, [s]);
  const full = count >= LIMIT;

  return (
    <form ref={form} action={act} className="card space-y-4 p-5 lg:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Добавить смайлик</h2>
        <span className={`num text-[13px] ${full ? "text-lamp" : "text-muted"}`}>{count} / {LIMIT}</span>
      </div>
      <input type="hidden" name="image" value={img?.dataUrl ?? ""} />

      <label className="btn-ghost w-full cursor-pointer">
        {busy ? "Сжимаю…" : img ? "Выбрать другую картинку" : "Выбрать фото или PNG"}
        <input type="file" accept="image/*" className="sr-only" disabled={full} onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true); setErr("");
          try { setImg(await makeEmoji(f)); } catch (x) { setErr((x as Error).message); setImg(null); }
          setBusy(false);
        }} />
      </label>

      {img && (
        <div className="flex flex-wrap items-center gap-5 rounded-xl bg-raised/60 p-3">
          {/* как смайлик будет выглядеть: 24 px в ленте, 48 px в выборе — на тёмном и светлом */}
          <div className="flex items-end gap-4">
            <figure className="text-center"><img src={img.dataUrl} alt="" width={24} height={24} className="mx-auto h-6 w-6" /><figcaption className="mt-1 text-[11px] text-muted">24 px</figcaption></figure>
            <figure className="text-center"><img src={img.dataUrl} alt="" width={48} height={48} className="mx-auto h-12 w-12" /><figcaption className="mt-1 text-[11px] text-muted">48 px</figcaption></figure>
            <figure className="rounded-lg bg-ink p-1.5 text-center"><img src={img.dataUrl} alt="" width={24} height={24} className="h-6 w-6" /></figure>
          </div>
          <p className="text-[12px] text-muted">
            {img.transparent ? "Прозрачный фон сохранён" : "Фото без прозрачности — обрезано в круг"} · <span className="num">{Math.round(img.bytes / 1024)}</span> КБ
          </p>
        </div>
      )}

      <label className="block">
        <span className="label">Подпись — до 30 символов</span>
        <input name="label" required maxLength={30} value={label} placeholder="Rick в шоке" className="input mt-1"
          onChange={(e) => { setLabel(e.target.value); if (!codeTouched) setCode(slug(e.target.value)); }} />
      </label>
      <label className="block">
        <span className="label">Код латиницей, уникальный в клубе</span>
        <input name="code" required maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={code} placeholder="rick-shock"
          autoCapitalize="none" spellCheck={false} className="input num mt-1"
          onChange={(e) => { setCodeTouched(true); setCode(e.target.value.toLowerCase()); }} />
      </label>
      {(err || s.error) && <p role="alert" className="text-[14px] text-lamp">{err || s.error}</p>}
      {s.ok && <p role="status" className="text-[14px] text-teal">{s.ok}</p>}
      <Submit disabled={!img || busy || full} />

      <details className="text-[13px] text-muted">
        <summary className="cursor-pointer text-teal">Как сделать смайлик на iPhone</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Откройте фото в приложении «Фото».</li>
          <li>Зажмите пальцем лицо — оно «отделится» от фона.</li>
          <li>«Поделиться» → «Сохранить изображение» — получится PNG с прозрачным фоном.</li>
          <li>Здесь нажмите «Выбрать фото или PNG» и выберите сохранённое.</li>
        </ol>
      </details>
    </form>
  );
}

function EmojiCard({ e, index, total, onMove, busy, dragProps }: {
  e: AdminEmoji; index: number; total: number; busy: boolean;
  onMove: (from: number, to: number) => void;
  dragProps: React.HTMLAttributes<HTMLLIElement>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(e.label);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (p: Promise<{ error?: string; ok?: string }>, after?: () => void) =>
    start(async () => { const r = await p; setMsg(r.error ?? ""); if (!r.error) after?.(); });

  return (
    <li {...dragProps} className={`card flex min-w-0 flex-col gap-2 p-3 ${e.hidden ? "opacity-60" : ""} ${dragProps.className ?? ""}`}>
      <div className="flex items-center gap-3">
        <img src={`/emoji/${e.id}`} alt="" width={48} height={48} className="h-12 w-12 shrink-0" draggable={false} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form className="flex gap-1.5" onSubmit={(ev) => { ev.preventDefault(); run(renameEmoji(e.id, label), () => setEditing(false)); }}>
              <input value={label} onChange={(ev) => setLabel(ev.target.value)} maxLength={30} autoFocus aria-label="Подпись"
                className="input min-w-0 flex-1 px-2 py-1.5 lg:text-[14px]" />
              <button type="submit" disabled={pending} className="btn-primary px-2.5 py-1.5 text-[13px]">OK</button>
            </form>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="block max-w-full truncate text-left font-medium hover:text-teal" title="Переименовать">
              {e.label}
            </button>
          )}
          <div className="truncate text-[12px] text-muted"><span className="num">:{e.code}:</span>{e.used ? ` · реакций: ${e.used}` : ""}{e.hidden ? " · скрыт" : ""}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span className="flex gap-1">
          <button type="button" disabled={busy || index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Выше: ${e.label}`}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:text-ink disabled:opacity-30">↑</button>
          <button type="button" disabled={busy || index === total - 1} onClick={() => onMove(index, index + 1)} aria-label={`Ниже: ${e.label}`}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:text-ink disabled:opacity-30">↓</button>
        </span>
        <button type="button" disabled={pending} onClick={() => run(setEmojiHidden(e.id, !e.hidden))} className="text-muted hover:text-ink">
          {e.hidden ? "Показать" : "Скрыть"}
        </button>
        {e.used === 0 && (
          <button type="button" disabled={pending} className="text-muted hover:text-lamp"
            onClick={() => confirm(`Удалить «${e.label}»?`) && run(deleteEmoji(e.id))}>Удалить</button>
        )}
      </div>
      {msg && <p role="alert" className="text-[12px] text-lamp">{msg}</p>}
    </li>
  );
}

/** Админка «Смайлики клуба»: сетка набора, порядок стрелками или перетаскиванием, добавление. */
export function EmojiAdmin({ emoji }: { emoji: AdminEmoji[] }) {
  const [list, setList] = useState(emoji);
  const [drag, setDrag] = useState<number | null>(null);
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  useEffect(() => setList(emoji), [emoji]);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= list.length) return;
    const next = [...list];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setList(next);
    start(async () => { const r = await reorderEmoji(next.map((e) => e.id)); setErr(r.error ?? ""); });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 [&>*]:min-w-0">
      <section className="space-y-3">
        {list.length === 0 ? (
          <div className="card p-6 text-center text-muted">Набор пока пуст. Добавьте первый смайлик — фото лица с эмоцией.</div>
        ) : (
          <>
            <p className="label">Порядок — как в выборе у участников. Перетащите карточку или нажмите стрелки.</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
              {list.map((e, i) => (
                <EmojiCard key={e.id} e={e} index={i} total={list.length} onMove={move} busy={busy}
                  dragProps={{
                    draggable: true,
                    onDragStart: () => setDrag(i),
                    onDragOver: (ev) => ev.preventDefault(),
                    onDrop: () => { if (drag !== null) move(drag, i); setDrag(null); },
                    onDragEnd: () => setDrag(null),
                    className: drag === i ? "ring-2 ring-teal/50" : "cursor-grab",
                  }} />
              ))}
            </ul>
          </>
        )}
        {err && <p role="alert" className="text-[14px] text-lamp">{err}</p>}
      </section>
      <div className="lg:sticky lg:top-10"><AddEmojiForm count={list.length} /></div>
    </div>
  );
}
