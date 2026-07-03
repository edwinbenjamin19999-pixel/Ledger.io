/**
 * LensSelector — premium toggle that swaps the value layer rendered in
 * RR/BR/Budget/Forecast tables WITHOUT rebuilding rows.
 *
 * Active state uses the brand cyan per `selection-control-color-standard-sv`.
 * Disabled lenses (e.g. budget missing) show a tooltip explaining why.
 */
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type Lens = "actual" | "budget" | "forecast" | "variance" | "scenario";

interface LensOption {
  key: Lens;
  label: string;
  /** When false, button is disabled and tooltip explains why. */
  available: boolean;
  unavailableReason?: string;
}

interface LensSelectorProps {
  value: Lens;
  onChange: (lens: Lens) => void;
  hasBudget?: boolean;
  hasForecast?: boolean;
  hasScenario?: boolean;
  className?: string;
}

export function LensSelector({
  value,
  onChange,
  hasBudget = false,
  hasForecast = false,
  hasScenario = false,
  className,
}: LensSelectorProps) {
  const options: LensOption[] = [
    { key: "actual", label: "Utfall", available: true },
    { key: "budget", label: "Budget", available: hasBudget, unavailableReason: "Ingen budget för perioden" },
    { key: "forecast", label: "Prognos", available: hasForecast, unavailableReason: "Ingen prognos för perioden" },
    { key: "variance", label: "Avvikelse", available: hasBudget || hasForecast, unavailableReason: "Behöver budget eller prognos" },
    { key: "scenario", label: "Scenario", available: hasScenario, unavailableReason: "Inget scenario aktiverat" },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="tablist"
        aria-label="Visualiseringslins"
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm",
          className,
        )}
      >
        {options.map((opt) => {
          const isActive = value === opt.key;
          const button = (
            <button
              key={opt.key}
              role="tab"
              aria-selected={isActive}
              disabled={!opt.available}
              onClick={() => opt.available && onChange(opt.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                "disabled:cursor-not-allowed disabled:opacity-40",
                isActive
                  ? "bg-[#3b82f6] text-white shadow-sm"
                  : "text-foreground hover:bg-[#EFF6FF] hover:text-[#3b82f6] dark:hover:bg-cyan-900/20",
              )}
            >
              {opt.label}
            </button>
          );
          if (opt.available) return button;
          return (
            <Tooltip key={opt.key}>
              <TooltipTrigger asChild>
                <span className="inline-flex">{button}</span>
              </TooltipTrigger>
              <TooltipContent>{opt.unavailableReason}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
