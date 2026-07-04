import { useMemo } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Heart, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeFinancialStatus, type FinancialStatus } from "@/lib/budget/financialStatusEngine";
import type { BRMonth, BudgetDrivers, BudgetMetrics, KFMonth, RRMonth } from "@/lib/budget/driverEngine";
import { computeTrend, type Timeframe, type TrendDirection } from "@/lib/budget/trendEngine";
import type { WhatChangedItem } from "@/lib/budget/whatChangedEngine";
import { TimeframeToggle } from "./TimeframeToggle";

interface Props {
  rr: RRMonth[];
  br: BRMonth[];
  kf: KFMonth[];
  drivers: BudgetDrivers;
  metrics: BudgetMetrics;
  ebitMonthlyActuals: number[];
  whatChanged: WhatChangedItem[];
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
  onDriverFocus?: (driverKey: keyof BudgetDrivers) => void;
}

const TONE: Record<FinancialStatus["level"], { card: string; pill: string; icon: any; label: string }> = {
  healthy: {
    card: "bg-white border-slate-200",
    pill: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
    icon: Heart,
    label: "Hälsosam",
  },
  warning: {
    card: "bg-amber-50/60 border-[#F0DDB7]",
    pill: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
    icon: AlertTriangle,
    label: "Risk",
  },
  critical: {
    card: "bg-rose-50/70 border-[#F4C8C8]",
    pill: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
    icon: AlertTriangle,
    label: "Kritisk",
  },
};

function trendMeta(dir: TrendDirection) {
  if (dir === "up") return { label: "Förbättras", cls: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]", Icon: ArrowUpRight };
  if (dir === "down") return { label: "Försämras", cls: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]", Icon: ArrowDownRight };
  return { label: "Stabilt", cls: "bg-slate-100 text-slate-700 border-slate-200", Icon: Minus };
}

const DRIVER_LABELS: Partial<Record<keyof BudgetDrivers, string>> = {
  averageRevenuePerCustomer: "Pris/kund",
  newCustomersPerMonth: "Nykundsflöde",
  churnRate: "Churn",
  cogsPercent: "Råvaror",
  salaryMonthly: "Personal",
  marketingBudget: "Marknad",
  adminCosts: "Lokal/admin",
  dso: "DSO",
};

export function AIHero({
  rr, br, kf, drivers, metrics, ebitMonthlyActuals, whatChanged, timeframe, onTimeframeChange, onDriverFocus,
}: Props) {
  const status = useMemo(() => computeFinancialStatus(rr, br, kf, drivers, metrics), [rr, br, kf, drivers, metrics]);
  const tone = TONE[status.level];
  const StatusIcon = tone.icon;

  const trend = useMemo(
    () => computeTrend(ebitMonthlyActuals.length ? ebitMonthlyActuals : rr.map(m => m.ebit), timeframe),
    [ebitMonthlyActuals, rr, timeframe]
  );
  const tm = trendMeta(trend.direction);

  const whyTrend = whatChanged[0];

  // Driver chips: 3–5 most material drivers based on |EBIT impact|
  const driverChips = useMemo(() => {
    const candidates: { key: keyof BudgetDrivers; weight: number }[] = [
      { key: "averageRevenuePerCustomer", weight: drivers.averageRevenuePerCustomer * 12 },
      { key: "salaryMonthly", weight: drivers.salaryMonthly * 12 },
      { key: "marketingBudget", weight: drivers.marketingBudget * 12 },
      { key: "cogsPercent", weight: metrics.annualRevenue * (drivers.cogsPercent / 100) },
      { key: "adminCosts", weight: drivers.adminCosts * 12 },
      { key: "dso", weight: drivers.dso * 1000 },
    ];
    return candidates.sort((a, b) => b.weight - a.weight).slice(0, 5);
  }, [drivers, metrics]);

  return (
    <div className={cn("rounded-2xl border shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-5 space-y-3", tone.card)}>
      {/* Pills + timeframe */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", tone.pill)}>
            <StatusIcon className="w-3.5 h-3.5" />
            {tone.label}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", tm.cls)}>
            <tm.Icon className="w-3.5 h-3.5" />
            {tm.label}
            {trend.changePct !== 0 && (
              <span className="tabular-nums opacity-80">{trend.changePct >= 0 ? "+" : ""}{trend.changePct.toFixed(1)}%</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Activity className="w-3 h-3" /> EBIT-trend
          </span>
        </div>
        <TimeframeToggle value={timeframe} onChange={onTimeframeChange} />
      </div>

      {/* Verdict */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#3b82f6]" />
          {status.headline}
        </h2>
        {status.reasons[0] && <p className="text-sm text-slate-700">{status.reasons[0]}</p>}
        {status.reasons[1] && <p className="text-xs text-slate-600">{status.reasons[1]}</p>}
        {whyTrend && (
          <p className="text-xs text-slate-600">
            <span className="font-medium text-slate-800">Varför trenden ändras:</span> {whyTrend.label.toLowerCase()} — {whyTrend.detail}
          </p>
        )}
      </div>

      {/* Driver chips */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {driverChips.map(c => (
          <button
            key={c.key}
            type="button"
            onClick={() => onDriverFocus?.(c.key)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-200 bg-white text-slate-700 hover:border-[#3b82f6] hover:bg-blue-50/60 transition-colors"
          >
            {DRIVER_LABELS[c.key] ?? c.key}
          </button>
        ))}
      </div>
    </div>
  );
}
