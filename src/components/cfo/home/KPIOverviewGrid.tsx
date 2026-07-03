import { useCFODashboard } from "@/hooks/useCFODashboard";
import { useLiveCFOKPIs } from "@/hooks/useLiveCFOKPIs";
import { KPIMiniCard, type KPITone } from "./KPIMiniCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSEK, formatPercent } from "@/lib/formatNumber";
import { Banknote, TrendingUp, Activity, Wallet, Timer, ArrowUpRight, ArrowDownRight, PieChart } from "lucide-react";

interface Props {
  companyId: string;
}

function marginTone(m: number): KPITone {
  if (m >= 20) return "strong";
  if (m >= 10) return "watch";
  if (m >= 5) return "needs_attention";
  return "critical";
}
function runwayTone(months: number): KPITone {
  if (months >= 9) return "strong";
  if (months >= 6) return "watch";
  if (months >= 3) return "needs_attention";
  return "critical";
}
function growthTone(g: number): KPITone {
  if (g >= 10) return "strong";
  if (g >= 0) return "watch";
  if (g >= -5) return "needs_attention";
  return "critical";
}

export function KPIOverviewGrid({ companyId }: Props) {
  const { data, isLoading } = useCFODashboard(companyId);
  const live = useLiveCFOKPIs(companyId);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  const runwayMonths = Math.max(0, Math.round((live.runway_days ?? data.runway * 30) / 30));
  const cards = [
    { kpiKey: "revenue", label: "Omsättning (mån)", value: formatSEK(data.currentRevenue), Icon: TrendingUp,
      delta: { pct: data.revenueGrowth, direction: (data.revenueGrowth > 0 ? "up" : data.revenueGrowth < 0 ? "down" : "flat") as "up" | "down" | "flat", positiveIsGood: true },
      tone: growthTone(data.revenueGrowth), verdict: data.revenueGrowth >= 5 ? "Starkt momentum mot föregående månad" : data.revenueGrowth < 0 ? "Tappade intäkter — analysera drivare" : "Stabil intäktsnivå" },
    { kpiKey: "ebitda", label: "EBITDA (mån)", value: formatSEK(data.ebitda), Icon: Activity,
      delta: null, tone: data.ebitda >= 0 ? "watch" as KPITone : "needs_attention" as KPITone,
      verdict: data.ebitda > 0 ? "Positivt rörelseresultat" : "Negativ EBITDA — kostnadsöversyn krävs" },
    { kpiKey: "margin", label: "EBITDA-marginal", value: formatPercent(data.ebitdaMargin), Icon: PieChart,
      delta: null, tone: marginTone(data.ebitdaMargin),
      verdict: data.ebitdaMargin >= 20 ? "Över branschsnittet" : data.ebitdaMargin >= 10 ? "Acceptabel — förbättringspotential" : "Under riktnivå" },
    { kpiKey: "cash", label: "Kassa", value: formatSEK(data.cash), Icon: Wallet,
      delta: null, tone: runwayTone(runwayMonths),
      verdict: runwayMonths >= 6 ? "Stabil likviditet" : "Bygg likviditetsbuffert" },
    { kpiKey: "runway", label: "Runway", value: `${runwayMonths} mån`, Icon: Timer,
      delta: null, tone: runwayTone(runwayMonths),
      verdict: runwayMonths < 3 ? "Akut — prioritera kassainflöde" : runwayMonths < 6 ? "Bevaka burn rate" : "Hälsosam runway" },
    { kpiKey: "ar", label: "Kundfordringar", value: formatSEK(data.currentRevenue * 0.15), Icon: ArrowDownRight,
      delta: null, tone: "watch" as KPITone, verdict: "Granska förfallna fakturor" },
    { kpiKey: "cost_ratio", label: "Kostnadsandel", value: formatPercent(data.currentRevenue > 0 ? (data.currentCosts / data.currentRevenue) * 100 : 0), Icon: ArrowUpRight,
      delta: null, tone: data.currentRevenue > 0 && data.currentCosts / data.currentRevenue < 0.8 ? "strong" as KPITone : "watch" as KPITone,
      verdict: "Andel av intäkten som går till kostnader" },
    { kpiKey: "growth", label: "Tillväxt MoM", value: `${data.revenueGrowth >= 0 ? "+" : ""}${data.revenueGrowth.toFixed(1)}%`, Icon: Banknote,
      delta: null, tone: growthTone(data.revenueGrowth),
      verdict: data.revenueGrowth >= 10 ? "Stark tillväxttakt" : "Bevaka tillväxttrend" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => <KPIMiniCard key={c.kpiKey} {...c} index={i} />)}
    </div>
  );
}
