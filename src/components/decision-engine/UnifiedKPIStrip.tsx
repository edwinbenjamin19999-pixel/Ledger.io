/**
 * UnifiedKPIStrip — 4 KPI:er som reagerar på mode/timeframe/version.
 * Värde · Δ SEK · Δ % · trend-arrow · driver-hint.
 */
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDecisionEngine } from "@/contexts/DecisionEngineContext";
import { runScenario, deriveKpis } from "@/lib/scenarios/scenarioEngine";
import { DEFAULT_DRIVERS } from "@/lib/budget/driverEngine";

interface KPI {
  key: "revenue" | "costs" | "ebitda" | "cash";
  label: string;
  value: number;
  comparison: number;
  driverHint: string;
}

function formatSek(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mkr`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)} tkr`;
  return `${Math.round(n)} kr`;
}

function formatPct(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)} %`;
}

interface KPICardProps {
  kpi: KPI;
  mode: string;
  onClick: () => void;
}

function KPICard({ kpi, mode, onClick }: KPICardProps) {
  const delta = kpi.value - kpi.comparison;
  const pct = kpi.comparison !== 0 ? (delta / Math.abs(kpi.comparison)) * 100 : 0;
  const isCost = kpi.key === "costs";
  const isFavorable = isCost ? delta < 0 : delta > 0;
  const tone =
    Math.abs(pct) < 0.5
      ? "neutral"
      : isFavorable
        ? "positive"
        : "negative";
  const Icon = tone === "neutral" ? Minus : tone === "positive" ? TrendingUp : TrendingDown;
  const showComparison = mode !== "actual";

  return (
    <Card
      className="p-5 hover:shadow-md transition-shadow cursor-pointer focus-within:ring-2 focus-within:ring-ring"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
            tone === "positive" && "bg-success/10 text-success",
            tone === "negative" && "bg-destructive/10 text-destructive",
            tone === "neutral" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-3 w-3" />
          {showComparison ? formatPct(pct) : "—"}
        </span>
      </div>
      <div className="text-2xl font-bold tracking-tight text-foreground">{formatSek(kpi.value)}</div>
      {showComparison && (
        <div className="mt-1 text-xs text-muted-foreground">
          Δ {formatSek(delta)} vs {kpi.comparison >= 0 ? "" : ""}{formatSek(kpi.comparison)}
        </div>
      )}
      <div className="mt-2 text-xs text-muted-foreground italic truncate" title={kpi.driverHint}>
        {kpi.driverHint}
      </div>
    </Card>
  );
}

export function UnifiedKPIStrip({ onDrilldown }: { onDrilldown?: (key: string) => void }) {
  const { mode, driverPatch } = useDecisionEngine();

  const kpis = useMemo<KPI[]>(() => {
    const base = runScenario({ baseDrivers: DEFAULT_DRIVERS });
    const scenario = runScenario({ baseDrivers: { ...DEFAULT_DRIVERS, ...driverPatch } });
    const baseK = deriveKpis(base, null);
    const scenK = deriveKpis(scenario, null);
    const sumRev = (rows: typeof base.rr) => rows.reduce((s, r) => s + r.revenue, 0);
    const sumCost = (rows: typeof base.rr) => rows.reduce((s, r) => s + r.cogs + r.totalOpex, 0);
    const sumEbitda = (rows: typeof base.rr) => rows.reduce((s, r) => s + r.ebitda, 0);

    return [
      {
        key: "revenue",
        label: "Omsättning",
        value: sumRev(scenario.rr),
        comparison: sumRev(base.rr),
        driverHint: `Pris ${(scenario.drivers.priceGrowthRate * 100).toFixed(1)}% · Kunder ${Math.round(scenario.drivers.startingCustomers)}`,
      },
      {
        key: "costs",
        label: "Kostnader",
        value: sumCost(scenario.rr),
        comparison: sumCost(base.rr),
        driverHint: `Personal ${formatSek(scenario.drivers.salaryMonthly * 12)} · COGS ${(scenario.drivers.cogsPercent * 100).toFixed(0)}%`,
      },
      {
        key: "ebitda",
        label: "EBITDA",
        value: sumEbitda(scenario.rr),
        comparison: sumEbitda(base.rr),
        driverHint: `Marginal ${scenK.ebitMarginPct.toFixed(1)}%`,
      },
      {
        key: "cash",
        label: "Kassaflöde",
        value: scenK.endingCash,
        comparison: baseK.endingCash,
        driverHint: scenK.runwayMonths != null ? `Runway ${scenK.runwayMonths.toFixed(0)} mån` : "Positiv runway",
      },
    ];
  }, [driverPatch]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.key} kpi={kpi} mode={mode} onClick={() => onDrilldown?.(kpi.key)} />
      ))}
    </div>
  );
}
