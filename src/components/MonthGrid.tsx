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
};
const title: Record<string, string> = {
  norm: "норма", minimum: "минимум", frozen: "заморозка", missed: "пропуск", future: "сегодня", before: "",
};

export function MonthGrid({ stats, monthStart, today }: { stats: MemberStats[]; monthStart: string; today: string }) {
  const days: string[] = [];
  for (let d = monthStart; d.slice(0, 7) === monthStart.slice(0, 7); d = addDays(d, 1)) days.push(d);
  return (
    <section className="card h-full p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{monthName(today)}</h2>
        <span className="label">каждый кружок — вечер</span>
      </div>
      <div className="mt-4 overflow-x-auto -mx-5 px-5">
        <table className="border-separate border-spacing-[5px]">
          <tbody>
            {stats.map((m) => (
              <tr key={m.user.id}>
                <th className="sticky left-0 z-10 bg-surface pr-2 text-left text-[13px] font-medium whitespace-nowrap">
                  <span className="flex items-center gap-2"><Avatar name={m.user.name} url={m.user.avatarUrl} size={24} />{m.user.name}</span>
                </th>
                {days.map((d) => {
                  const after = diffDays(d, today) > 0;
                  const s = after ? "before" : m.states.get(d) ?? "before";
                  return (
                    <td key={d}>
                      <span title={`${Number(d.slice(8))}: ${title[s]}`}
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
