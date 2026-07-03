import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AgeingBucket, BUCKET_COLORS, fmtSEK } from "./ageingUtils";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface Props {
  buckets: AgeingBucket[];
  highestRiskIdx: number;
  total: number;
}

export const AgeingChart = ({ buckets, highestRiskIdx, total }: Props) => {
  if (total <= 0) return null;

  const data = buckets.map((b, i) => ({
    name: b.label,
    value: b.total,
    pct: total > 0 ? (b.total / total) * 100 : 0,
    idx: i,
  }));

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
        Visuell fördelning
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ left: 0, right: 12, top: 8, bottom: 8 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(15,23,42,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            content={(props) => (
              <ChartTooltip
                {...props}
                formatter={(value: number) => `${fmtSEK(value)} kr`}
              />
            )}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.idx}
                fill={BUCKET_COLORS[entry.idx]}
                fillOpacity={highestRiskIdx === entry.idx ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
