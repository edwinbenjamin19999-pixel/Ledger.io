import { ArrowDownRight, ArrowUpRight, Banknote, Clock, Minus, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";

export interface CashflowKPI {
  key: "inflows" | "outflows" | "net" | "runway";
  label: string;
  value: number | null;
  unit?: "sek" | "days";
  /** Trend in % vs comparison; null = no comparison data. */
  trendPct?: number | null;
  status: "good" | "warning" | "critical" | "neutral" | "unavailable";
  microInsight?: string;
  unavailableReason?: string;
  onClick?: () => void;
}

const iconFor = {
  inflows: ArrowUpRight,
  outflows: ArrowDownRight,
  net: Banknote,
  runway: Clock,
} as const;

const statusRing = {
  good: "ring-emerald-500/30 hover:ring-emerald-500/50",
  warning: "ring-amber-500/30 hover:ring-amber-500/50",
  critical: "ring-rose-500/40 hover:ring-rose-500/60",
  neutral: "ring-border hover:ring-[#3b82f6]/40",
  unavailable: "ring-border opacity-90",
};
const statusDot = {
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  neutral: "bg-[#3b82f6]",
  unavailable: "bg-muted-foreground/40",
};
const statusText = {
  good: "Stabilt",
  warning: "Bevaka",
  critical: "Kritiskt",
  neutral: "Neutralt",
  unavailable: "Otillgänglig",
};

function formatValue(k: CashflowKPI): string {
  if (k.value === null || k.value === undefined) return "—";
  if (k.unit === "days") return `${Math.round(k.value)} dagar`;
  return formatSEK(k.value);
}

function KPICard({ k }: { k: CashflowKPI }) {
  const Icon = iconFor[k.key];
  const interactive = !!k.onClick && k.status !== "unavailable";
  return (
    <Card
      onClick={interactive ? k.onClick : undefined}
      className={cn(
        "relative overflow-hidden p-4 transition-all ring-1",
        statusRing[k.status],
        interactive && "cursor-pointer hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span>{k.label}</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatValue(k)}
          </div>
          {k.status === "unavailable" ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>{k.unavailableReason ?? "Saknar dataunderlag"}</span>
            </div>
          ) : k.trendPct === null || k.trendPct === undefined ? null : (
            <div
              className={cn(
                "mt-2 flex items-center gap-1 text-xs font-medium",
                k.trendPct > 0
                  ? "text-[#085041] dark:text-[#1D9E75]"
                  : k.trendPct < 0
                    ? "text-[#7A1A1A] dark:text-[#C73838]"
                    : "text-muted-foreground",
              )}
            >
              {k.trendPct > 0 ? <TrendingUp className="h-3 w-3" /> : k.trendPct < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              <span>{Math.abs(k.trendPct).toFixed(0)}% vs jmf</span>
            </div>
          )}
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[k.status])} />
          {statusText[k.status]}
        </span>
      </div>
      {k.microInsight && k.status !== "unavailable" ? (
        <p className="mt-3 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          <span className="font-medium text-[#3b82f6] dark:text-[#3b82f6]">AI · </span>
          {k.microInsight}
        </p>
      ) : null}
    </Card>
  );
}

export function CashflowKPICards({ kpis }: { kpis: CashflowKPI[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <KPICard key={k.key} k={k} />
      ))}
    </div>
  );
}
