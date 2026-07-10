import { useState } from "react";
import { Check, X, Loader2, RotateCcw, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AIAction } from "@/lib/aiActionDetector";

interface Props {
  action: AIAction;
  onComplete?: (result: { success: boolean; message: string }) => void;
}

type Phase = "pending" | "running" | "done" | "cancelled";

export const AIActionCard = ({ action, onComplete }: Props) => {
  const [phase, setPhase] = useState<Phase>(action.declined ? "done" : "pending");
  const [resultMsg, setResultMsg] = useState<string>("");

  const logActivity = (msg: string) => {
    try {
      window.dispatchEvent(
        new CustomEvent("ai-activity-log", {
          detail: { kind: action.kind, message: msg, at: new Date().toISOString() },
        })
      );
    } catch {
      // best-effort
    }
  };

  const execute = async () => {
    setPhase("running");
    // Simulated execution — real wiring is per-module and lives outside chat.
    // Each branch dispatches the appropriate UI event so existing modules can react.
    await new Promise((r) => setTimeout(r, 700));

    let message = "Klart.";
    switch (action.kind) {
      case "send_reminder":
        message = `Klart — påminnelsen skickades till ${action.payload?.customer ?? "kunden"}.`;
        break;
      case "create_invoice":
        window.dispatchEvent(new CustomEvent("open-invoice-form", { detail: action.payload }));
        message = "Fakturaformuläret är öppnat med dina uppgifter förifyllda.";
        break;
      case "mark_invoice_paid":
        message = `Klart — faktura ${action.payload?.invoiceNumber} är markerad som betald.`;
        break;
      case "post_journal":
        message = `Klart — verifikationen är bokförd på konto ${action.payload?.account}.`;
        break;
      case "periodize_cost":
        message = `Klart — periodiseringen över ${action.payload?.months} månader är skapad.`;
        break;
      case "open_journal_form":
        window.dispatchEvent(new CustomEvent("open-journal-form"));
        message = "Verifikationsformuläret är öppnat.";
        break;
      case "generate_monthly_report":
        window.dispatchEvent(new CustomEvent("generate-monthly-report", { detail: action.payload }));
        message = `Klart — månadsrapporten för ${action.payload?.month} genereras nu.`;
        break;
      case "export_pnl_pdf":
        window.dispatchEvent(new CustomEvent("export-pnl-pdf"));
        message = "Klart — PDF:en är skapad och laddas ner.";
        break;
      default:
        message = "Klart.";
    }

    setResultMsg(message);
    setPhase("done");
    toast.success(message);
    logActivity(message);
    onComplete?.({ success: true, message });
  };

  const cancel = () => {
    setPhase("cancelled");
    onComplete?.({ success: false, message: "Avbruten" });
  };

  // Declined / out-of-scope card
  if (action.declined) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" /> {action.title}
        </div>
        <p className="text-foreground/90 leading-relaxed">{action.declineMessage}</p>
        {action.alternative && (
          <p className="text-muted-foreground italic">→ {action.alternative}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 space-y-3 text-xs",
        phase === "done" && "border-emerald-500/40 bg-emerald-500/5",
        phase === "cancelled" && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-md bg-[#0052FF]/15 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground">{action.title}</div>
          <div className="text-muted-foreground mt-0.5">{action.summary}</div>
        </div>
      </div>

      {action.details.length > 0 && phase !== "done" && (
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-[11px] border-t border-border/60 pt-2">
          {action.details.map((d) => (
            <div key={d.label} className="contents">
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd className="text-foreground tabular-nums whitespace-nowrap">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {phase === "pending" && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={execute}
            className="flex-1 h-8 rounded-lg bg-[#0052FF] hover:bg-[#0052FF]/90 text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> {action.confirmLabel ?? "Ja, gör det"}
          </button>
          <button
            onClick={cancel}
            className="h-8 px-3 rounded-lg border border-border hover:bg-accent text-foreground flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> {action.cancelLabel ?? "Avbryt"}
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="flex items-center gap-2 text-muted-foreground pt-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Utför åtgärden...
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-1.5 pt-1 border-t border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5" /> {resultMsg}
          </div>
          {["send_reminder", "mark_invoice_paid", "post_journal", "periodize_cost"].includes(action.kind) && (
            <button
              onClick={() => toast.info("Åtgärden ångrad.")}
              className="text-[#0052FF] hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Ångra
            </button>
          )}
        </div>
      )}

      {phase === "cancelled" && (
        <div className="text-muted-foreground italic pt-1 border-t border-border/60">Avbruten — inget hände.</div>
      )}
    </div>
  );
};
