import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/hooks/useChartTheme";
import type { ForecastPoint, ConfidenceBandPoint } from "./useProformaInsights";

interface Props {
  data: ForecastPoint[];
  confidenceBand: ConfidenceBandPoint[];
  riskMonths: Set<string>;
  avgConfidence: number;
}

const formatK = (value: number) => `${(value / 1000).toFixed(0)}k`;
const formatFull = (value: number) => `${value.toLocaleString("sv-SE")} kr`;

export const ProformaForecastChart = ({ data, confidenceBand, riskMonths, avgConfidence }: Props) => {
  const chartTheme = useChartTheme();

  // Merge confidence band into chart data
  const merged = data.map((d, i) => ({
    ...d,
    confLow: confidenceBand[i]?.confLow ?? d.predicted_result,
    confHigh: confidenceBand[i]?.confHigh ?? d.predicted_result,
  }));

  const confidenceBadgeTone =
    avgConfidence >= 0.7
      ? "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5]"
      : avgConfidence >= 0.5
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]";

  return (
    <div className="relative rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Resultatprognos per månad
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            AI-baserad prognos med konfidensband och riskmånader
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold border ${confidenceBadgeTone}`}
          title="AI-modellens genomsnittliga träffsäkerhet"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          {(avgConfidence * 100).toFixed(0)}% säkerhet
        </span>
      </div>

      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={merged} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--brand-primary, 188 91% 37%))" stopOpacity={0.18} />
                <stop offset="100%" stopColor="hsl(var(--brand-primary, 188 91% 37%))" stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "confLow" || name === "confHigh") return null as any;
                return [formatFull(value), name];
              }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
              formatter={(v) => (v === "confLow" || v === "confHigh" ? "" : v)}
            />

            {/* Risk-month overlays */}
            {Array.from(riskMonths).map((period) => (
              <ReferenceArea
                key={period}
                x1={period}
                x2={period}
                fill="rgba(244,63,94,0.08)"
                stroke="rgba(244,63,94,0.35)"
                strokeDasharray="3 3"
                ifOverflow="extendDomain"
              />
            ))}

            {/* Confidence band */}
            <Area
              type="monotone"
              dataKey="confHigh"
              stroke="none"
              fill="url(#confidenceFill)"
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="confLow"
              stroke="none"
              fill="hsl(var(--background))"
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />

            <Bar dataKey="predicted_income" fill="hsl(var(--brand-primary, 188 91% 37%))" name="Intäkter" opacity={0.85} radius={[4, 4, 0, 0]} />
            <Bar dataKey="predicted_expenses" fill="rgb(100 116 139)" name="Kostnader" opacity={0.75} radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="predicted_result"
              stroke="hsl(var(--brand-primary, 188 91% 37%))"
              name="Resultat"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: "white" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {riskMonths.size > 0 && (
        <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-[#FCE8E8] border border-rose-300" />
          Markerade månader = marginal under 10% eller negativt resultat
        </p>
      )}
    </div>
  );
};
