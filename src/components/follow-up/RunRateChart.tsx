import { useMemo } from "react";
import { ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatSEKCompact } from "@/lib/formatNumber";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

interface Props {
  actual: number[];
  forecast: number[];
  target: number[];
  latestActualMonth: number;
  onPointClick?: (monthIdx: number) => void;
  metric?: string;
}

export function RunRateChart({ actual, forecast, target, latestActualMonth, onPointClick, metric = "EBIT" }: Props) {
  const data = useMemo(() => {
    let cumActual = 0;
    let cumForecast = 0;
    let cumTarget = 0;
    return MONTH_LABELS.map((label, i) => {
      cumActual += actual[i] || 0;
      cumForecast += forecast[i] || 0;
      cumTarget += target[i] || 0;
      return {
        month: label,
        actual: i <= latestActualMonth ? cumActual : null,
        forecast: i >= latestActualMonth ? cumForecast : null,
        target: cumTarget,
      };
    });
  }, [actual, forecast, target, latestActualMonth]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Run-rate vs prognos vs mål</h3>
        <span className="text-xs text-slate-500">{metric}, kumulativt</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            onClick={(e: any) => {
              if (e?.activeLabel != null) {
                const idx = MONTH_LABELS.indexOf(e.activeLabel);
                if (idx >= 0) onPointClick?.(idx);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 90%)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} tickFormatter={(v) => formatSEKCompact(v)} />
            <RTooltip
              contentStyle={{ background: "white", border: "1px solid hsl(215 20% 90%)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => (v == null ? "—" : `${formatSEKCompact(v)} kr`)}
            />
            <ReferenceLine x={MONTH_LABELS[Math.max(0, latestActualMonth)]} stroke="hsl(215 16% 47%)" strokeDasharray="2 4" />
            <Line type="monotone" dataKey="actual" name="Utfall" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="forecast" name="Prognos" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2 }} />
            <Line type="monotone" dataKey="target" name="Mål" stroke="hsl(215 20% 65%)" strokeWidth={1.5} strokeDasharray="2 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#3b82f6]" /> Utfall</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#3b82f6] [border-top:1px_dashed]" /> Prognos</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-slate-400 [border-top:1px_dotted]" /> Mål</span>
      </div>
    </div>
  );
}
