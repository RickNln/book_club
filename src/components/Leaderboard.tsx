import type { MemberStats } from "@/lib/stats";
import { Flame } from "./Flame";
import { Avatar } from "./Avatar";

const medal = ["#FFD36E", "#C9D3E0", "#E0A26E"];

export function Leaderboard({ stats, meId }: { stats: MemberStats[]; meId: number }) {
  return (
    <section className="card h-full p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-semibold">Кто держит ритм</h2>
        <span className="label">регулярность, 30 дней</span>
      </div>
      <ol className="mt-4 space-y-4">
        {stats.map((m, i) => (
          <li key={m.user.id} className="flex items-center gap-3">
            <span className="relative shrink-0">
              <Avatar name={m.user.name} url={m.user.avatarUrl} size={40} />
              <span className="num absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ring-2 ring-surface"
                style={{ background: medal[i] ?? "#22304A", color: medal[i] ? "#0B1220" : "#8A98AF" }}>
                {i + 1}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`truncate ${m.user.id === meId ? "font-semibold" : ""}`}>
                  {m.user.name}{m.user.id === meId ? " (вы)" : ""}
                </span>
                <span className="num shrink-0 text-[15px]" title={m.consistency30 === null ? "Первый вечер ещё впереди" : undefined}>
                  {m.consistency30 === null ? "—" : `${m.consistency30}%`}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-raised">
                <div className="h-2 rounded-full bg-teal shadow-[0_0_12px_rgba(44,224,199,.5)]" style={{ width: `${Math.max(m.consistency30 ?? 0, 2)}%` }} />
              </div>
            </div>
            <span className="flex w-12 shrink-0 items-center justify-end gap-0.5 num text-[14px]" title="Текущая серия">
              <Flame className="h-4 w-4" />{m.current}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
