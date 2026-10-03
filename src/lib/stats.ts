import type { Entry, Habit, Item, User } from "@/db/schema";
import { addDays, dayInTz, diffDays, weekStart } from "./dates";

export type DayState = "norm" | "minimum" | "frozen" | "missed" | "future" | "before";

/** Уровень дня у пользователя: норма побеждает минимум. */
function dayLevels(entries: Entry[]) {
  const m = new Map<string, "norm" | "minimum">();
  for (const e of entries) {
    if (m.get(e.day) !== "norm") m.set(e.day, e.level);
  }
  return m;
}

/**
 * Состояние каждого дня от старта до сегодня с учётом заморозок:
 * пропуск в неделе, где ещё есть заморозка, становится "frozen" и не рвёт серию.
 * Сегодняшний неотмеченный день не считается пропуском — вечер ещё впереди.
 */
export function dayStates(entries: Entry[], habit: Habit, from: string, today: string) {
  const levels = dayLevels(entries);
  const used = new Map<string, number>();
  const states = new Map<string, DayState>();
  for (let d = from; diffDays(d, today) <= 0; d = addDays(d, 1)) {
    const lvl = levels.get(d);
    if (lvl) { states.set(d, lvl); continue; }
    if (d === today) { states.set(d, "future"); continue; }
    const w = weekStart(d);
    const u = used.get(w) ?? 0;
    if (u < habit.freezesPerWeek) { used.set(w, u + 1); states.set(d, "frozen"); }
    else states.set(d, "missed");
  }
  return states;
}

export function streaks(states: Map<string, DayState>, today: string) {
  const days = [...states.keys()].sort();
  let best = 0, run = 0;
  for (const d of days) {
    const s = states.get(d)!;
    if (s === "norm" || s === "minimum") { run++; best = Math.max(best, run); }
    else if (s === "frozen" || s === "future") { /* не рвёт, но и не добавляет */ }
    else run = 0;
  }
  // текущая серия: идём назад от сегодня
  let current = 0;
  for (let d = today; states.has(d); d = addDays(d, -1)) {
    const s = states.get(d)!;
    if (s === "norm" || s === "minimum") current++;
    else if (s === "frozen" || s === "future") continue;
    else break;
  }
  return { current, best };
}

/**
 * Доля засчитанных дней в окне [from, to], не считая незакрытого сегодня.
 * null — в окне ещё нет ни одного дня участника (например, добавлен сегодня): это не 0%.
 */
export function consistency(states: Map<string, DayState>, from: string, to: string): number | null {
  let done = 0, total = 0;
  for (let d = from; diffDays(d, to) <= 0; d = addDays(d, 1)) {
    const s = states.get(d);
    if (!s || s === "before") continue;
    if (s === "future") continue;
    total++;
    if (s === "norm" || s === "minimum") done++;
  }
  // если сегодня уже отмечено, оно учтено выше
  return total ? Math.round((done / total) * 100) : null;
}

export function pagesByDay(entries: Entry[]) {
  const m = new Map<string, number>();
  for (const e of entries) {
    const p = Number(e.values?.pages ?? 0);
    m.set(e.day, (m.get(e.day) ?? 0) + (Number.isFinite(p) ? p : 0));
  }
  return m;
}

/**
 * С какого дня считаются дни участника: позже из старта привычки и появления аккаунта
 * (users.created_at в APP_TZ). Если участник отметил вечер раньше — например, вчерашний
 * в день регистрации, — отсчёт с этой отметки: прочитанный вечер не пропадает.
 */
export function memberStart(habit: Habit, createdAt: Date, entries: Entry[]) {
  const joined = maxDay(habit.startedOn, dayInTz(createdAt));
  const first = entries.reduce<string | null>((m, e) => (diffDays(e.day, habit.startedOn) >= 0 && (!m || e.day < m) ? e.day : m), null);
  return first && first < joined ? first : joined;
}

/** Заморозки этой недели: сколько положено и сколько уже потрачено (пн–вс). */
export function freezesThisWeek(states: Map<string, DayState>, habit: Habit, today: string) {
  let used = 0;
  for (let d = weekStart(today); diffDays(d, today) <= 0; d = addDays(d, 1)) if (states.get(d) === "frozen") used++;
  return { total: habit.freezesPerWeek, used, left: Math.max(0, habit.freezesPerWeek - used) };
}

export type MemberStats = {
  user: Pick<User, "id" | "name" | "avatarUrl">;
  /** первый день, который считается участнику; раньше — «не участвовал» */
  start: string;
  states: Map<string, DayState>;
  current: number;
  best: number;
  /** null — участник ещё не прожил ни одного засчитываемого дня в окне */
  consistency30: number | null;
  thisWeek: number | null;
  lastWeek: number | null;
  pagesTotal: number;
  booksFinished: number;
  activeBook: (Item & { pagesRead: number }) | null;
  freezes: { total: number; used: number; left: number };
  /** вчерашний пропуск закрыла заморозка */
  frozenYesterday: boolean;
  /** вчера пропуск без заморозки — серия прервалась */
  brokeYesterday: boolean;
};

export function memberStats(
  user: Pick<User, "id" | "name" | "avatarUrl" | "createdAt">, habit: Habit, entries: Entry[], books: Item[], today: string,
): MemberStats {
  const mine = entries.filter((e) => e.userId === user.id);
  // дни до появления участника — «не участвовал»: не пропуск, не заморозка, не в процентах
  const start = memberStart(habit, user.createdAt, mine);
  const states = diffDays(start, today) <= 0 ? dayStates(mine, habit, start, today) : new Map<string, DayState>();
  const { current, best } = streaks(states, today);
  const from30 = maxDay(start, addDays(today, -29));
  const wk = weekStart(today);
  const pages = pagesByDay(mine);
  const pagesTotal = [...pages.values()].reduce((a, b) => a + b, 0);
  const myBooks = books.filter((b) => b.userId === user.id);
  const active = myBooks.find((b) => b.status === "active") ?? null;
  const pagesRead = active
    ? mine.filter((e) => e.itemId === active.id).reduce((a, e) => a + Number(e.values?.pages ?? 0), 0)
    : 0;
  const yesterday = states.get(addDays(today, -1));
  return {
    user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl }, start, states, current, best,
    consistency30: consistency(states, from30, today),
    thisWeek: consistency(states, maxDay(start, wk), today),
    lastWeek: diffDays(wk, start) > 0
      ? consistency(states, maxDay(start, addDays(wk, -7)), addDays(wk, -1)) : null,
    pagesTotal,
    booksFinished: myBooks.filter((b) => b.status === "finished").length,
    activeBook: active ? { ...active, pagesRead } : null,
    freezes: freezesThisWeek(states, habit, today),
    frozenYesterday: yesterday === "frozen",
    brokeYesterday: yesterday === "missed",
  };
}

export function maxDay(a: string, b: string) { return diffDays(a, b) >= 0 ? a : b; }

/** Ряд "страниц в день" группы за N дней — для волны. */
export function groupPagesSeries(entries: Entry[], today: string, n = 30) {
  const pages = pagesByDay(entries);
  const out: { day: string; pages: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    out.push({ day: d, pages: pages.get(d) ?? 0 });
  }
  return out;
}
