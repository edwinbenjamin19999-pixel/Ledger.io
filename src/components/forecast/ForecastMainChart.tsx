/**
 * ForecastMainChart — composed Recharts:
 *  • Actual EBIT (solid)
 *  • Forecast EBIT (cyan dashed)
 *  • Budget EBIT (slate dotted)
 *  • Scenario EBIT (amber thin)
 *  • Confidence band (P10–P90 area, cyan gradient)
 *  • ReferenceDot per turning point
 *  • Click on data point → onPointClick(monthIdx)
 */
import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartGradients, GRID_PROPS, AXIS_TICK } from "@/components/charts/ChartGradients";
import type { TurningPoint } from "@/lib/forecast/turningPointEngine";

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

interface Props {
  actualEbit: number[];        // 12-vec, may have undefined past latestActual
  forecastEbit: number[];      // 12-vec
  budgetEbit?: number[] | null;
  scenarioEbit?: number[] | null;
  p10Ebit?: number[] | null;
  p90Ebit?: number[] | null;
  latestActualMonth: number;   // 0..11 or -1
  turningPoints: TurningPoint[];
  onPointClick?: (monthIdx: number) => void;
}

interface Row {
  month: string;
  monthIdx: number;
  actual: number | null;
  forecast: number | null;
  budget: number | null;
  scenario: number | null;
  bandLow: number | null;
  bandHigh: number | null;
}

function fmt(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mkr`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} kkr`;
  return n.toLocaleString("sv-SE");
}

// Custom dotted forecast band area requires two stacked areas; we use one area with [low, high].
export function ForecastMainChart({
  actualEbit,
  forecastEbit,
  budgetEbit,
  scenarioEbit,
  p10Ebit,
  p90Ebit,
  latestActualMonth,
  turningPoints,
  onPointClick,
}: Props) {
  const data: Row[] = useMemo(() => {
    return MONTHS.map((label, m) => {
      const isPast = m <= latestActualMonth;
      const low = p10Ebit?.[m];
      const high = p90Ebit?.[m];
      return {
        month: label,
        monthIdx: m,
        actual: isPast ? actualEbit[m] ?? 0 : null,
        forecast: !isPast ? forecastEbit[m] ?? 0 : null,
        budget: budgetEbit?.[m] ?? null,
        scenario: scenarioEbit?.[m] ?? null,
        bandLow: !isPast && typeof low === "number" ? low : null,
        bandHigh: !isPast && typeof high === "number" ? high : null,
      };
    });
  }, [actualEbit, forecastEbit, budgetEbit, scenarioEbit, p10Ebit, p90Ebit, latestActualMonth]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">EBIT-prognos</div>
          <div className="text-sm text-slate-600">
            Utfall · Prognos · Budget · Scenario · Konfidensband
          </div>
        </div>
        <div className="hidden items-center gap-3 text-[11px] text-slate-500 sm:flex">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-slate-700" /> Utfall</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: "#3b82f6" }} /> Prognos</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-slate-400" /> Budget</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-amber-500" /> Scenario</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
            onClick={(e) => {
              if (e && typeof (e as { activeTooltipIndex?: number }).activeTooltipIndex === "number") {
                onPointClick?.((e as { activeTooltipIndex: number }).activeTooltipIndex);
              }
            }}
          >
            <ChartGradients />
            <defs>
              <linearGradient id="confidenceBandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} tickFormatter={(v) => fmt(Number(v))} />
            <Tooltip
              cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: "white",
                boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                fontSize: 12,
              }}
              formatter={(value: unknown, name: string) => [fmt(typeof value === "number" ? value : null), name]}
            />

            {/* Confidence band — high then low so area fills between */}
            <Area
              type="monotone"
              dataKey="bandHigh"
              stroke="none"
              fill="url(#confidenceBandFill)"
              isAnimationActive={false}
              connectNulls
              name="P90"
            />
            <Area
              type="monotone"
              dataKey="bandLow"
              stroke="none"
              fill="white"
              fillOpacity={1}
              isAnimationActive={false}
              connectNulls
              name="P10"
            />

            <Line
              type="monotone"
              dataKey="budget"
              name="Budget"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="2 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="scenario"
              name="Scenario"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Utfall"
              stroke="#0f172a"
              strokeWidth={2}
              dot={{ r: 3, fill: "#0f172a" }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Prognos"
              stroke="#3b82f6"
              strokeWidth={2.25}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: "#3b82f6" }}
              isAnimationActive
              animationDuration={800}
              connectNulls={false}
            />

            {turningPoints.map((tp, i) => {
              const colorMap = {
                ebit_negative: "#f59e0b",
                cash_negative: "#e11d48",
                target_miss: "#e11d48",
              } as const;
              const fill = colorMap[tp.type];
              return (
                <ReferenceDot
                  key={`${tp.type}-${i}`}
                  x={MONTHS[tp.monthIdx]}
                  y={tp.type === "ebit_negative" ? 0 : Math.max(0, tp.value)}
                  r={6}
                  fill={fill}
                  stroke="white"
                  strokeWidth={2}
                  isFront
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
