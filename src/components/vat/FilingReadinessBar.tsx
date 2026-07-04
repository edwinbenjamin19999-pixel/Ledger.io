import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, Send, Lock, AlertTriangle, CheckCircle2, Wallet, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface FilingReadinessBarProps {
  vatPayable: number;
  confidence: number | null;
  unresolvedCount: number;
  hasCriticalIssues: boolean;
  hasOverrides: boolean;
  /** Status drives which execution buttons are visible */
  status?: "draft" | "ai_reviewed" | "review_required" | "ready" | "filed" | "settled" | "paid" | "refunded" | "closed";
  /** When 'dialog', the parent handles the submit confirmation (e.g. BankID/XML chooser). */
  submitMode?: "confirm" | "dialog";
  onReviewAI: () => void;
  onSaveDraft: () => void;
  onSubmit: () => Promise<void> | void;
  onBookSettlement?: () => void;
  onRegisterPayment?: () => void;
}

export function FilingReadinessBar({
  vatPayable, confidence, unresolvedCount, hasCriticalIssues, hasOverrides,
  status = "draft",
  submitMode = "confirm",
  onReviewAI, onSaveDraft, onSubmit, onBookSettlement, onRegisterPayment,
}: FilingReadinessBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const isOwing = vatPayable >= 0;

  const confColor = confidence === null ? "bg-slate-400" : confidence >= 85 ? "bg-[#1D9E75]" : confidence >= 60 ? "bg-[#C28A2B]" : "bg-[#C73838]";
  const confText = confidence === null ? "text-slate-600" : confidence >= 85 ? "text-[#085041] dark:text-[#1D9E75]" : confidence >= 60 ? "text-[#7A5417] dark:text-[#C28A2B]" : "text-[#7A1A1A] dark:text-[#C73838]";

  const blockSubmit = hasCriticalIssues;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-border shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.12)]">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
          {/* Left: financial summary */}
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Moms att {isOwing ? "betala" : "återfå"}
              </div>
              <div className={cn(
                "text-lg font-bold font-mono tabular-nums leading-tight",
                isOwing ? "text-[#C73838] dark:text-[#C73838]" : "text-[#1D9E75] dark:text-[#1D9E75]"
              )}>
                {formatSEK(Math.abs(vatPayable))}
              </div>
            </div>

            {/* Confidence pill */}
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", confColor)} />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Konfidens</div>
                <div className={cn("text-sm font-mono font-bold tabular-nums leading-tight", confText)}>
                  {confidence === null ? "—" : `${confidence}%`}
                </div>
              </div>
            </div>

            {/* Unresolved */}
            {unresolvedCount > 0 && (
              <Badge variant="outline" className={cn(
                "gap-1.5 font-medium",
                hasCriticalIssues
                  ? "border-[#F4C8C8] text-[#7A1A1A] dark:border-rose-700 dark:text-[#C73838]"
                  : "border-[#F0DDB7] text-[#7A5417] dark:border-amber-700 dark:text-[#C28A2B]"
              )}>
                <AlertTriangle className="w-3 h-3" />
                {unresolvedCount} olöst{unresolvedCount === 1 ? "" : "a"}
              </Badge>
            )}

            {/* Overrides indicator */}
            {hasOverrides && (
              <Badge variant="outline" className="gap-1.5 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-[#1E3A5F]">
                <Lock className="w-3 h-3" /> Justerad
              </Badge>
            )}

            {/* Ready badge */}
            {!hasCriticalIssues && unresolvedCount === 0 && confidence !== null && confidence >= 85 && (
              <Badge className="gap-1.5 bg-[#1D9E75] hover:bg-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Redo
              </Badge>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={onReviewAI} className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Granska med AI
            </Button>
            <Button size="sm" variant="outline" onClick={onSaveDraft} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              Spara utkast
            </Button>

            {/* Settlement — visible after filing or when ready */}
            {onBookSettlement && (status === "filed" || status === "ready" || status === "ai_reviewed") && (
              <Button
                size="sm"
                variant="outline"
                onClick={onBookSettlement}
                className="gap-1.5 border-[#F0DDB7] text-[#7A5417] hover:bg-[#FAEEDA] dark:border-amber-700 dark:text-[#C28A2B] dark:hover:bg-amber-950/30"
              >
                <Wallet className="w-3.5 h-3.5" />
                Bokför momsavräkning
              </Button>
            )}

            {/* Payment — visible after settlement is booked */}
            {onRegisterPayment && (status === "settled" || status === "filed") && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRegisterPayment}
                className="gap-1.5 border-[#BFE6D6] text-[#085041] hover:bg-[#E1F5EE] dark:border-emerald-700 dark:text-[#1D9E75] dark:hover:bg-emerald-950/30"
              >
                <Receipt className="w-3.5 h-3.5" />
                {vatPayable >= 0 ? "Registrera betalning" : "Registrera återbetalning"}
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => {
                if (submitMode === "dialog") {
                  void onSubmit();
                } else {
                  setShowConfirm(true);
                }
              }}
              disabled={blockSubmit || status === "filed" || status === "settled" || status === "paid" || status === "refunded"}
              className={cn(
                "gap-1.5 shadow-md",
                blockSubmit
                  ? "bg-slate-400 hover:bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#1E3A5F] to-[#0F1F3D] hover:from-[#3b82f6] hover:to-[#3b82f6]"
              )}
              title={blockSubmit ? "Lös kritiska problem innan inlämning" : undefined}
            >
              <Send className="w-3.5 h-3.5" />
              {status === "filed" || status === "settled" || status === "paid" || status === "refunded" ? "Inskickad" : "Skicka in"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Bekräfta inlämning av momsdeklaration"
        description={
          unresolvedCount > 0
            ? `Det finns ${unresolvedCount} olöst${unresolvedCount === 1 ? "" : "a"} observation${unresolvedCount === 1 ? "" : "er"}. Vill du ändå skicka in deklarationen till Skatteverket?`
            : "Du är på väg att skicka in momsdeklarationen till Skatteverket. Detta går inte att ångra."
        }
        confirmLabel="Skicka in"
        variant={unresolvedCount > 0 ? "warning" : "destructive"}
        onConfirm={onSubmit}
      />
    </>
  );
}
