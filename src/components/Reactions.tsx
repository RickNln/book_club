"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toggleReaction } from "@/app/actions";
import type { EmojiInfo, ReactionSummary } from "@/lib/reactions";
import { Avatar } from "./Avatar";

const LONG_PRESS_MS = 450;

type PickerRequest = { target: string; anchor: DOMRect | null; onPick: (emojiId: number) => void };
type Ctx = {
  catalog: Map<number, EmojiInfo>;
  visible: EmojiInfo[];
  recent: number[];
  pushRecent: (id: number) => void;
  openPicker: (r: PickerRequest) => void;
};
const ReactionsCtx = createContext<Ctx | null>(null);
const useReactions = () => useContext(ReactionsCtx);

/** Набор смайликов, недавние и одно окно выбора на всю ленту. */
export function ReactionsProvider({ catalog, recent: initialRecent, children }: {
  catalog: EmojiInfo[]; recent: number[]; children: React.ReactNode;
}) {
  const [recent, setRecent] = useState(initialRecent);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const value = useMemo<Ctx>(() => ({
    catalog: new Map(catalog.map((e) => [e.id, e])),
    visible: catalog.filter((e) => !e.hidden),
    recent,
    pushRecent: (id) => setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 6)),
    openPicker: setPicker,
  }), [catalog, recent]);
  return (
    <ReactionsCtx.Provider value={value}>
      {children}
      {picker && <Picker req={picker} onClose={() => setPicker(null)} />}
    </ReactionsCtx.Provider>
  );
}

function EmojiImg({ id, size, className = "" }: { id: number; size: number; className?: string }) {
  const ctx = useReactions();
  const e = ctx?.catalog.get(id);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/emoji/${id}`} alt={e?.label ?? "смайлик"} width={size} height={size} draggable={false}
    style={{ width: size, height: size }} className={`shrink-0 select-none object-contain ${className}`} />;
}

/** Выбор смайлика: на телефоне — лист снизу, на компьютере — окно у кнопки. */
function Picker({ req, onClose }: { req: PickerRequest; onClose: () => void }) {
  const ctx = useReactions()!;
  const [desktop, setDesktop] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setDesktop(window.matchMedia("(min-width: 1024px)").matches);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  useEffect(() => { panel.current?.querySelector<HTMLButtonElement>("button[data-emoji]")?.focus(); }, [desktop]);

  const recent = ctx.recent.map((id) => ctx.catalog.get(id)).filter((e): e is EmojiInfo => !!e && !e.hidden);
  const pick = (id: number) => { req.onPick(id); onClose(); };
  const Cell = ({ e }: { e: EmojiInfo }) => (
    <button type="button" data-emoji={e.id} onClick={() => pick(e.id)} title={e.label}
      className="flex min-w-0 flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/60">
      <EmojiImg id={e.id} size={48} />
      <span className="w-full truncate text-center text-[11px] leading-tight text-muted">{e.label}</span>
    </button>
  );

  // компьютер: окно у кнопки, в пределах экрана
  const style: React.CSSProperties | undefined = desktop && req.anchor ? (() => {
    const w = 360, h = 380, m = 12;
    const left = Math.min(Math.max(m, req.anchor.left), window.innerWidth - w - m);
    const below = req.anchor.bottom + 8 + h < window.innerHeight;
    return { left, width: w, maxHeight: h, ...(below ? { top: req.anchor.bottom + 8 } : { bottom: window.innerHeight - req.anchor.top + 8 }) };
  })() : undefined;

  return (
    <div className="fixed inset-0 z-50" role="presentation" onClick={onClose}>
      {!desktop && <div className="absolute inset-0 bg-night/60 backdrop-blur-[2px]" />}
      <div ref={panel} role="dialog" aria-label="Выбрать смайлик" onClick={(e) => e.stopPropagation()} style={style}
        className={desktop
          ? "absolute flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-2xl"
          : "absolute inset-x-0 bottom-0 flex max-h-[70vh] flex-col rounded-t-[22px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl"}>
        {!desktop && <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />}
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <span className="font-semibold">Реакция</span>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">✕</button>
        </div>
        <div className="overflow-y-auto px-3 pb-3">
          {ctx.visible.length === 0 ? (
            <p className="p-3 text-[14px] text-muted">Смайликов клуба пока нет — их добавляет админ.</p>
          ) : (
            <>
              {recent.length > 0 && (
                <>
                  <div className="label px-1 pt-1">Недавние</div>
                  <div className="grid grid-cols-6 gap-1 [&>*]:min-w-0">{recent.map((e) => <Cell key={e.id} e={e} />)}</div>
                  <div className="label px-1 pt-3">Все смайлики клуба</div>
                </>
              )}
              <div className="grid grid-cols-5 gap-1 sm:grid-cols-6 [&>*]:min-w-0">{ctx.visible.map((e) => <Cell key={e.id} e={e} />)}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Долгое нажатие пальцем: onLong; обычный тап после него не срабатывает. */
export function useLongPress(onLong: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  return {
    fired,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType !== "touch") return;
        fired.current = false;
        clear();
        timer.current = setTimeout(() => { fired.current = true; onLong(); }, LONG_PRESS_MS);
      },
      onPointerUp: clear, onPointerCancel: clear, onPointerLeave: clear,
      onPointerMove: (e: React.PointerEvent) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) clear(); },
      onContextMenu: (e: React.MouseEvent) => { if (fired.current) e.preventDefault(); },
    },
  };
}

/** Своя реакция на месте, до ответа сервера: число меняется сразу. */
function optimistic(list: ReactionSummary[], emojiId: number): ReactionSummary[] {
  const cur = list.find((r) => r.emojiId === emojiId);
  if (cur?.mine) {
    return list
      .map((r) => (r.emojiId === emojiId ? { ...r, count: r.count - 1, mine: false, who: r.who.filter((w) => w.name !== "Вы") } : r))
      .filter((r) => r.count > 0);
  }
  if (cur) return list.map((r) => (r.emojiId === emojiId ? { ...r, count: r.count + 1, mine: true, who: [...r.who, { name: "Вы", avatarUrl: null }] } : r));
  return [...list, { emojiId, count: 1, mine: true, who: [{ name: "Вы", avatarUrl: null }] }];
}

/** Открыть выбор смайлика для записи — для долгого нажатия на мысль. */
export function useOpenReactionPicker(target: string, reactions: ReactionSummary[], onChange: (r: ReactionSummary[]) => void) {
  const ctx = useReactions();
  const toggle = useToggle(target, reactions, onChange);
  return useCallback((anchor: DOMRect | null) => ctx?.openPicker({ target, anchor, onPick: toggle }), [ctx, target, toggle]);
}

function useToggle(target: string, reactions: ReactionSummary[], onChange: (r: ReactionSummary[]) => void) {
  const ctx = useReactions();
  const latest = useRef(reactions);
  latest.current = reactions;
  return useCallback((emojiId: number) => {
    const before = latest.current;
    const willAdd = !before.find((r) => r.emojiId === emojiId)?.mine;
    onChange(optimistic(before, emojiId));
    if (willAdd) ctx?.pushRecent(emojiId);
    toggleReaction(target, emojiId)
      .then((r) => { if (r.reactions) onChange(r.reactions); else onChange(before); })
      .catch(() => onChange(before));
  }, [ctx, target, onChange]);
}

/** Ряд реакций под мыслью или комментарием: смайлик + число, свои — бирюзовой рамкой, «+☺» — выбор. */
export function ReactionBar({ target, reactions, onChange, compact = false }: {
  target: string; reactions: ReactionSummary[]; onChange: (r: ReactionSummary[]) => void; compact?: boolean;
}) {
  const ctx = useReactions();
  const toggle = useToggle(target, reactions, onChange);
  const addBtn = useRef<HTMLButtonElement>(null);
  if (!ctx) return null;
  const size = compact ? 20 : 24;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-1.5" : "mt-3"}`}>
      {reactions.map((r) => <Chip key={r.emojiId} r={r} size={size} onToggle={() => toggle(r.emojiId)} />)}
      {ctx.visible.length > 0 && (
        <button ref={addBtn} type="button" aria-label="Поставить реакцию"
          onClick={() => ctx.openPicker({ target, anchor: addBtn.current?.getBoundingClientRect() ?? null, onPick: toggle })}
          className={`flex items-center rounded-full border border-dashed border-line px-2 text-muted hover:border-teal/60 hover:text-teal ${compact ? "h-7 text-[12px]" : "h-8 text-[13px]"}`}>
          +☺
        </button>
      )}
    </div>
  );
}

function Chip({ r, size, onToggle }: { r: ReactionSummary; size: number; onToggle: () => void }) {
  const ctx = useReactions()!;
  const [who, setWho] = useState(false);
  const long = useLongPress(() => setWho(true));
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const label = ctx.catalog.get(r.emojiId)?.label ?? "смайлик";
  useEffect(() => {
    if (!who) return;
    const close = () => setWho(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [who]);
  return (
    <span className="relative"
      onMouseEnter={() => { hoverTimer.current = setTimeout(() => setWho(true), 350); }}
      onMouseLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setWho(false); }}>
      <button type="button" aria-pressed={r.mine}
        aria-label={`${label}: ${r.count}${r.mine ? ", ваша реакция" : ""}. ${r.who.map((w) => w.name).join(", ")}`}
        {...long.handlers}
        onClick={(e) => { if (long.fired.current) { e.preventDefault(); long.fired.current = false; return; } onToggle(); }}
        className={`flex select-none items-center gap-1 rounded-full border px-1.5 py-0.5 transition [-webkit-touch-callout:none]
          ${r.mine ? "border-teal bg-teal/10 text-ink" : "border-line bg-raised/60 text-muted hover:text-ink"}`}>
        <EmojiImg id={r.emojiId} size={size} />
        <span className="num min-w-[1ch] pr-0.5 text-[13px]">{r.count}</span>
      </button>
      {who && (
        <span role="tooltip" onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-full left-0 z-40 mb-2 w-max max-w-[16rem] rounded-xl border border-line bg-raised p-2.5 text-[13px] shadow-xl">
          <span className="mb-1.5 flex items-center gap-2 font-semibold"><EmojiImg id={r.emojiId} size={20} />{label}</span>
          <span className="block space-y-1">
            {r.who.map((w, i) => (
              <span key={i} className="flex items-center gap-2"><Avatar name={w.name} url={w.avatarUrl} size={20} /><span className="truncate">{w.name}</span></span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}
