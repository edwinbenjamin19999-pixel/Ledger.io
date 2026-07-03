import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
// DEPRECATED: Use src/components/tax-agent/forms/AGIForm.tsx instead
// Kept for reference — do not import this component

interface AGIStepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

const steps = [
  { number: 1, label: "Betalningsmottagare" },
  { number: 2, label: "Arbetsgivare" },
  { number: 3, label: "Granska" },
  { number: 4, label: "Kvittens" },
];

export const AGIStepIndicator = ({ currentStep, completedSteps }: AGIStepIndicatorProps) => {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm py-5 px-6 mb-6">
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.number);
          const isActive = currentStep === step.number;
          const isPast = isCompleted || step.number < currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-2 relative z-10">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shrink-0",
                    isActive && "bg-[#0891B2] text-white shadow-[0_0_0_4px_rgba(8,145,178,0.15)]",
                    isCompleted && !isActive && "bg-[#0891B2] text-white",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground border-2 border-border"
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs whitespace-nowrap transition-colors",
                    isActive && "font-semibold text-foreground",
                    isCompleted && !isActive && "font-medium text-[#085041] dark:text-[#1D9E75]",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div className="flex-1 mx-3 h-0.5 rounded-full bg-border relative overflow-hidden self-start mt-5">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 bg-[#0891B2] rounded-full transition-all duration-500 ease-out",
                      isPast ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
