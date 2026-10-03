export const TZ = process.env.APP_TZ || "Europe/Moscow";

/** Дата 'YYYY-MM-DD' в часовом поясе приложения. */
export function dayInTz(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function hourInTz(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d)) % 24;
}
export function addDays(day: string, n: number): string {
  const t = Date.parse(day + "T00:00:00Z") + n * 864e5;
  return new Date(t).toISOString().slice(0, 10);
}
export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 864e5);
}
/** Понедельник недели, к которой относится день. */
export function weekStart(day: string): string {
  const wd = new Date(day + "T00:00:00Z").getUTCDay(); // 0 = вс
  return addDays(day, -((wd + 6) % 7));
}
export function today() { return dayInTz(); }
/** Вчерашний день можно отметить до 12:00. */
export function canBackfillYesterday() { return hourInTz() < 12; }

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
export function shortDate(day: string) {
  return `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
}
const MONTHS_FULL = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export function monthName(day: string) { return MONTHS_FULL[Number(day.slice(5, 7)) - 1]; }

/** «сегодня, 21:40» или «3 окт, 21:40» — время в часовом поясе приложения. */
export function timeLabel(d: Date): string {
  const day = dayInTz(d);
  const hm = new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  return `${day === dayInTz() ? "сегодня" : shortDate(day)}, ${hm}`;
}
