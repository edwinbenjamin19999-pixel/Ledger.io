import { Info, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  description?: string;
  alert?: boolean;
}

export function KPICardHeader({ label, description, alert }: Props) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {alert && <AlertTriangle className="h-4 w-4 text-[#7A1A1A] shrink-0" />}
        <h3 className={cn("text-sm font-medium tracking-wide truncate", alert ? "text-[#7A1A1A] dark:text-rose-300" : "text-muted-foreground")}>
          {label}
        </h3>
      </div>
      {description && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Förklaring av ${label}`}
                className="rounded-full p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
