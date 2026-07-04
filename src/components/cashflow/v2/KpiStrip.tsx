import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Wallet, TrendingDown, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CashFlowKPI } from "@/hooks/useCashFlow";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

export type KpiKey = "inflow" | "outflow" | "net" | "balance" | "runway";

interface Props {
  kpi: CashFlowKPI;
  selected: KpiKey | null;
  onSelect: (k: KpiKey | null) => void;
  monthInflow: number;
  monthOutflow: number;
  prevMonthInflow: number;
  prevMonthOutflow: number;
  sparklineNet?: number[];
}

function Sparkline({ values, polarity }: { values: number[]; polarity: "pos" | "neg" | "neutral" }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 64;
  const h = 18;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke =
    polarity === "pos" ? "hsl(160 84% 39%)" : polarity === "neg" ? "hsl(346 77% 50%)" : "hsl(215 20% 50%)";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export function KpiStrip({
  kpi,
  selected,
  onSelect,
  monthInflow,
  monthOutflow,
  prevMonthInflow,
  prevMonthOutflow,
  sparklineNet = [],
}: Props) {
  const items: Array<{
    key: KpiKey;
    label: string;
    value: number;
    delta: number;
    suffix?: string;
    icon: typeof Wallet;
    polarity: "pos" | "neg" | "neutral";
  }> = [
    {
      key: "inflow",
      label: "Inflöde MTD",
      value: monthInflow,
      delta: monthInflow - prevMonthInflow,
      icon: ArrowUpRight,
      polarity: "pos",
    },
    {
      key: "outflow",
      label: "Utflöde MTD",
      value: monthOutflow,
      delta: monthOutflow - prevMonthOutflow,
      icon: ArrowDownRight,
      polarity: "neg",
    },
    {
      key: "net",
      label: "Netto MTD",
      value: kpi.netCashFlowMTD,
      delta: kpi.netCashFlowMTD - kpi.netCashFlowPrevMTD,
      icon: kpi.netCashFlowMTD >= 0 ? TrendingUp : TrendingDown,
      polarity: kpi.netCashFlowMTD >= 0 ? "pos" : "neg",
    },
    {
      key: "balance",
      label: "Likvida medel",
      value: kpi.cashBalance,
      delta: 0,
      icon: Wallet,
      polarity: "neutral",
    },
    {
      key: "runway",
      label: "Runway",
      value: kpi.runwayDays,
      delta: 0,
      suffix: " dgr",
      icon: Clock,
      polarity: kpi.runwayDays < 60 ? "neg" : kpi.runwayDays < 120 ? "neutral" : "pos",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        const isSel = selected === it.key;
        const deltaPct =
          it.delta && it.value
            ? Math.round((it.delta / Math.max(1, Math.abs(it.value - it.delta))) * 100)
            : 0;
        return (
          <button
            key={it.key}
            onClick={() => onSelect(isSel ? null : it.key)}
            className={cn(
              "text-left transition-all duration-200 rounded-2xl",
              isSel ? "ring-2 ring-[#3b82f6] ring-offset-2 ring-offset-background -translate-y-0.5" : "",
            )}
          >
            <Card className="p-4 h-full bg-gradient-to-br from-card to-card/60 border-border/60">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {it.label}
                </span>
                <Icon
                  className={cn(
                    "h-4 w-4",
                    it.polarity === "pos" && "text-[#085041]",
                    it.polarity === "neg" && "text-[#7A1A1A]",
                    it.polarity === "neutral" && "text-slate-400",
                  )}
                />
              </div>
              <div
                key={`${it.key}-${it.value}`}
                className="mt-2 text-2xl font-bold tabular-nums tracking-tight animate-fade-in"
              >
                {fmt(it.value)}
                {it.suffix ?? ""}
              </div>
              <div className="mt-1 flex items-end justify-between gap-2">
                {it.delta !== 0 ? (
                  <div
                    className={cn(
                      "text-[11px] tabular-nums font-medium",
                      it.delta > 0 ? "text-[#085041]" : "text-[#7A1A1A]",
                    )}
                  >
                    {it.delta > 0 ? "▲" : "▼"} {fmt(Math.abs(it.delta))} ({deltaPct > 0 ? "+" : ""}
                    {deltaPct}%)
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">—</div>
                )}
                {sparklineNet.length > 0 && (it.key === "net" || it.key === "balance" || it.key === "runway") && (
                  <Sparkline values={sparklineNet} polarity={it.polarity} />
                )}
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
