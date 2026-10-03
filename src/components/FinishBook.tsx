"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { finishBook, rateBook } from "@/app/actions";
import { StarInput } from "./Stars";

const REVIEW_MAX = 1000;

function Buttons({ submitLabel, canSkip }: { submitLabel: string; canSkip?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={pending} className="btn-primary flex-1">{pending ? "Секунду…" : submitLabel}</button>
      {/* без оценки: formNoValidate снимает «обязательно», а skip=1 уходит с формой */}
      {canSkip && <button type="submit" name="skip" value="1" formNoValidate disabled={pending} className="btn-ghost">Пропустить</button>}
    </div>
  );
}

function Review({ defaultValue = "" }: { defaultValue?: string }) {
  const [len, setLen] = useState(defaultValue.length);
  return (
    <label className="block">
      <span className="label">Короткий отзыв — необязательно</span>
      <textarea name="review" rows={3} maxLength={REVIEW_MAX} defaultValue={defaultValue}
        onChange={(e) => setLen(e.target.value.length)} placeholder="Кому бы посоветовали? Что зацепило?"
        className="input mt-1 resize-y" />
      {len > REVIEW_MAX - 100 && <span className="num text-[12px] text-muted">{len} / {REVIEW_MAX}</span>}
    </label>
  );
}

/** «Дочитал — на полку»: окно с оценкой (обязательно) и отзывом; «Пропустить» — без оценки. */
export function FinishBookButton({ itemId, title }: { itemId: number; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [s, act] = useFormState(finishBook, {});
  useEffect(() => { if (s.ok) dialog.current?.close(); }, [s]);
  return (
    <>
      <button type="button" className="text-[13px] text-teal" onClick={() => dialog.current?.showModal()}>Дочитал — на полку</button>
      <dialog ref={dialog} aria-labelledby={`finish-${itemId}`}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-night/70 backdrop:backdrop-blur-sm">
        <form action={act} className="relative space-y-4 p-5">
          <input type="hidden" name="itemId" value={itemId} />
          <div>
            <div className="label">Дочитали</div>
            <h2 id={`finish-${itemId}`} className="font-display text-lg font-bold leading-snug [overflow-wrap:anywhere]">«{title}»</h2>
          </div>
          <StarInput required />
          <Review />
          {s.error && <p role="alert" className="text-[14px] text-lamp">{s.error}</p>}
          <Buttons submitLabel="На полку" canSkip />
          <button type="button" onClick={() => dialog.current?.close()}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink" aria-label="Закрыть">✕</button>
        </form>
      </dialog>
    </>
  );
}

/** Оценка и отзыв на странице книги — правит владелец. */
export function RateBookForm({ itemId, rating, review }: { itemId: number; rating: number | null; review: string | null }) {
  const [s, act] = useFormState(rateBook, {});
  return (
    <form action={act} className="card space-y-4 p-5 lg:p-7">
      <input type="hidden" name="itemId" value={itemId} />
      <h2 className="font-semibold">{rating ? "Ваша оценка" : "Оценить книгу"}</h2>
      <StarInput required defaultValue={rating ?? 0} />
      <Review defaultValue={review ?? ""} />
      {s.error && <p role="alert" className="text-[14px] text-lamp">{s.error}</p>}
      {s.ok && <p role="status" className="text-[14px] text-teal">{s.ok}</p>}
      <Buttons submitLabel={rating ? "Сохранить" : "Поставить оценку"} />
    </form>
  );
}
