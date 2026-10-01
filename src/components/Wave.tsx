"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const fmt = (d: string) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;

export function Wave({ data }: { data: { day: string; pages: number }[] }) {
  return (
    <div className="-mx-2 h-36 lg:h-64" aria-label="Страниц в день за 30 дней">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="wave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2CE0C7" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#2CE0C7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tickFormatter={fmt} interval="preserveStartEnd" minTickGap={40} tick={{ fill: "#8A98AF", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ stroke: "#22304A" }}
            contentStyle={{ background: "#18233A", border: "1px solid #22304A", borderRadius: 12, color: "#E7EDF6" }}
            labelFormatter={(d) => fmt(String(d))}
            formatter={(v) => [`${v} стр.`, "Группа"]}
          />
          <Area type="monotone" dataKey="pages" stroke="#2CE0C7" strokeWidth={2.5} fill="url(#wave)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
