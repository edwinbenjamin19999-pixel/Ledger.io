import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatSEKCompact } from "@/lib/formatNumber";
import { MONTH_LABELS } from "@/lib/budget/driverEngine";
import type { MonteCarloResult } from "@/lib/scenarios/monteCarlo";
import { Badge } from "@/components/ui/badge";

interface Props {
  result: MonteCarloResult | null;
  running: boolean;
}

export function MonteCarloPanel({ result, running }: Props) {
  const data = useMemo(() => {
    if (!result) return [];
    return MONTH_LABELS.map((m, i) => ({
      month: m,
      p10: result.p10Cash[i],
      p50: result.p50Cash[i],
      p90: result.p90Cash[i],
      band: Math.max(0, result.p90Cash[i] - result.p10Cash[i]),
    }));
  }, [result]);

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Monte Carlo</h3>
          <p className="text-xs text-slate-500">{result ? `${result.iterations} simulerade utfall` : running ? "Simulerar…" : "—"}</p>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <Badge className={result.survivalPct >= 80
              ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] hover:bg-[#E1F5EE]"
              : result.survivalPct >= 50
                ? "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] hover:bg-[#FAEEDA]"
                : "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] hover:bg-[#FCE8E8]"}>
              Överlevnad {result.survivalPct.toFixed(0)} %
            </Badge>
            {Number.isFinite(result.targetHitPct) && (
              <Badge variant="outline" className="border-slate-200 text-slate-700">
                Når mål {result.targetHitPct.toFixed(0)} %
              </Badge>
            )}
          </div>
        )}
      </div>

      {!result ? (
        <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
          {running ? "Räknar 1000 utfall…" : "Inget resultat ännu"}
        </div>
      ) : (
        <>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mcBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => formatSEKCompact(v)} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: number) => formatSEKCompact(v)} />
                <Area type="monotone" dataKey="p10" stackId="band" stroke="transparent" fill="transparent" />
                <Area type="monotone" dataKey="band" stackId="band" stroke="transparent" fill="url(#mcBand)" name="P10–P90" />
                <Line type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={2} dot={false} name="P50" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Kassa dec — P10</div>
              <div className="font-semibold tabular-nums text-[#7A1A1A]">{formatSEKCompact(result.p10Cash[11])}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">P50 (median)</div>
              <div className="font-semibold tabular-nums text-slate-900">{formatSEKCompact(result.p50Cash[11])}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">P90</div>
              <div className="font-semibold tabular-nums text-[#085041]">{formatSEKCompact(result.p90Cash[11])}</div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
