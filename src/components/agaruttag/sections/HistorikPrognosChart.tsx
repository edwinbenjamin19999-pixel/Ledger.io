import { Card, CardContent } from "@/components/ui/card";
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatSEK } from "@/lib/formatNumber";
import { useMemo, useState } from "react";
import type { AgaruttagKPIData } from "../hooks/useAgaruttagKPI";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Props {
  forestagenLonManad: number;
  lagbeskattadUtdelning: number;
  kpi: AgaruttagKPIData;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

type ViewMode = "month" | "quarter" | "year";

function CustomTooltip({ active, payload, label }: any) {
  const chartTheme = useChartTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={chartTheme.tooltipStyle} className="rounded-xl p-3 shadow-lg backdrop-blur-sm min-w-[180px]">
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: chartTheme.tooltipLabelColor }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-[11px]" style={{ color: chartTheme.tooltipLabelColor }}>{entry.name}</span>
          <span className="text-[11px] font-bold ml-auto tabular-nums" style={{ color: chartTheme.tooltipText }}>{formatSEK(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function HistorikPrognosChart({ forestagenLonManad, lagbeskattadUtdelning, kpi }: Props) {
  const chartTheme = useChartTheme();
  const [view, setView] = useState<ViewMode>("month");

  const monthlyData = useMemo(() => {
    let ackEK = kpi.egetKapital || 250000;
    return MONTHS.map((m, i) => {
      const lon = forestagenLonManad;
      const utdelning = i === 5 ? lagbeskattadUtdelning : 0;
      ackEK = ackEK + (forestagenLonManad * 0.3) - utdelning;
      return { month: m, Lön: lon, Utdelning: utdelning, EgetKapital: Math.round(ackEK) };
    });
  }, [forestagenLonManad, lagbeskattadUtdelning, kpi.egetKapital]);

  const data = useMemo(() => {
    if (view === "month") return monthlyData;
    if (view === "quarter") {
      return QUARTERS.map((q, qi) => {
        const slice = monthlyData.slice(qi * 3, qi * 3 + 3);
        return {
          month: q,
          Lön: slice.reduce((s, d) => s + d.Lön, 0),
          Utdelning: slice.reduce((s, d) => s + d.Utdelning, 0),
          EgetKapital: slice[slice.length - 1]?.EgetKapital || 0,
        };
      });
    }
    return [{
      month: "2026",
      Lön: monthlyData.reduce((s, d) => s + d.Lön, 0),
      Utdelning: monthlyData.reduce((s, d) => s + d.Utdelning, 0),
      EgetKapital: monthlyData[monthlyData.length - 1]?.EgetKapital || 0,
    }];
  }, [view, monthlyData]);

  const totalUttag = forestagenLonManad * 12 + lagbeskattadUtdelning;
  const optSkatt = Math.round(forestagenLonManad * 12 * 0.50 + lagbeskattadUtdelning * 0.20);
  const altLonSkatt = Math.round(totalUttag * 0.52);
  const effektivitet = altLonSkatt > 0 ? Math.round(((altLonSkatt - optSkatt) / altLonSkatt) * 100) : 0;

  const viewButtons: { mode: ViewMode; label: string }[] = [
    { mode: "month", label: "Månadsvis" },
    { mode: "quarter", label: "Kvartal" },
    { mode: "year", label: "Helår" },
  ];

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold tracking-tight text-[#0F1F3D]">
        Kapitalutveckling & Uttagsprognos
      </h2>
      <p className="text-sm text-[#64748B] mb-4">Månadsvis översikt av uttag och kapitalutveckling 2026</p>

      <Card className="bg-white border-[0.5px] border-[#E2E8F0] shadow-none">
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-[#0F1F3D]">Kapitalutveckling & Uttag 2026</h3>
            <div className="flex gap-1 bg-[#F1F5F9] rounded-[8px] p-1">
              {viewButtons.map(b => (
                <button
                  key={b.mode}
                  onClick={() => setView(b.mode)}
                  className={`text-[11px] h-[28px] px-3 rounded-[6px] font-medium transition-colors ${
                    view === b.mode
                      ? "bg-[#0F1F3D] text-white"
                      : "text-[#64748B] hover:text-[#0F1F3D]"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F1F3D" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#0F1F3D" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: chartTheme.gridColor }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  axisLine={{ stroke: chartTheme.gridColor }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke={chartTheme.referenceLineColor} strokeDasharray="3 3" label={{ value: "Nollpunkt", fill: chartTheme.textColor, fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="EgetKapital"
                  fill="url(#capitalGradient)"
                  stroke="none"
                  name="Eget kapital"
                />
                <Bar dataKey="Lön" fill="#1E3A5F" radius={[4, 4, 0, 0]} barSize={20} name="Lön" />
                <Bar dataKey="Utdelning" fill="#1D9E75" radius={[4, 4, 0, 0]} barSize={20} name="Utdelning" />
                <Line
                  type="monotone"
                  dataKey="EgetKapital"
                  stroke="#0F1F3D"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#0F1F3D", fill: "#FFFFFF" }}
                  name="Eget kapital"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Stat boxes */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="rounded-[12px] bg-[#EFF6FF] border-[0.5px] border-[#C8DDF5] p-4 text-center">
              <p className="text-xs text-[#64748B] mb-1">Total uttag 2026</p>
              <p className="text-xl font-semibold text-[#0F1F3D] tabular-nums">{formatSEK(totalUttag)}</p>
            </div>
            <div className="rounded-[12px] bg-[#E1F5EE] border-[0.5px] border-[#BFE6D6] p-4 text-center">
              <p className="text-xs text-[#64748B] mb-1">Skatteeffektivitet</p>
              <p className="text-xl font-semibold text-[#085041] tabular-nums">{effektivitet}%</p>
              <p className="text-[10px] text-[#64748B]">vs alternativ 100% lön</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
