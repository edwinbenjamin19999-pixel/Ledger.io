import { CheckCircle2 } from "lucide-react";

interface WizardProgressProps { steps: string[];
  current: number;
}

export function WizardProgress({ steps, current }: WizardProgressProps) { return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((label, i) => { const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center w-full">
              {i > 0 && (
                <div
                  className={`flex-1 h-0.5 ${ done ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${ done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${ done ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-[10px] sm:text-xs text-center leading-tight ${ active ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
