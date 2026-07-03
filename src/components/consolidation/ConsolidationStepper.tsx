import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step { id: number;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Koncernstruktur", description: "Ägarstruktur & förvärv" },
  { id: 2, label: "Datainsamling", description: "Saldobalanser & mappning" },
  { id: 3, label: "Justeringar", description: "Principer & goodwill" },
  { id: 4, label: "Elimineringar", description: "Intern elimination" },
  { id: 5, label: "Konsoliderad rapport", description: "RR, BR, kassaflöde" },
  { id: 6, label: "Koncernårsredovisning", description: "Signering & inlämning" },
];

interface ConsolidationStepperProps { currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: Set<number>;
}

export const ConsolidationStepper = ({ currentStep,
  onStepClick,
  completedSteps,
}: ConsolidationStepperProps) => { return (
    <nav className="mb-8">
      <ol className="flex items-center w-full">
        {STEPS.map((step, index) => { const isCompleted = completedSteps.has(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = isCompleted || step.id <= currentStep;

          return (
            <li
              key={step.id}
              className={cn("flex items-center", index < STEPS.length - 1 && "flex-1")}
            >
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-1 group relative",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap hidden md:block",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap hidden lg:block">
                  {step.description}
                </span>
              </button>

              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-20px] md:mt-[-30px]",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
