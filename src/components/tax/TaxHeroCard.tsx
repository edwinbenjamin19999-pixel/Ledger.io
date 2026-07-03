/**
 * Premium tax hero — single source of "what do I owe + can I pay less".
 */
import { Sparkles, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaxHeroCardProps {
  corporateTax: number;
  optimizedTax: number;
  effectiveTaxRate: number;
  fiscalYear: number;
  companyName?: string;
  onOptimize: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

export function TaxHeroCard({ corporateTax, optimizedTax, effectiveTaxRate, fiscalYear, companyName, onOptimize }: TaxHeroCardProps) {
  const saving = Math.max(0, corporateTax - optimizedTax);
  const hasOptimization = saving > 1000;

  return (
    <div className="rounded-[12px] bg-[#0F1F3D] p-6 text-white">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
            <Sparkles className="h-3.5 w-3.5" />
            Bolagsskatt {fiscalYear}{companyName ? ` · ${companyName}` : ""}
          </div>
          <div className="text-5xl font-bold tabular-nums tracking-tight">
            {fmt(corporateTax)} <span className="text-3xl text-white/70">kr</span>
          </div>
          <div className="text-sm text-white/70">
            Effektiv skattesats: <span className="font-semibold text-white">{effectiveTaxRate.toFixed(1)} %</span> · Nominell 20,6 %
          </div>
          {hasOptimization && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/40 px-3 py-1.5 text-sm">
              <TrendingDown className="h-4 w-4 text-[#BFE6D6]" />
              <span className="text-[#BFE6D6]">
                Du kan minska detta till <span className="font-bold text-white">{fmt(optimizedTax)} kr</span>
                <span className="text-[#BFE6D6]/80"> (−{fmt(saving)} kr)</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex lg:justify-end">
          <Button
            onClick={onOptimize}
            disabled={!hasOptimization}
            className="bg-white hover:bg-white/90 text-[#0F1F3D] font-semibold disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {hasOptimization ? "Optimera skatt" : "Inga optimeringar"}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
