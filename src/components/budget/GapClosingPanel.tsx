import { useMemo, useState } from "react";
import { Target, TrendingUp, TrendingDown, Scale, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { computeGap, type GapKpi, type GapOption } from "@/lib/budget/gapEngine";
import type { BudgetDrivers, RRMonth, KFMonth } from "@/lib/budget/driverEngine";

const KPI_OPTIONS: { value: GapKpi; label: string }[] = [
  { value: "ebit", label: "EBIT" },
  { value: "revenue", label: "Intäkter" },
  { value: "cash", label: "Kassa" },
  { value: "runway", label: "Runway (dgr)" },
];

const PERIOD_OPTIONS = ["Q1", "Q2", "Q3", "Q4", "Helår"] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

const PERIOD_MONTHS: Record<Period, number[]> = {
  Q1: [0, 1, 2],
  Q2: [3, 4, 5],
  Q3: [6, 7, 8],
  Q4: [9, 10, 11],
  Helår: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const OPT_STYLE = {
  revenue: { icon: TrendingUp, color: "text-[#085041]", bg: "bg-[#E1F5EE]", border: "border-[#BFE6D6]" },
  cost: { icon: TrendingDown, color: "text-[#7A1A1A]", bg: "bg-[#FCE8E8]", border: "border-[#F4C8C8]" },
  balanced: { icon: Scale, color: "text-[#3b82f6]", bg: "bg-[#EFF6FF]", border: "border-[#C8DDF5]" },
} as const;

interface Props {
  drivers: BudgetDrivers;
  rr: RRMonth[];
  kf: KFMonth[];
  onApply?: (option: GapOption) => Promise<void> | void;
  className?: string;
}

export function GapClosingPanel({ drivers, rr, kf, onApply, className }: Props) {
  const [kpi, setKpi] = useState<GapKpi>("ebit");
  const [targetValue, setTargetValue] = useState("");
  const [period, setPeriod] = useState<Period>("Q4");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const months = PERIOD_MONTHS[period];

  const { currentValue, periodRevenue, periodCost, dailyBurn } = useMemo(() => {
    const sum = (arr: number[], idx: number[]) => idx.reduce((s, i) => s + (arr[i] || 0), 0);
    const periodRevenue = sum(rr.map((m) => m.revenue), months);
    const periodCost = sum(rr.map((m) => m.cogs + m.totalOpex), months);
    let current = 0;
    if (kpi === "ebit") current = sum(rr.map((m) => m.ebit), months);
    else if (kpi === "revenue") current = periodRevenue;
    else if (kpi === "cash") current = kf[months[months.length - 1]]?.closingCash ?? 0;
    else if (kpi === "runway") {
      const lastIdx = months[months.length - 1];
      const cash = kf[lastIdx]?.closingCash ?? 0;
      const burn = Math.abs(Math.min(0, kf[lastIdx]?.netCashFlow ?? 0));
      current = burn > 0 ? Math.floor(cash / burn) : 999;
    }
    const burnAnnual = Math.abs(rr.reduce((s, m) => s + Math.min(0, m.ebit), 0));
    const dailyBurn = Math.max(1, burnAnnual / 365);
    return { currentValue: current, periodRevenue, periodCost, dailyBurn };
  }, [rr, kf, kpi, months]);

  const gap = useMemo(() => {
    const tv = parseFloat(targetValue);
    if (!Number.isFinite(tv)) return null;
    return computeGap({ kpi, targetValue: tv, currentValue, periodRevenue, periodCost, dailyBurn }, drivers);
  }, [targetValue, kpi, currentValue, periodRevenue, periodCost, dailyBurn, drivers]);

  const handleApply = async (opt: GapOption) => {
    if (!onApply) return;
    setApplyingId(opt.id);
    try {
      await onApply(opt);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-[#3b82f6]" />
        <h3 className="font-semibold text-slate-900">Stäng gapet — vad krävs?</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-slate-600">KPI</Label>
          <Select value={kpi} onValueChange={(v) => setKpi(v as GapKpi)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KPI_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-600">Period</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-600">Mål ({kpi === "runway" ? "dgr" : "SEK"})</Label>
          <Input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="t.ex. 600000"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
        <span className="font-medium">Nuvarande värde i {period}:</span>{" "}
        <span className="text-slate-900 font-semibold">
          {kpi === "runway" ? `${currentValue} dgr` : formatSEK(currentValue)}
        </span>
      </div>

      {gap && gap.gapSEK !== 0 && (
        <>
          <div
            className={cn(
              "text-sm rounded-lg p-3 border",
              gap.gapSEK > 0
                ? "bg-[#FCE8E8] border-[#F4C8C8] text-[#7A1A1A]"
                : "bg-[#E1F5EE] border-[#BFE6D6] text-[#085041]"
            )}
          >
            <span className="font-semibold">
              {gap.gapSEK > 0 ? "Gap att stänga: " : "Mål redan uppnått, marginal: "}
            </span>
            {kpi === "runway" ? `${Math.abs(gap.gapSEK).toFixed(0)} dgr` : formatSEK(Math.abs(gap.gapSEK))}
            {gap.gapPct !== 0 && (
              <span className="text-xs ml-2 opacity-70">({gap.gapPct.toFixed(1)}%)</span>
            )}
          </div>

          {gap.options.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Tre vägar att stänga gapet
              </div>
              {gap.options.map((opt) => {
                const s = OPT_STYLE[opt.id];
                const Icon = s.icon;
                return (
                  <div
                    key={opt.id}
                    className={cn("rounded-lg border p-3 flex items-start gap-3", s.bg, s.border)}
                  >
                    <div className={cn("flex items-center justify-center w-9 h-9 rounded-full bg-white shrink-0", s.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{opt.label}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn("h-7 px-2 text-xs gap-1", s.color)}
                          disabled={applyingId === opt.id}
                          onClick={() => handleApply(opt)}
                        >
                          {applyingId === opt.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              Tillämpa <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5">{opt.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
                        {opt.deltaRevenue !== 0 && (
                          <span className="text-[#085041]">
                            Δ Intäkt: {formatSEK(opt.deltaRevenue)}
                          </span>
                        )}
                        {opt.deltaCost !== 0 && (
                          <span className="text-[#7A1A1A]">
                            Δ Kostnad: {formatSEK(opt.deltaCost)}
                          </span>
                        )}
                        <span className="text-slate-700">
                          EBIT: {formatSEK(opt.ebitImpact)}
                        </span>
                        <span className="text-slate-700">
                          Runway: {opt.runwayDeltaDays > 0 ? "+" : ""}
                          {opt.runwayDeltaDays} dgr
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!gap && (
        <p className="text-xs text-slate-500">
          Ange ett mål ovan för att se vad som krävs och hur du kan stänga gapet.
        </p>
      )}
    </div>
  );
}
