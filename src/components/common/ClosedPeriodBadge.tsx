import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  className?: string;
  label?: string;
}

/**
 * Small lock icon shown next to closed-period entries in journal/transaction views.
 */
export const ClosedPeriodBadge = ({ className, label = "Perioden är stängd" }: Props) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-500 px-1.5 py-0.5 text-[10px] font-medium ${className ?? ""}`}
          >
            <Lock className="h-3 w-3" />
            Låst
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
