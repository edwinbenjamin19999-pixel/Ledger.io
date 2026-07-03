import { useEffect, useState } from "react";
import { Calendar, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePeriodCloseChecklist } from "@/hooks/usePeriodCloseChecklist";

const MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

const dismissKey = (y: number, m: number) => `period-close:banner-dismissed:${y}-${m}`;

export const PeriodCloseBanner = () => {
  const navigate = useNavigate();
  const { year, month, daysToPeriodEnd, isLocked } = usePeriodCloseChecklist();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(dismissKey(year, month)) === "1");
  }, [year, month]);

  if (isLocked || dismissed) return null;
  if (daysToPeriodEnd > 3 || daysToPeriodEnd < 0) return null;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(dismissKey(year, month), "1");
    }
    setDismissed(true);
  };

  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const daysCopy =
    daysToPeriodEnd === 0
      ? "idag"
      : daysToPeriodEnd === 1
        ? "om 1 dag"
        : `om ${daysToPeriodEnd} dagar`;

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-start gap-3">
      <div className="rounded-lg bg-blue-500/15 p-2 mt-0.5">
        <Calendar className="h-4 w-4 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Perioden {periodLabel} stängs {daysCopy}.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Jag har förberett en stängningschecklista åt dig.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => navigate("/period-close")}>
            Öppna checklista
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
