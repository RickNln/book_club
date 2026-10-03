import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { factContext, groupDashboard, streakInfo } from "@/lib/data";
import { shortDate } from "@/lib/dates";
import { Wave } from "@/components/Wave";
import { Leaderboard } from "@/components/Leaderboard";
import { MonthGrid } from "@/components/MonthGrid";
import { ReadingNowCard } from "@/components/BookProgress";
import { Flame } from "@/components/Flame";
import { Avatar } from "@/components/Avatar";
import { FactCard } from "@/components/FactCard";
import { StreakPanel } from "@/components/Streak";

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many;
};

export default async function Dashboard() {
  const me = await requireUser();
  const d = await groupDashboard(me);
  const mine = d.stats.find((s) => s.user.id === me.id);
  const doneToday = mine?.states.get(d.today) === "norm" || mine?.states.get(d.today) === "minimum";
  const fc = factContext(d, me);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 [&>*]:min-w-0">
      <header className="flex items-center justify-between gap-3 lg:col-span-12 lg:mb-2">
        <div className="min-w-0">
          <div className="label">{shortDate(d.today)}</div>
          <h1 className="truncate font-display text-xl font-bold lg:text-3xl">
            {doneToday ? "Вечер засчитан" : "Книга на ночь"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3 lg:hidden">
          <Link href="/profile" aria-label="Профиль"><Avatar name={me.name} url={me.avatarUrl} size={40} /></Link>
        </div>
      </header>

      <StreakPanel info={streakInfo(d, me)} cta className="lg:col-span-12" />

      <section className="card overflow-hidden p-5 lg:col-span-8 lg:p-7">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <div className="label">Регулярность группы за 30 дней</div>
            <div className="num mt-1 text-[clamp(56px,14vw,104px)] font-extrabold leading-none text-ink [text-shadow:0_0_40px_rgba(44,224,199,.35)]">
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

      <FactCard ctx={fc.ctx} missedYesterday={fc.missedYesterday} today={d.today} className="lg:col-span-8" />

      <div className="grid grid-cols-3 gap-3 max-[399px]:gap-2 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-3 lg:grid-cols-1 lg:gap-5 [&>*]:min-w-0">
        <div className="card px-3 py-4 max-[399px]:px-2.5 max-[399px]:py-3 lg:flex lg:flex-col lg:justify-center lg:p-6">
          <div className="label truncate max-[399px]:text-[12px]">Эта неделя</div>
          <div className="num mt-1 whitespace-nowrap text-[clamp(18px,5vw,24px)] font-bold lg:text-4xl">{d.thisWeek}%</div>
        </div>
        <div className="card px-3 py-4 max-[399px]:px-2.5 max-[399px]:py-3 lg:flex lg:flex-col lg:justify-center lg:p-6">
          <div className="label truncate max-[399px]:text-[12px]">К прошлой<span className="hidden lg:inline"> неделе</span></div>
          <div className={`num mt-1 whitespace-nowrap text-[clamp(18px,5vw,24px)] font-bold lg:text-4xl ${d.deltaWeek >= 0 ? "text-teal" : "text-lamp"}`}>
            {d.deltaWeek > 0 ? "+" : ""}{d.deltaWeek}%
          </div>
        </div>
        <div className="card px-3 py-4 max-[399px]:px-2.5 max-[399px]:py-3 lg:flex lg:flex-col lg:justify-center lg:p-6">
          <div className="label truncate max-[399px]:text-[12px]">Серия<span className="hidden lg:inline"> лучшего</span></div>
          <div className="num mt-1 flex items-center gap-1 whitespace-nowrap text-[clamp(18px,5vw,24px)] font-bold lg:text-4xl">
            <Flame className="h-6 w-6 shrink-0 max-[399px]:h-5 max-[399px]:w-5 lg:h-9 lg:w-9" />{d.bestStreak}
          </div>
        </div>
      </div>

      <div className="lg:col-span-5"><Leaderboard stats={d.stats} meId={me.id} /></div>

      {/* на компьютере — во всю ширину внизу: две колонки с крупными обложками */}
      <section className="card p-5 lg:order-last lg:col-span-12 lg:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-semibold">Читают сейчас</h2>
          <Link href="/shelf" className="text-[13px] text-teal">Вся полка</Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-6 [&>*]:min-w-0">
          {d.stats.filter((s) => s.activeBook).map((s) => (
            <ReadingNowCard key={s.user.id} book={s.activeBook!} who={s.user.id === me.id ? "Вы" : s.user.name}
              avatar={<Avatar name={s.user.name} url={s.user.avatarUrl} size={22} />} />
          ))}
          {!d.stats.some((s) => s.activeBook) && (
            <p className="text-muted">Пока никто не начал книгу. <Link href="/today" className="text-teal">Добавить свою</Link></p>
          )}
        </div>
      </section>

      <div className="lg:col-span-7"><MonthGrid stats={d.stats} monthStart={d.monthStart} today={d.today} /></div>
    </div>
  );
}
