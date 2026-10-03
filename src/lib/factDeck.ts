import { facts, MISSED_DAY_FACT_ID, toShown, type ShownFact } from "@/content/facts";

/** Хранилище колоды: localStorage в браузере, Map в тестах и при недоступном storage. */
export type KV = { get(key: string): string | null; set(key: string, value: string): void };

const K = {
  deck: "kn.facts.deck", // перемешанная очередь id обычных фактов
  last: "kn.facts.last", // последний показанный обычный факт — чтобы не повторить его на стыке колод
  shown: "kn.facts.shown", // счётчик показов: каждый 4-й — персональный
  personal: "kn.facts.personal", // какой персональный факт был последним
  missDay: "kn.facts.missDay", // день, когда уже показали факт про пропуск
};

function shuffle(ids: number[], random: () => number) {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function readDeck(kv: KV): number[] {
  try {
    const ids = JSON.parse(kv.get(K.deck) ?? "[]");
    const known = new Set(facts.map((f) => f.id));
    return Array.isArray(ids) ? ids.filter((x) => known.has(x)) : [];
  } catch {
    return [];
  }
}

/** Следующий обычный факт: без повторов, пока не показаны все, потом новая перетасовка. */
function drawRegular(kv: KV, random: () => number): ShownFact {
  let deck = readDeck(kv);
  if (!deck.length) {
    deck = shuffle(facts.map((f) => f.id), random);
    const last = Number(kv.get(K.last));
    if (deck.length > 1 && deck[0] === last) [deck[0], deck[1]] = [deck[1], deck[0]];
  }
  const [id, ...rest] = deck;
  kv.set(K.deck, JSON.stringify(rest));
  kv.set(K.last, String(id));
  return toShown(facts.find((f) => f.id === id)!);
}

export type DrawOptions = {
  /** применимые персональные факты (пусто — данных не хватает) */
  personal: ShownFact[];
  /** вчера был пропуск — сначала факт про то, что один пропуск не страшен */
  missedYesterday: boolean;
  /** сегодняшний день 'YYYY-MM-DD', чтобы факт про пропуск показался один раз за день */
  today: string;
  random?: () => number;
};

export function drawFact(kv: KV, { personal, missedYesterday, today, random = Math.random }: DrawOptions): ShownFact {
  if (missedYesterday && kv.get(K.missDay) !== today) {
    kv.set(K.missDay, today);
    return toShown(facts.find((f) => f.id === MISSED_DAY_FACT_ID)!);
  }
  const shown = (Number(kv.get(K.shown)) || 0) + 1;
  kv.set(K.shown, String(shown));
  if (shown % 4 === 0 && personal.length) {
    const prev = personal.findIndex((p) => p.id === kv.get(K.personal));
    const next = personal[(prev + 1) % personal.length];
    kv.set(K.personal, next.id);
    return next;
  }
  return drawRegular(kv, random);
}

const memory = new Map<string, string>();
/** localStorage, а если он недоступен (приватный режим, запрет) — память вкладки. */
export const browserKV: KV = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch { memory.set(key, value); }
  },
};
