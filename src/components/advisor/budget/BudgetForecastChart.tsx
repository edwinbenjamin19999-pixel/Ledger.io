import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { MonthPoint } from "@/hooks/useFirmBudgetForecast";

interface Props {
  data: MonthPoint[];
  onPointClick?: (p: MonthPoint) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export const BudgetForecastChart = ({ data, onPointClick }: Props) => {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
          onClick={(e: any) => {
            const idx = e?.activeTooltipIndex;
            if (typeof idx === "number" && data[idx]) onPointClick?.(data[idx]);
          }}
        >
          <defs>
            <linearGradient id="budgetFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--brand-primary))" stopOpacity={0.18} />
              <stop offset="100%" stopColor="hsl(var(--brand-primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(168 85 247)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="rgb(168 85 247)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            }}
            formatter={(v: number) => fmtFull(v)}
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="budget"
            name="Budget"
            stroke="hsl(var(--brand-primary))"
            strokeWidth={2}
            fill="url(#budgetFill)"
          />
          <Area
            type="monotone"
            dataKey="forecast"
            name="Prognos"
            stroke="rgb(168 85 247)"
            strokeWidth={2}
            strokeDasharray="6 4"
            fill="url(#forecastFill)"
          />
          <Bar
            dataKey="actual"
            name="Utfall"
            fill="rgb(16 185 129)"
            radius={[6, 6, 0, 0]}
            barSize={14}
            cursor="pointer"
          />
          <Line
            type="monotone"
            dataKey="variance"
            name="Avvikelse"
            stroke="rgb(244 63 94)"
            strokeWidth={1.5}
            dot={false}
            opacity={0.6}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
