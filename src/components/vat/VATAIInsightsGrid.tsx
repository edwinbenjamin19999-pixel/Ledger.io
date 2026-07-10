/**
 * VAT AI Insights Grid — premium 2-column AI advisory layer.
 * Wraps existing `findings` from runVATRuleChecks. Does NOT recompute or change values.
 */
import { AlertTriangle, AlertCircle, Lightbulb, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { VATFinding } from "@/lib/vat/vatReviewEngine";

interface VATAIInsightsGridProps {
  findings: VATFinding[];
  loading?: boolean;
  onOpenSource?: (finding: VATFinding) => void;
  onSuggestFix?: (finding: VATFinding) => void;
}

const SEV_META = {
  critical: {
    icon: AlertTriangle,
    iconBg: "bg-[#FCE8E8] text-[#C73838] dark:bg-rose-950/50 dark:text-[#C73838]",
    chip: "bg-[#C73838] text-white",
    impact: "text-[#C73838] dark:text-[#C73838]",
    label: "Kritisk",
  },
  high: {
    icon: AlertCircle,
    iconBg: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-950/50 dark:text-[#C28A2B]",
    chip: "bg-[#C28A2B] text-white",
    impact: "text-[#7A5417] dark:text-[#C28A2B]",
    label: "Hög",
  },
  medium: {
    icon: AlertCircle,
    iconBg: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-950/30 dark:text-[#C28A2B]",
    chip: "bg-[#C28A2B] text-slate-900",
    impact: "text-[#7A5417] dark:text-[#C28A2B]",
    label: "Granska",
  },
  info: {
    icon: Lightbulb,
    iconBg: "bg-[#EFF6FF] text-[#1E3A5F] dark:bg-blue-950/30 dark:text-[#1E3A5F]",
    chip: "bg-[#0052FF] text-white",
    impact: "text-[#1E3A5F] dark:text-[#1E3A5F]",
    label: "Tips",
  },
} as const;

export function VATAIInsightsGrid({ findings, loading, onOpenSource, onSuggestFix }: VATAIInsightsGridProps) {
  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#C28A2B]" />
          <h2 className="text-lg font-semibold text-foreground">AI granskar din moms</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  const order = { critical: 0, high: 1, medium: 2, info: 3 } as const;
  const sorted = [...findings].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0052FF] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">AI granskar din moms</h2>
          {sorted.length > 0 && (
            <span className="text-xs text-muted-foreground">· {sorted.length} {sorted.length === 1 ? "observation" : "observationer"}</span>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-[#BFE6D6] dark:border-emerald-900 bg-[#E1F5EE]/60 dark:bg-emerald-950/20 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#1D9E75] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-semibold text-[#085041] dark:text-emerald-100">Allt ser rent ut</div>
            <div className="text-sm text-[#085041] dark:text-emerald-300/80 mt-0.5">
              AI har granskat momsen för perioden — inga avvikelser hittades. Redo för inlämning.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map(f => {
            const meta = SEV_META[f.severity];
            const Icon = meta.icon;
            const impact = Math.abs(f.financialImpact || 0);
            return (
              <article
                key={f.id}
                className={cn(
                  "rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800",
                  "p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
                  "flex flex-col gap-3"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", meta.iconBg)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", meta.chip)}>
                          {meta.label}
                        </span>
                        {f.affectedBox && (
                          <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Ruta {f.affectedBox}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm text-foreground mt-1.5 leading-snug">{f.title}</h3>
                    </div>
                  </div>
                </div>

                <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">{f.explanation}</p>

                {impact > 0 && (
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Påverkan</span>
                    <span className={cn("text-xl font-bold font-mono tabular-nums", meta.impact)}>
                      {formatSEK(impact)}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-50 dark:border-slate-800">
                  {f.affectedBox && onOpenSource && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => onOpenSource(f)}
                    >
                      Granska transaktioner
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                  {onSuggestFix && f.suggestedFix && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => onSuggestFix(f)}
                    >
                      <Sparkles className="w-3 h-3" />
                      Föreslå korrigering
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
