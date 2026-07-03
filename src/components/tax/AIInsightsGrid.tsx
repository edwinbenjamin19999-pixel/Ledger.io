/**
 * 2-column AI recommendation grid (standardized info cards).
 */
import { Sparkles, AlertTriangle, Lightbulb, TrendingDown, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recommendation, RiskLevel } from "@/lib/tax/aiOptimizer";

interface AIInsightsGridProps {
  recommendations: Recommendation[];
  appliedTypes: Set<string>;
  onApply: (rec: Recommendation) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

const riskTone: Record<RiskLevel, { dot: string; label: string }> = {
  low: { dot: "bg-[#1D9E75]", label: "Låg risk" },
  medium: { dot: "bg-[#C28A2B]", label: "Medel" },
  high: { dot: "bg-[#C73838]", label: "Granska" },
};

function iconFor(rec: Recommendation) {
  if (rec.savingKr === 0) return AlertTriangle;
  if (rec.type === "maximize_pfond" || rec.type === "use_loss_carryforward") return TrendingDown;
  return Lightbulb;
}

export function AIInsightsGrid({ recommendations, appliedTypes, onApply }: AIInsightsGridProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0F1F3D] flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#1E3A5F]" />
          AI rekommenderar
        </h2>
        <span className="text-xs text-[#64748B]">
          {recommendations.length} {recommendations.length === 1 ? "förslag" : "förslag"}
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="rounded-[12px] border-[0.5px] border-[#BFE6D6] bg-[#E1F5EE] p-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#1D9E75]/15 flex items-center justify-center">
            <Check className="h-5 w-5 text-[#085041]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0F1F3D]">Skatten är redan optimerad</div>
            <div className="text-xs text-[#64748B]">Inga uppenbara avdrag eller fonder att utnyttja för året — eller bokför mer data för att få fler rekommendationer.</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => {
            const Icon = iconFor(rec);
            const applied = appliedTypes.has(rec.type);
            const isInfo = rec.savingKr === 0;
            const tone = riskTone[rec.riskLevel];

            return (
              <div
                key={rec.type}
                className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-5 transition-colors hover:border-[#C8DDF5]"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 ${isInfo ? "bg-[#FAEEDA] text-[#7A5417]" : "bg-[#EFF6FF] text-[#1E3A5F]"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#0F1F3D] leading-snug">{rec.title}</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B]">
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                        {tone.label}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#64748B] leading-relaxed mb-4 line-clamp-3">
                  {rec.explanation}
                </p>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-medium">
                      {isInfo ? "Potentiell" : "Skattebesparing"}
                    </div>
                    <div className={`text-2xl font-bold tabular-nums tracking-tight ${isInfo ? "text-[#7A5417]" : "text-[#085041]"}`}>
                      {isInfo ? "" : "−"}{fmt(rec.savingKr)} <span className="text-sm font-semibold text-[#94A3B8]">kr</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={applied ? "outline" : "default"}
                    disabled={applied || isInfo}
                    onClick={() => onApply(rec)}
                    className={applied ? "shrink-0" : "shrink-0 bg-[#0F1F3D] hover:bg-[#1E3A5F] text-white"}
                  >
                    {applied ? (
                      <><Check className="h-3.5 w-3.5 mr-1" />Tillämpad</>
                    ) : isInfo ? (
                      <>Granska<ArrowRight className="h-3.5 w-3.5 ml-1" /></>
                    ) : (
                      <>Applicera<ArrowRight className="h-3.5 w-3.5 ml-1" /></>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
