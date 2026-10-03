import type { MemberStats } from "@/lib/stats";
import { addDays, diffDays, monthName } from "@/lib/dates";
import { Avatar } from "./Avatar";

const style: Record<string, string> = {
  norm: "bg-teal text-night",
  minimum: "bg-teal/35 text-ink",
  frozen: "bg-sky-400/20 text-sky-200 ring-1 ring-sky-300/40",
  missed: "ring-1 ring-line",
  future: "ring-1 ring-dashed ring-teal/50",
  before: "ring-1 ring-line/50 opacity-40",
  after: "ring-1 ring-line/50 opacity-40",
};
const title: Record<string, string> = {
  norm: "норма", minimum: "минимум", frozen: "заморозка — серия цела", missed: "пропуск", future: "сегодня", before: "не участвовал", after: "",
};

export function MonthGrid({ stats, monthStart, today }: { stats: MemberStats[]; monthStart: string; today: string }) {
  const days: string[] = [];
  for (let d = monthStart; d.slice(0, 7) === monthStart.slice(0, 7); d = addDays(d, 1)) days.push(d);
  return (
    <section className="card h-full min-w-0 overflow-hidden p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-semibold">{monthName(today)}</h2>
        <span className="label">каждый кружок — вечер</span>
      </div>
      {/* Прокручивается только таблица внутри карточки; колонка с именами закреплена слева */}
      <div className="-mx-5 mt-4 overflow-x-auto overscroll-x-contain">
        <table className="border-collapse">
          <tbody>
            {stats.map((m) => (
              <tr key={m.user.id}>
                <th className="sticky left-0 z-10 bg-surface py-[3px] pl-5 pr-3 text-left text-[13px] font-medium shadow-[8px_0_8px_-6px_rgba(0,0,0,.6)]">
                  <span className="flex max-w-[7.5rem] items-center gap-2 lg:max-w-[12rem]" title={m.user.name}>
                    <Avatar name={m.user.name} url={m.user.avatarUrl} size={24} />
                    <span className="truncate">{m.user.name}</span>
                  </span>
                </th>
                {days.map((d, i) => {
                  // будущие дни и дни до появления участника — бледные, не пропуск
                  const s = diffDays(d, today) > 0 ? "after" : m.states.get(d) ?? "before";
                  return (
                    <td key={d} className={`p-[3px] ${i === days.length - 1 ? "pr-5" : ""}`}>
                      <span title={title[s] ? `${Number(d.slice(8))}: ${title[s]}` : String(Number(d.slice(8)))}
                        className={`grid h-6 w-6 lg:h-7 lg:w-7 place-items-center rounded-full text-[10px] font-bold ${style[s]}`}>
                        {s === "norm" ? "✓" : s === "frozen" ? "❄" : ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-teal" />норма</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-teal/35" />минимум</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-sky-400/30" />заморозка</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full ring-1 ring-line" />пропуск</span>
      </div>
    </section>
  );
}
