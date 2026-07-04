import { useState } from "react";
import { Check, AlertCircle, HelpCircle, ThumbsUp, ThumbsDown, Sparkles, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AITier = "done" | "review" | "input_needed";

export function tierFromConfidence(confidence: number): AITier {
  if (confidence >= 0.9) return "done";
  if (confidence >= 0.6) return "review";
  return "input_needed";
}

export interface AIActionStatusProps {
  /** 0..1 */
  confidence: number;
  /** Plain-language one-sentence: what AI did or recommends */
  recommendation: string;
  /** One-sentence "why" */
  reasoning: string;
  /** What's missing (only used for input_needed tier) */
  missingHint?: string;
  /** Module tag for logging, e.g. "transactions" | "invoice_matching" | "vat" | "journal" */
  module: string;
  actionKind: string;
  companyId?: string | null;
  referenceId?: string;
  counterpartyKey?: string;
  aiRecommendation?: Record<string, unknown>;
  /** Tier-specific actions */
  onApprove?: () => void | Promise<void>;
  onEdit?: () => void;
  onGuide?: () => void;
  className?: string;
  /** Compact mode renders a single inline row (no buttons block) */
  compact?: boolean;
}

const TIER_STYLES: Record<AITier, { badge: string; icon: typeof Check; label: string; ring: string }> = {
  done: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Check,
    label: "Klar",
    ring: "border-emerald-200 bg-emerald-50/40",
  },
  review: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertCircle,
    label: "Granska",
    ring: "border-amber-200 bg-amber-50/40",
  },
  input_needed: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: HelpCircle,
    label: "Behöver input",
    ring: "border-rose-200 bg-rose-50/40",
  },
};

export function AIActionStatus({
  confidence,
  recommendation,
  reasoning,
  missingHint,
  module,
  actionKind,
  companyId,
  referenceId,
  counterpartyKey,
  aiRecommendation,
  onApprove,
  onEdit,
  onGuide,
  className,
  compact = false,
}: AIActionStatusProps) {
  const tier = tierFromConfidence(confidence);
  const styles = TIER_STYLES[tier];
  const Icon = styles.icon;
  const pct = Math.round(confidence * 100);
  const [feedback, setFeedback] = useState<null | "yes" | "no">(null);
  const [memoryNote, setMemoryNote] = useState<string | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correction, setCorrection] = useState("");
  const [correctionSent, setCorrectionSent] = useState(false);
  const [feedbackRowId, setFeedbackRowId] = useState<string | null>(null);

  const sendFeedback = async (correct: boolean) => {
    setFeedback(correct ? "yes" : "no");
    if (!correct) setCorrectionOpen(true);
    if (!companyId) return;
    try {
      const { data } = await supabase.from("ai_action_feedback" as never).insert({
        company_id: companyId,
        module,
        action_kind: actionKind,
        reference_id: referenceId ?? null,
        counterparty_key: counterpartyKey ?? null,
        ai_recommendation: aiRecommendation ?? { recommendation },
        ai_reasoning: reasoning,
        ai_confidence: confidence,
        ai_tier: tier,
        was_correct: correct,
      } as never).select("id").maybeSingle();
      if (data && (data as { id?: string }).id) setFeedbackRowId((data as { id: string }).id);
      if (correct && counterpartyKey) {
        setMemoryNote(`Jag kommer ihåg detta för framtida transaktioner från ${counterpartyKey}.`);
      }
    } catch (e) {
      // non-blocking
      console.warn("ai feedback insert failed", e);
    }
  };

  const submitCorrection = async () => {
    const text = correction.trim();
    if (!text) { setCorrectionOpen(false); return; }
    setCorrectionSent(true);
    setCorrectionOpen(false);
    try {
      if (feedbackRowId) {
        await supabase
          .from("ai_action_feedback" as never)
          .update({ user_correction: { text } } as never)
          .eq("id", feedbackRowId);
      }
      toast({ title: "Tack för rättelsen", description: "Jag tillämpar detta för liknande framöver." });
    } catch (e) {
      console.warn("correction update failed", e);
    }
  };

  return (
    <div className={cn("rounded-lg border-[0.5px] p-3 space-y-2 text-[12px]", styles.ring, className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border-[0.5px]",
            styles.badge,
          )}
        >
          <Icon className="h-3 w-3" />
          {styles.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600">
          <Sparkles className="h-3 w-3" /> {pct}%
        </span>
        <span className="text-slate-700 font-medium truncate">{recommendation}</span>
      </div>

      {!compact && (
        <p className="text-[11px] text-slate-600 leading-snug">
          <span className="font-medium text-slate-500">Varför:</span> {reasoning}
        </p>
      )}

      {tier === "input_needed" && missingHint && !compact && (
        <p className="text-[11px] text-rose-700 leading-snug">
          <span className="font-medium">Saknas:</span> {missingHint}
        </p>
      )}

      {!compact && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {tier === "review" && (
              <>
                {onApprove && (
                  <Button size="sm" className="h-7 px-2.5 text-[11px]" onClick={onApprove}>
                    <Check className="h-3 w-3 mr-1" />
                    Godkänn
                  </Button>
                )}
                {onEdit && (
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px]" onClick={onEdit}>
                    <Edit2 className="h-3 w-3 mr-1" />
                    Redigera
                  </Button>
                )}
              </>
            )}
            {tier === "input_needed" && onGuide && (
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px]" onClick={onGuide}>
                Visa fält
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>Var detta rätt?</span>
            <button
              type="button"
              onClick={() => sendFeedback(true)}
              disabled={feedback !== null}
              className={cn(
                "h-6 w-6 rounded-md border-[0.5px] inline-flex items-center justify-center transition-colors",
                feedback === "yes"
                  ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50",
              )}
              aria-label="Ja, rätt"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => sendFeedback(false)}
              disabled={feedback !== null}
              className={cn(
                "h-6 w-6 rounded-md border-[0.5px] inline-flex items-center justify-center transition-colors",
                feedback === "no"
                  ? "bg-rose-100 border-rose-300 text-rose-700"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50",
              )}
              aria-label="Nej, fel"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {correctionOpen && (
        <div className="flex items-center gap-2 pt-1 border-t-[0.5px] border-rose-200">
          <input
            autoFocus
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitCorrection(); }}
            placeholder="Vad borde jag ha gjort i stället?"
            className="flex-1 h-7 px-2 text-[11px] rounded-md border-[0.5px] border-rose-200 bg-white focus:outline-none focus:border-rose-400"
          />
          <Button size="sm" className="h-7 px-2 text-[11px]" onClick={submitCorrection}>Skicka</Button>
        </div>
      )}

      {correctionSent && !correctionOpen && (
        <p className="text-[10px] text-slate-600 italic pt-1 border-t-[0.5px] border-slate-200">
          Tack — jag tillämpar din rättelse för liknande framöver.
        </p>
      )}

      {memoryNote && (
        <p className="text-[10px] text-emerald-700 italic pt-1 border-t-[0.5px] border-emerald-200">
          {memoryNote}
        </p>
      )}
    </div>
  );
}

/** Compact inline pill for table rows */
export function AIStatusBadge({ confidence, label }: { confidence: number; label?: string }) {
  const tier = tierFromConfidence(confidence);
  const styles = TIER_STYLES[tier];
  const Icon = styles.icon;
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border-[0.5px] tabular-nums",
        styles.badge,
      )}
      title={`${styles.label} • ${pct}%`}
    >
      <Icon className="h-3 w-3" />
      {label ?? styles.label} · {pct}%
    </span>
  );
}
