"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Flame } from "./Flame";

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many;
};
const NOTICE_KEY = "kn.freezeNotice";

export type StreakInfo = {
  current: number; best: number;
  freezes: { total: number; used: number; left: number };
  frozenYesterday: boolean; brokeYesterday: boolean; doneToday: boolean;
  /** вчерашний день 'YYYY-MM-DD' — плашка о заморозке показывается один раз на этот день */
  yesterday: string;
};

/**
 * Личная серия и заморозки. Без красных нулей: оборванная серия показывается
 * как «Лучшая серия: N» и приглашение начать заново.
 */
export function StreakPanel({ info, cta = false, className = "" }: { info: StreakInfo; cta?: boolean; className?: string }) {
  const { current, best, freezes, frozenYesterday, brokeYesterday, doneToday, yesterday } = info;
  const comeback = brokeYesterday && !doneToday && current === 0;

  return (
    <section className={`card min-w-0 p-4 lg:p-5 ${className}`} aria-label="Ваша серия">
      <FreezeNotice show={frozenYesterday} day={yesterday} />
      {comeback ? (
        <div className="mb-3">
          <p className="font-display text-lg font-bold">С возвращением!</p>
          <p className="mt-1 text-[14px] text-muted">
            Вчерашний вечер пропущен, а заморозки на этой неделе закончились — серия начинается заново.
            Ваш рекорд никуда не делся.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-7 w-7 shrink-0" />
          {current > 0 ? (
            <div>
              <div className="label">Ваша серия</div>
              <div className="num text-xl font-bold leading-tight">{current} {plural(current, "вечер", "вечера", "вечеров")}</div>
            </div>
          ) : (
            <div>
              <div className="label">{best > 0 ? "Лучшая серия" : "Серия"}</div>
              <div className="num text-xl font-bold leading-tight">
                {best > 0 ? `${best} ${plural(best, "вечер", "вечера", "вечеров")}` : "начнётся сегодня"}
              </div>
            </div>
          )}
        </div>
        {current > 0 && best > current && (
          <div className="text-[13px] text-muted">рекорд — <span className="num text-ink">{best}</span></div>
        )}
        <Freezes {...freezes} />
        {cta && !doneToday && (
          <Link href="/today" className="btn-primary ml-auto whitespace-nowrap px-4 py-2 text-[14px]">
            {comeback ? "Начать новую серию" : "Отметить вечер"}
          </Link>
        )}
      </div>
    </section>
  );
}

/** «❄ заморозок на этой неделе: 1 из 1» и подсказка ⓘ. Использованные — серым. */
function Freezes({ total, used, left }: { total: number; used: number; left: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (total <= 0) return null;
  return (
    <div className="relative flex min-w-0 items-center gap-2 text-[13px]">
      <span className="flex shrink-0 gap-0.5 text-[16px] leading-none" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < left ? "text-sky-300" : "text-muted/40 grayscale"}>❄</span>
        ))}
      </span>
      <span className="text-muted">
        заморозок на этой неделе: <span className="num text-ink">{left}</span> из <span className="num">{total}</span>
        {used > 0 && <span className="sr-only">, использовано {used}</span>}
      </span>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
        aria-label="Как работает заморозка">ⓘ</button>
      {open && (
        <div id={id} role="note"
          className="absolute left-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-line bg-raised p-3 text-[13px] leading-relaxed text-ink shadow-xl">
          <p className="font-semibold">Как работает заморозка</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">
            <li>{total === 1 ? "Одна" : total} в неделю, с понедельника по воскресенье.</li>
            <li>Срабатывает сама: пропущенный вечер становится ❄, и серия не рвётся.</li>
            <li>Сегодняшний день не считается пропуском до конца дня — вечер ещё впереди.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** «Вчера сработала заморозка — серия цела» — один раз за этот день. */
function FreezeNotice({ show, day }: { show: boolean; day: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!show) return;
    let seen: string | null = null;
    try { seen = localStorage.getItem(NOTICE_KEY); } catch { /* без storage покажем один раз за вкладку */ }
    if (seen === day) return;
    setVisible(true);
    try { localStorage.setItem(NOTICE_KEY, day); } catch { /* ничего */ }
  }, [show, day]);
  if (!visible) return null;
  return (
    <div role="status" className="mb-3 flex items-start gap-3 rounded-xl border border-sky-300/30 bg-sky-400/10 px-3 py-2.5 text-[14px] text-sky-100">
      <span aria-hidden="true" className="text-[18px] leading-none">❄</span>
      <span className="flex-1">Вчера сработала заморозка — серия цела.</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Скрыть" className="-m-1 p-1 text-sky-200/70 hover:text-sky-100">✕</button>
    </div>
  );
}
