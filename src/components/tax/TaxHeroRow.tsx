/**
 * Premium 3-card hero row for /tax-calculation.
 * Standardized navy primary card + two neutral white cards.
 */
import { Sparkles, ArrowRight, TrendingUp, TrendingDown, Wallet, Percent, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountUp } from "@/hooks/useCountUp";

interface TaxHeroRowProps {
  corporateTax: number;
  potentialSavingKr: number;
  resultBeforeTax: number;
  effectiveTaxRate: number;
  fiscalYear: number;
  onOptimize: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

export function TaxHeroRow({
  corporateTax,
  potentialSavingKr,
  resultBeforeTax,
  effectiveTaxRate,
  fiscalYear,
  onOptimize,
}: TaxHeroRowProps) {
  const animatedTax = useCountUp(corporateTax, 900);
  const animatedResult = useCountUp(resultBeforeTax, 900);
  const animatedRate = useCountUp(effectiveTaxRate, 900);
  const hasSavings = potentialSavingKr > 1000;
  const resultPositive = resultBeforeTax >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* PRIMARY — Navy */}
      <div className="rounded-[12px] bg-[#0F1F3D] p-6 text-white">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/60">
            <Wallet className="h-3.5 w-3.5" />
            Skatt att betala · {fiscalYear}
          </div>
          <div className="text-4xl md:text-[40px] font-bold tabular-nums tracking-tight leading-none">
            {fmt(animatedTax)} <span className="text-2xl text-white/60 font-semibold">kr</span>
          </div>

          {hasSavings ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/40 px-3 py-1 text-xs font-medium text-[#BFE6D6]">
              <TrendingDown className="h-3.5 w-3.5" />
              ↓ −{fmt(potentialSavingKr)} kr möjlig besparing
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs text-white/70">
              <Sparkles className="h-3.5 w-3.5" /> Skatten är optimerad
            </div>
          )}

          <Button
            onClick={onOptimize}
            disabled={!hasSavings}
            className="mt-2 bg-white text-[#0F1F3D] hover:bg-white/90 font-semibold disabled:opacity-50 disabled:bg-white/30 disabled:text-white/70"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Optimera skatt
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* SECONDARY — Result before tax */}
      <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#64748B]">
            <BarChart3 className="h-3.5 w-3.5" />
            Resultat före skatt
          </div>
          <div className={`text-4xl md:text-[40px] font-bold tabular-nums tracking-tight leading-none ${resultPositive ? "text-[#0F1F3D]" : "text-[#C73838]"}`}>
            {fmt(animatedResult)} <span className="text-2xl text-[#94A3B8] font-semibold">kr</span>
          </div>
          <div className="text-xs text-[#64748B]">
            {resultPositive ? "Vinst som ligger till grund för bolagsskatt" : "Negativt resultat — ingen skatt"}
          </div>
        </div>
      </div>

      {/* TERTIARY — Effective rate */}
      <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#64748B]">
            <Percent className="h-3.5 w-3.5" />
            Effektiv skattesats
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl md:text-[40px] font-bold tabular-nums tracking-tight leading-none text-[#0F1F3D]">
              {animatedRate.toFixed(1).replace(".", ",")}
              <span className="text-2xl text-[#94A3B8] font-semibold"> %</span>
            </div>
            {effectiveTaxRate > 0 && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${effectiveTaxRate > 20.6 ? "text-[#C73838]" : "text-[#1D9E75]"}`}>
                {effectiveTaxRate > 20.6 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(effectiveTaxRate - 20.6).toFixed(1)} pp
              </span>
            )}
          </div>
          <div className="text-xs text-[#64748B]">
            Nominell bolagsskatt 20,6 %
          </div>
        </div>
      </div>
    </div>
  );
}
