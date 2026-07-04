import { useEffect, useState } from "react";
import { Receipt, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useVATSummary } from "@/hooks/useVATSummary";

const dismissKey = (label: string) => `vat-reminder-dismissed:${label}`;

const formatDateSv = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const VATReminderBanner = () => {
  const navigate = useNavigate();
  const { periodLabel, dueDate, uncertainCount, loading } = useVATSummary();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !periodLabel) return;
    setDismissed(window.localStorage.getItem(dismissKey(periodLabel)) === "1");
  }, [periodLabel]);

  if (loading || !dueDate || dismissed) return null;
  const days = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / 86400000
  );
  if (days > 5 || days < 0) return null;

  const ready = uncertainCount === 0;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(dismissKey(periodLabel), "1");
    }
    setDismissed(true);
  };

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-start gap-3">
      <div className="rounded-lg bg-blue-500/15 p-2 mt-0.5">
        <Receipt className="h-4 w-4 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Momsdeklarationen för {periodLabel} ska lämnas senast {formatDateSv(dueDate)}.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Underlaget är{" "}
          <span className={ready ? "text-emerald-500" : "text-amber-500"}>
            {ready ? "klart" : "inte klart"}
          </span>
          {!ready && ` — ${uncertainCount} post${uncertainCount === 1 ? "" : "er"} att granska`}
          .
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => navigate("/moms")}>
            Öppna momssammanställning
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Påminn senare
          </Button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Stäng"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
