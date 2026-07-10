import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, X, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AIVerdictHeader } from "./AIVerdictHeader";
import { IssueSummaryGrid } from "./IssueSummaryGrid";
import { FindingCard } from "./FindingCard";
import { ConfidenceBreakdown } from "./ConfidenceBreakdown";
import { FinalRecommendation } from "./FinalRecommendation";
import { AIActionStatus } from "@/components/ai/AIActionStatus";
import {
  runVATRuleChecks, calculateConfidenceBreakdown, calculateOverallConfidence,
  deriveVerdict, deriveRecommendation,
  type VATFinding, type VATSnapshot, type ConfidenceBreakdown as CB,
} from "@/lib/vat/vatReviewEngine";

interface AIReviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vatData: VATSnapshot | null;
  previousData?: VATSnapshot | null;
  overrides?: Record<string, number>;
  periodLabel: string;
  companyId: string | null;
  onDrillDown?: (box: string) => void;
}

interface ReviewResult {
  verdict: "correct" | "review" | "critical";
  summary: string;
  confidence: number;
  findings: VATFinding[];
  confidenceBreakdown: CB;
  recommendation: "ready" | "review" | "do_not_submit";
  reasoning?: string;
  modelUsed?: string;
}

export function AIReviewPanel({
  open, onOpenChange, vatData, previousData, overrides, periodLabel, companyId, onDrillDown,
}: AIReviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [filter, setFilter] = useState<VATFinding["severity"] | null>(null);

  // Compute deterministic baseline always (works even if LLM fails)
  const deterministic = useMemo<ReviewResult | null>(() => {
    if (!vatData) return null;
    const findings = runVATRuleChecks({ current: vatData, previous: previousData, overrides });
    const cb = calculateConfidenceBreakdown(findings, !!previousData);
    const conf = calculateOverallConfidence(cb, !!previousData);
    const verdict = deriveVerdict(findings);
    return {
      verdict,
      summary: findings.length === 0
        ? "Inga avvikelser hittade i deterministisk granskning. Strukturen ser konsistent ut."
        : `${findings.length} observation${findings.length === 1 ? "" : "er"} identifierade — granska nedan.`,
      confidence: conf,
      findings,
      confidenceBreakdown: cb,
      recommendation: deriveRecommendation(verdict),
    };
  }, [vatData, previousData, overrides]);

  // Auto-load deterministic on open
  useEffect(() => {
    if (open && !result && deterministic) {
      setResult(deterministic);
    }
  }, [open, deterministic, result]);

  const runFullAIReview = async () => {
    if (!vatData || !companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vat-ai-review", {
        body: { vatData, previousData, overrides, periodLabel, companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as ReviewResult);
      toast.success("AI-granskning klar");
    } catch (e: any) {
      console.error("vat-ai-review failed:", e);
      // Fallback to deterministic
      if (deterministic) {
        setResult({ ...deterministic, summary: deterministic.summary + " (AI-resonemang ej tillgängligt)" });
      }
      toast.error(e.message || "AI-granskning misslyckades — visar regelbaserad granskning");
    } finally {
      setLoading(false);
    }
  };

  const filteredFindings = result?.findings.filter((f) => !filter || f.severity === filter) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-border overflow-hidden flex flex-col"
      >
        {/* Sticky header */}
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#0052FF] flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">AI Momsgranskning</h2>
                <p className="text-xs text-muted-foreground">{periodLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={runFullAIReview} disabled={loading} className="gap-1.5 h-8">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                {loading ? "Granskar..." : "Kör AI"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {!vatData && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Ingen momsdata att granska. Kör momsberäkning först.
            </div>
          )}

          {result && (
            <>
              {/* SECTION 1 — Verdict */}
              <AIVerdictHeader
                verdict={result.verdict}
                summary={result.summary}
                confidence={result.confidence}
              />
              <AIActionStatus
                confidence={(result.confidence ?? 0) > 1 ? (result.confidence ?? 0) / 100 : (result.confidence ?? 0)}
                recommendation={result.recommendation || result.summary}
                reasoning={result.reasoning || "Baserat på momsklassificering, historiska perioder och konteringsmönster."}
                missingHint={result.findings?.find?.((f: { severity: string }) => f.severity === "error")?.title}
                module="vat"
                actionKind="vat_classification"
                aiRecommendation={{ verdict: result.verdict, summary: result.summary }}
              />

              {/* SECTION 2 — Issue summary */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Sammanfattning</h3>
                <IssueSummaryGrid
                  findings={result.findings}
                  activeFilter={filter}
                  onFilterChange={setFilter}
                />
              </div>

              {/* SECTION 3 — Findings list */}
              {filteredFindings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {filter ? `Filtrerat (${filteredFindings.length})` : `Alla observationer (${result.findings.length})`}
                  </h3>
                  <div className="space-y-2">
                    {filteredFindings.map((f) => (
                      <FindingCard
                        key={f.id}
                        finding={f}
                        onReview={(fd) => fd.affectedBox && onDrillDown?.(fd.affectedBox)}
                        onMarkCorrect={() => toast.success("Markerad som korrekt")}
                        onIgnore={() => toast.info("Ignorerad — kommer inte visas igen")}
                      />
                    ))}
                  </div>
                </div>
              )}

              {result.findings.length === 0 && (
                <div className="text-center py-8 text-sm text-[#085041] dark:text-[#1D9E75] bg-[#E1F5EE]/50 dark:bg-emerald-950/20 rounded-xl border border-[#BFE6D6] dark:border-emerald-900/50">
                  ✓ Inga observationer — strukturen ser korrekt ut
                </div>
              )}

              {/* SECTION 6 — Confidence breakdown */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Konfidensanalys</h3>
                <ConfidenceBreakdown breakdown={result.confidenceBreakdown} hasHistory={!!previousData} />
              </div>

              {/* SECTION 7 — Final recommendation */}
              <FinalRecommendation recommendation={result.recommendation} reasoning={result.reasoning} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
