/**
 * Lists AI tax-optimization recommendations.
 */
import { Sparkles, Check, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Recommendation, RiskLevel } from "@/lib/tax/aiOptimizer";

interface AIOptimizationPanelProps {
  recommendations: Recommendation[];
  onApply: (rec: Recommendation) => void;
  appliedTypes: Set<string>;
}

const riskMeta: Record<RiskLevel, { label: string; classes: string }> = {
  low:    { label: "Låg risk",   classes: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
  medium: { label: "Medel risk", classes: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]" },
  high:   { label: "Hög risk",   classes: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]" },
};

const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

export function AIOptimizationPanel({ recommendations, onApply, appliedTypes }: AIOptimizationPanelProps) {
  if (recommendations.length === 0) {
    return (
      <Card className="rounded-[12px] border-[0.5px] border-[#BFE6D6] bg-[#E1F5EE]">
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-[#085041]" />
          <div>
            <div className="font-semibold text-[#0F1F3D] text-sm">Skatt redan optimerad</div>
            <div className="text-xs text-[#64748B]">Inga uppenbara avdrag eller fonder att utnyttja för året.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-[#0F1F3D]">
          <Sparkles className="h-4 w-4 text-[#1E3A5F]" />
          AI-skatteoptimering
          <Badge variant="outline" className="ml-1 text-[10px] border-[#E2E8F0] text-[#64748B]">{recommendations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {recommendations.map((r) => {
          const applied = appliedTypes.has(r.type);
          const isInfoOnly = r.savingKr === 0;
          return (
            <div
              key={r.type}
              className="flex items-start gap-3 rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white p-3.5 hover:border-[#C8DDF5] transition-colors"
            >
              <div className="mt-0.5">
                {isInfoOnly ? <AlertCircle className="h-4 w-4 text-[#C28A2B]" /> : <ChevronRight className="h-4 w-4 text-[#1E3A5F]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-[#0F1F3D]">{r.title}</span>
                  <Badge variant="outline" className={`text-[10px] ${riskMeta[r.riskLevel].classes}`}>
                    {riskMeta[r.riskLevel].label}
                  </Badge>
                  {!isInfoOnly && (
                    <Badge variant="outline" className="text-[10px] bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] font-mono">
                      −{fmt(r.savingKr)} kr
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">{r.explanation}</p>
              </div>
              <Button
                size="sm"
                variant={applied ? "outline" : "default"}
                disabled={applied || isInfoOnly}
                onClick={() => onApply(r)}
                className={applied ? "shrink-0" : "shrink-0 bg-[#0F1F3D] hover:bg-[#1E3A5F] text-white"}
              >
                {applied ? <><Check className="h-3.5 w-3.5 mr-1" />Tillämpad</> : isInfoOnly ? "Granska" : "Tillämpa"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
