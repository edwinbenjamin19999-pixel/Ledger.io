import { useCashflowForecast } from "@/hooks/useCashflowForecast";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, ReferenceLine, YAxis, XAxis } from "recharts";
import { TrendingDown, TrendingUp, Flame, Hourglass, LineChart as LineIcon, AlertTriangle } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { computeCompanyHealth } from "@/lib/cfo/companyHealthSignal";

interface Props { companyId: string }

export function LiquidityRunwayStrip({ companyId }: Props) {
  const { data, isLoading } = useCashflowForecast(12, companyId);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <Card key={i} className="h-32 animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }

  // Single source of truth for tone — keeps Burn / Runway / Insights in sync.
  const health = computeCompanyHealth({
    cash: data.currentCash ?? 0,
    monthlyBurn: Math.abs(Math.min(0, data.avgMonthlyFlow)),
  });

  const burnDisplay = health.monthlyBurn;
  const runwayMonths = health.runwayMonths;
  const runwayTone =
    health.status === "critical" ? "red" : health.status === "warning" ? "amber" : "emerald";

  const toneClasses: Record<string, { ring: string; text: string; bg: string; chip: string }> = {
    emerald: { ring: "border-[#BFE6D6]", text: "text-[#085041]", bg: "bg-emerald-50/60", chip: "bg-[#E1F5EE] text-[#085041]" },
    amber:   { ring: "border-[#F0DDB7]",   text: "text-[#7A5417]",   bg: "bg-amber-50/60",   chip: "bg-[#FAEEDA] text-[#7A5417]" },
    red:     { ring: "border-[#F4C8C8]",     text: "text-[#7A1A1A]",     bg: "bg-red-50/60",     chip: "bg-[#FCE8E8] text-[#7A1A1A]" },
  };
  const t = toneClasses[runwayTone];

  const trendUp = health.status === "ok" && data.avgMonthlyFlow >= 0;
  const next3 = (data.forecast || []).slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Burn rate */}
      <Card className={`p-5 ${health.status === "critical" ? "border-[#F4C8C8] bg-red-50/40" : "border-slate-200"}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-medium">
              <Flame className="w-3.5 h-3.5" /> Burn rate
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {burnDisplay === null ? "—" : formatSEK(burnDisplay)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {burnDisplay === null
                ? (health.status === "critical" ? "Negativ kassa — burn ej meningsfull" : "Otillräcklig data")
                : "Snitt/månad senaste 6 mån"}
            </div>
          </div>
          {health.status === "critical" ? (
            <div className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-[#FCE8E8] text-[#7A1A1A]">
              <AlertTriangle className="w-3 h-3" /> Kritiskt
            </div>
          ) : (
            <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${trendUp ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#FCE8E8] text-[#7A1A1A]"}`}>
              {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendUp ? "Positivt flöde" : "Negativt flöde"}
            </div>
          )}
        </div>
      </Card>

      {/* Runway */}
      <Card className={`p-5 border ${t.ring} ${t.bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-medium">
              <Hourglass className="w-3.5 h-3.5" /> Runway
            </div>
            <div className={`mt-3 text-2xl font-bold ${t.text}`}>
              {runwayMonths === null
                ? (health.status === "ok" ? "Stabil" : "—")
                : runwayMonths >= 24
                  ? "24+ mån"
                  : runwayMonths < 1
                    ? "0 mån"
                    : `${runwayMonths.toFixed(1)} mån`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {health.headline}
            </div>
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${t.chip}`}>
            {runwayTone === "emerald" ? "Stabil" : runwayTone === "amber" ? "Bevaka" : "Kritisk"}
          </span>
        </div>
      </Card>

      {/* Mini-forecast */}
      <Card className="p-5 border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-medium">
            <LineIcon className="w-3.5 h-3.5" /> Prognos 3 mån
          </div>
          <div className="text-xs text-muted-foreground">
            Slut: {next3[2] ? formatSEK(next3[2].pessimistic) : "—"}
          </div>
        </div>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={next3} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="runwayFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--brand-primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--brand-primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["auto", "auto"]} />
              <XAxis dataKey="label" hide />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="pessimistic" stroke="hsl(var(--brand-primary))" strokeWidth={2} fill="url(#runwayFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          {next3.map(m => <span key={m.month}>{m.label}</span>)}
        </div>
      </Card>
    </div>
  );
}
