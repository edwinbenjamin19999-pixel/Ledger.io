/**
 * Side-by-side comparison of three tax scenarios.
 */
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Equal, Zap } from "lucide-react";
import type { TaxEngineResult } from "@/lib/tax/taxEngine";

interface ScenarioComparisonProps {
  current: TaxEngineResult;
  optimized: TaxEngineResult;
  aggressive: TaxEngineResult;
}

const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

interface CardSpec {
  label: string;
  result: TaxEngineResult;
  baseline: number;
  headerBg: string;
  borderColor: string;
  icon: React.ElementType;
  tone: "neutral" | "good" | "best";
}

function ScenarioCard({ label, result, baseline, headerBg, borderColor, icon: Icon, tone }: CardSpec) {
  const delta = baseline - result.corporateTax;
  const pct = baseline > 0 ? (delta / baseline) * 100 : 0;

  return (
    <Card className={`rounded-[12px] border-[0.5px] ${borderColor} overflow-hidden bg-white`}>
      <div className={`${headerBg} px-4 py-2.5 flex items-center gap-2`}>
        <Icon className="h-4 w-4 text-white" />
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="text-3xl font-bold tabular-nums text-[#0F1F3D]">{fmt(result.corporateTax)} <span className="text-base text-[#64748B]">kr</span></div>
        {tone !== "neutral" && delta > 0 ? (
          <div className="text-xs text-[#085041] font-medium">
            −{fmt(delta)} kr ({pct.toFixed(1)} %)
          </div>
        ) : tone === "neutral" ? (
          <div className="text-xs text-[#64748B]">Baseline</div>
        ) : (
          <div className="text-xs text-[#64748B]">Inget att vinna</div>
        )}
        <div className="pt-2 border-t border-[#E2E8F0] space-y-0.5 text-[11px] text-[#64748B]">
          <div className="flex justify-between"><span>Skattem. resultat</span><span className="font-mono text-[#0F1F3D]">{fmt(result.finalTaxableIncome)} kr</span></div>
          <div className="flex justify-between"><span>Periodiseringsfond</span><span className="font-mono text-[#0F1F3D]">{fmt(result.appliedPeriodiseringsfond)} kr</span></div>
          <div className="flex justify-between"><span>Effektiv sats</span><span className="font-mono text-[#0F1F3D]">{result.effectiveTaxRate.toFixed(1)} %</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScenarioComparison({ current, optimized, aggressive }: ScenarioComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ScenarioCard label="Nuvarande" result={current} baseline={current.corporateTax} headerBg="bg-[#1E3A5F]" borderColor="border-[#E2E8F0]" icon={Equal} tone="neutral" />
      <ScenarioCard label="Optimerad" result={optimized} baseline={current.corporateTax} headerBg="bg-[#1D9E75]" borderColor="border-[#BFE6D6]" icon={TrendingDown} tone="good" />
      <ScenarioCard label="Aggressiv" result={aggressive} baseline={current.corporateTax} headerBg="bg-[#0F1F3D]" borderColor="border-[#C8DDF5]" icon={Zap} tone="best" />
    </div>
  );
}
