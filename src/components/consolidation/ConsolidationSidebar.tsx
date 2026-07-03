import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Step { id: number;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Koncernstruktur", description: "Ägarstruktur & förvärv" },
  { id: 2, label: "Datainsamling", description: "Saldobalanser" },
  { id: 3, label: "Justeringar", description: "Principer & goodwill" },
  { id: 4, label: "Elimineringar", description: "Intern elimination" },
  { id: 5, label: "Konsoliderad rapport", description: "RR, BR, kassaflöde" },
  { id: 6, label: "Årsredovisning", description: "Signering & inlämning" },
];

interface Props { currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: Set<number>;
  errorSteps?: Set<number>;
  summary?: { entities: number; eliminations: number; differens: number };
}

export const ConsolidationSidebar = ({ currentStep,
  onStepClick,
  completedSteps,
  errorSteps = new Set(),
  summary,
}: Props) => { const getState = (id: number) => { if (errorSteps.has(id)) return "error";
    if (completedSteps.has(id)) return "complete";
    if (id === currentStep) return "active";
    return "pending";
  };

  return (
    <nav className="konc-sidebar-nav" aria-label="Konsolideringssteg">
      <div className="flex-1 py-2">
        {STEPS.map((step) => { const state = getState(step.id);
          const isClickable = state !== "pending" || step.id <= currentStep;

          return (
            <button
              key={step.id}
              className="konc-step-item w-full text-left"
              data-state={state}
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              aria-current={state === "active" ? "step" : undefined}
            >
              <div className="konc-step-circle" aria-hidden="true">
                {state === "complete" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : state === "error" ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  step.id
                )}
              </div>
              <div>
                <div className="konc-step-label">{step.label}</div>
                <div className="konc-step-desc">{step.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live summary */}
      {summary && (
        <div className="border-t border-border p-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sammanfattning
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bolag</span>
              <span className="font-medium">{summary.entities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Elimineringar</span>
              <span className="font-medium">{summary.eliminations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Differens</span>
              <span className={cn(
                "font-medium",
                Math.abs(summary.differens) < 1 ? "text-[hsl(var(--status-green))]" : "text-destructive"
              )}>
                {Math.abs(summary.differens) < 1 ? "0 kr ✓" : `${summary.differens.toLocaleString("sv-SE")} kr ✗`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="border-t border-border p-4 space-y-2">
        <div className="text-[11px] text-center text-muted-foreground mb-2">
          Steg {currentStep} av 6
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onStepClick(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            ← Föregående
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onStepClick(Math.min(6, currentStep + 1))}
            disabled={currentStep === 6}
          >
            Nästa →
          </Button>
        </div>
      </div>
    </nav>
  );
};
