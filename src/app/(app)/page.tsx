import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { groupDashboard } from "@/lib/data";
import { shortDate } from "@/lib/dates";
import { Wave } from "@/components/Wave";
import { Leaderboard } from "@/components/Leaderboard";
import { MonthGrid } from "@/components/MonthGrid";
import { BookProgress } from "@/components/BookProgress";
import { Flame } from "@/components/Flame";
import { Avatar } from "@/components/Avatar";

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many;
};

export default async function Dashboard() {
  const me = await requireUser();
  const d = await groupDashboard(me);
  const mine = d.stats.find((s) => s.user.id === me.id);
  const doneToday = mine?.states.get(d.today) === "norm" || mine?.states.get(d.today) === "minimum";

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
      <header className="flex items-center justify-between lg:col-span-12 lg:mb-2">
        <div>
          <div className="label">{shortDate(d.today)}</div>
          <h1 className="font-display text-xl font-bold lg:text-3xl">
            {doneToday ? "Вечер засчитан" : "Книжная ночь"}
          </h1>
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          {!doneToday && <Link href="/today" className="btn-primary px-4 py-2.5 text-[14px]">Отметить вечер</Link>}
          <Link href="/profile" aria-label="Профиль"><Avatar name={me.name} url={me.avatarUrl} size={40} /></Link>
        </div>
      </header>

      <section className="card overflow-hidden p-5 lg:col-span-8 lg:p-7">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <div className="label">Регулярность группы за 30 дней</div>
            <div className="num mt-1 text-[72px] font-extrabold leading-none text-ink [text-shadow:0_0_40px_rgba(44,224,199,.35)] lg:text-[104px]">
              {d.overall}<span className="text-teal">%</span>
            </div>
          </div>
          <div className="text-[14px] text-muted lg:pb-3 lg:text-right">
            <div><span className="num text-ink">{d.totalBooks}</span> {plural(d.totalBooks, "книга", "книги", "книг")} дочитано</div>
            <div><span className="num text-ink">{d.totalPages.toLocaleString("ru-RU")}</span> стр. вместе</div>
          </div>
        </div>
        <div className="mt-4"><Wave data={d.series} /></div>
      </section>

      <div className="grid grid-cols-3 gap-3 lg:col-span-4 lg:grid-cols-1 lg:gap-5">
        <div className="card p-4 lg:flex lg:flex-col lg:justify-center lg:p-6">
          <div className="label">Эта неделя</div>
          <div className="num mt-1 text-2xl font-bold lg:text-4xl">{d.thisWeek}%</div>
        </div>
        <div className="card p-4 lg:flex lg:flex-col lg:justify-center lg:p-6">
          <div className="label">К прошлой<span className="hidden lg:inline"> неделе</span></div>
          <div className={`num mt-1 text-2xl font-bold lg:text-4xl ${d.deltaWeek >= 0 ? "text-teal" : "text-lamp"}`}>
            {d.deltaWeek > 0 ? "+" : ""}{d.deltaWeek}%
          </div>
        </div>
        <div className="card p-4 lg:flex lg:flex-col lg:justify-center lg:p-6">
          <div className="label">Серия<span className="hidden lg:inline"> лучшего</span></div>
          <div className="num mt-1 flex items-center gap-1 text-2xl font-bold lg:text-4xl">
            <Flame className="h-6 w-6 lg:h-9 lg:w-9" />{d.bestStreak}
          </div>
        </div>
      </div>

      <div className="lg:col-span-5"><Leaderboard stats={d.stats} meId={me.id} /></div>

      <section className="card p-5 lg:col-span-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">На тумбочке</h2>
          <Link href="/shelf" className="text-[13px] text-teal">Вся полка</Link>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:gap-5">
          {d.stats.filter((s) => s.activeBook).map((s) => (
            <BookProgress key={s.user.id} book={s.activeBook!} who={s.user.id === me.id ? "Вы" : s.user.name} whoAvatar={<Avatar name={s.user.name} url={s.user.avatarUrl} size={20} />} />
          ))}
          {!d.stats.some((s) => s.activeBook) && (
            <p className="text-muted">Пока никто не начал книгу. <Link href="/today" className="text-teal">Добавить свою</Link></p>
          )}
        </div>
      </section>

      <div className="lg:col-span-12"><MonthGrid stats={d.stats} monthStart={d.monthStart} today={d.today} /></div>
    </div>
  );
}
