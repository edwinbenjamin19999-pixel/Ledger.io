import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, TrendingUp, Wallet, Calendar, Activity } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from "recharts";
import { formatSEKCompact } from "@/lib/formatNumber";
import { MONTH_LABELS } from "@/lib/budget/driverEngine";
import type { ScenarioRunResult, ScenarioKpis } from "@/lib/scenarios/scenarioEngine";

interface Props {
  result: ScenarioRunResult;
  kpis: ScenarioKpis;
  targetEbit: number | null;
}

export function SimulationCenter({ result, kpis, targetEbit }: Props) {
  const data = useMemo(
    () => result.kf.map((k, i) => ({
      month: MONTH_LABELS[i],
      cash: k.closingCash,
      ebit: result.rr[i].ebit,
    })),
    [result],
  );

  const breakEvenIdx = kpis.breakEvenMonth;

  const KPI = ({ icon: Icon, label, value, sub, tone = "slate" as "slate" | "emerald" | "rose" | "cyan" }: {
    icon: typeof TrendingUp; label: string; value: string; sub?: string; tone?: "slate" | "emerald" | "rose" | "cyan";
  }) => {
    const toneCls = {
      slate: "text-slate-900", emerald: "text-[#085041]", rose: "text-[#7A1A1A]", cyan: "text-[#3b82f6]",
    }[tone];
    return (
      <Card className="p-4 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-medium">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className={`mt-1.5 text-3xl font-bold tabular-nums ${toneCls}`}>{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </Card>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          icon={Calendar}
          label="Runway"
          value={kpis.runwayMonths != null ? `${kpis.runwayMonths} mån` : "Lönsam"}
          tone={kpis.runwayMonths != null && kpis.runwayMonths < 6 ? "rose" : "slate"}
        />
        <KPI
          icon={Activity}
          label="Break-even"
          value={breakEvenIdx != null ? MONTH_LABELS[breakEvenIdx] : "—"}
          sub={breakEvenIdx != null ? `Mån ${breakEvenIdx + 1}` : "Ej inom året"}
        />
        <KPI
          icon={Wallet}
          label="Kassa december"
          value={formatSEKCompact(kpis.endingCash)}
          tone={kpis.endingCash < 0 ? "rose" : kpis.endingCash > 0 ? "emerald" : "slate"}
        />
        <KPI
          icon={TrendingUp}
          label="EBIT (år)"
          value={formatSEKCompact(kpis.annualEbit)}
          tone={kpis.annualEbit >= 0 ? "emerald" : "rose"}
          sub={`${kpis.ebitMarginPct.toFixed(1)} % marginal`}
        />
      </div>

      <Card className="p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Simulering</h3>
            <p className="text-xs text-slate-500">Kassa (yta) och EBIT (linje) per månad</p>
          </div>
          {kpis.willHitTarget !== null && (
            <Badge className={kpis.willHitTarget
              ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] hover:bg-[#E1F5EE]"
              : "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] hover:bg-[#FCE8E8]"}>
              {kpis.willHitTarget ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
              {kpis.willHitTarget ? "Når mål" : "Missar mål"}
            </Badge>
          )}
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => formatSEKCompact(v)} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v: number) => formatSEKCompact(v)}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 4" />
              {targetEbit != null && (
                <ReferenceLine y={targetEbit / 12} stroke="#64748b" strokeDasharray="4 4" label={{ value: "Mål EBIT/mån", fontSize: 10, fill: "#64748b", position: "right" }} />
              )}
              {breakEvenIdx != null && breakEvenIdx >= 0 && (
                <ReferenceLine x={MONTH_LABELS[breakEvenIdx]} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Break-even", fontSize: 10, fill: "#10b981", position: "top" }} />
              )}
              <Area type="monotone" dataKey="cash" stroke="#3b82f6" strokeWidth={2} fill="url(#cashFill)" name="Kassa" />
              <Line type="monotone" dataKey="ebit" stroke="#1e293b" strokeWidth={2} dot={false} name="EBIT" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
