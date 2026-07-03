import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Eye, Wand2, CheckCircle2, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { VATFinding } from "@/lib/vat/vatReviewEngine";

interface FindingCardProps {
  finding: VATFinding;
  onReview?: (f: VATFinding) => void;
  onApplyFix?: (f: VATFinding) => void;
  onMarkCorrect?: (f: VATFinding) => void;
  onIgnore?: (f: VATFinding) => void;
}

const SEVERITY_STYLES = {
  critical: { dot: "bg-[#C73838]", border: "border-l-rose-500", text: "text-[#7A1A1A] dark:text-[#C73838]" },
  high: { dot: "bg-orange-500", border: "border-l-orange-500", text: "text-orange-700 dark:text-orange-400" },
  medium: { dot: "bg-[#C28A2B]", border: "border-l-amber-500", text: "text-[#7A5417] dark:text-[#C28A2B]" },
  info: { dot: "bg-[#1D9E75]", border: "border-l-emerald-500", text: "text-[#085041] dark:text-[#1D9E75]" },
};

export function FindingCard({ finding, onReview, onApplyFix, onMarkCorrect, onIgnore }: FindingCardProps) {
  const [open, setOpen] = useState(false);
  const s = SEVERITY_STYLES[finding.severity];

  return (
    <div className={cn("bg-card rounded-xl border border-border border-l-4 shadow-sm overflow-hidden", s.border)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <div className="flex items-start gap-3">
            <span className={cn("w-2 h-2 rounded-full mt-2 shrink-0", s.dot)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{finding.title}</span>
                {finding.affectedBox && (
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                    Ruta {finding.affectedBox}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {finding.financialImpact !== 0 && (
                  <span className={cn("font-mono tabular-nums font-semibold", s.text)}>
                    ~{formatSEK(Math.abs(finding.financialImpact))}
                  </span>
                )}
                <span>Konfidens: {finding.confidence}%</span>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1", open && "rotate-180")} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/50">
            <p className="text-sm text-foreground/80 leading-relaxed">{finding.explanation}</p>

            {finding.suggestedFix && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-foreground/70">
                <span className="font-semibold text-foreground">Förslag: </span>
                {finding.suggestedFix}
              </div>
            )}

            {/* Confidence bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Konfidens</span>
                <span className="tabular-nums">{finding.confidence}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", s.dot)}
                  style={{ width: `${finding.confidence}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onReview?.(finding)}>
                <Eye className="w-3 h-3" /> Granska
              </Button>
              {finding.suggestedFix && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onApplyFix?.(finding)}>
                  <Wand2 className="w-3 h-3" /> Tillämpa
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onMarkCorrect?.(finding)}>
                <CheckCircle2 className="w-3 h-3" /> Korrekt
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => onIgnore?.(finding)}>
                <EyeOff className="w-3 h-3" /> Ignorera
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
