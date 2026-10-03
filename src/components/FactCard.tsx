"use client";
import { useEffect, useRef, useState } from "react";
import { evidenceHint, personalFacts, type PersonalContext, type ShownFact } from "@/content/facts";
import { browserKV, drawFact } from "@/lib/factDeck";

const badge: Record<string, string> = {
  "эксперимент": "bg-teal/15 text-teal ring-teal/30",
  "метаанализ": "bg-teal/15 text-teal ring-teal/30",
  "исследование": "bg-sky-400/10 text-sky-200 ring-sky-300/30",
  "наблюдение": "bg-lamp/10 text-lamp ring-lamp/30",
  "расчёт": "bg-raised text-muted ring-line",
};

/**
 * «Факт вечера»: новый факт при каждом показе, колода хранится в localStorage.
 * До монтирования рисуем пустую карточку той же высоты — на сервере колоды нет.
 */
export function FactCard({ ctx, missedYesterday, today, className = "" }: {
  ctx: PersonalContext; missedYesterday: boolean; today: string; className?: string;
}) {
  const [fact, setFact] = useState<ShownFact | null>(null);
  const drawn = useRef(false);
  const next = () => setFact(drawFact(browserKV, { personal: personalFacts(ctx), missedYesterday, today }));

  useEffect(() => {
    // StrictMode вызывает эффект дважды — берём из колоды один факт на показ
    if (drawn.current) return;
    drawn.current = true;
    next();
  }, []);

  return (
    <section className={`card relative min-w-0 overflow-hidden p-5 lg:p-6 ${className}`} aria-labelledby="fact-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="fact-heading" className="label uppercase tracking-[0.12em]">Факт вечера</h2>
        <button type="button" onClick={next} disabled={!fact}
          className="shrink-0 rounded-lg px-2 py-1 text-[13px] text-teal transition hover:bg-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50">
          Ещё факт <span aria-hidden="true">↻</span>
        </button>
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-3 min-h-[148px]">
        {fact && (
          <article key={fact.id} data-fact-id={fact.id} className="motion-safe:animate-[fact-in_.35s_ease-out]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{fact.category}</div>
            <p className="num mt-1 text-[clamp(28px,8vw,40px)] font-extrabold leading-[1.05] text-teal [overflow-wrap:anywhere]">
              {fact.title}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/90">{fact.text}</p>
            <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-muted">
              <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${badge[fact.evidence]}`} title={evidenceHint[fact.evidence]}>
                {fact.evidence}
                {fact.evidence === "наблюдение" && <span className="font-normal"> · связь, не причина</span>}
              </span>
              {fact.url
                ? <a href={fact.url} target="_blank" rel="noopener noreferrer" className="min-w-0 underline decoration-line underline-offset-2 [overflow-wrap:anywhere] hover:text-ink">{fact.source}</a>
                : <span className="min-w-0 [overflow-wrap:anywhere]">{fact.source}</span>}
            </footer>
          </article>
        )}
      </div>
    </section>
  );
}
