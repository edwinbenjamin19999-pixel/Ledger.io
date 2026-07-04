import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, X, Sparkles } from "lucide-react";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

const DISMISS_KEY = "getting_started_dismissed_v1";
const MAX_DAYS = 14;

interface ChecklistItem {
  id: string;
  label: string;
  to: string;
  done: boolean;
}

/**
 * Persistent but dismissible "Getting started" checklist for the sidebar.
 * Shown for the first 14 days after signup. Auto-hides when all items are
 * checked or the user dismisses it.
 */
export const GettingStartedChecklist = () => {
  const progress = useOnboardingProgress();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1"); } catch { /* noop */ }
  }, []);

  if (progress.loading) return null;
  if (dismissed) return null;
  if (progress.allDone) return null;
  if (progress.daysSinceSignup > MAX_DAYS) return null;

  const items: ChecklistItem[] = [
    { id: "bank", label: "Anslut bankkonto", to: "/bank", done: progress.bankConnected },
    { id: "invoice", label: "Skapa eller ladda upp faktura", to: "/invoices", done: progress.hasInvoices },
    { id: "ai", label: "Granska AI:ns konteringsförslag", to: "/automation", done: progress.hasReviewedAISuggestion },
    { id: "period", label: "Stäng din första period", to: "/closing-command-center", done: progress.hasClosedPeriod },
  ];

  const doneCount = items.filter((i) => i.done).length;

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <div className="mx-2 mb-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-white/80">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#3b82f6]" />
          <span className="text-[11px] uppercase tracking-wider font-medium text-white/70">
            Kom igång
          </span>
        </div>
        <button
          onClick={dismiss}
          className="text-white/30 hover:text-white/70 transition-colors"
          aria-label="Dölj"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="text-[10px] text-white/40 mb-2 tabular-nums">
        {doneCount} av {items.length} klara
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              to={it.to}
              className={`flex items-center gap-2 px-1.5 py-1 rounded text-[12px] transition-colors ${
                it.done
                  ? "text-white/40 hover:text-white/60"
                  : "text-white/85 hover:bg-white/[0.05]"
              }`}
            >
              <span
                className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                  it.done ? "bg-[#3b82f6] border-[#3b82f6]" : "border-white/30"
                }`}
              >
                {it.done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </span>
              <span className={`flex-1 ${it.done ? "line-through" : ""}`}>{it.label}</span>
              {!it.done && <ChevronRight className="h-3 w-3 text-white/30" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GettingStartedChecklist;
