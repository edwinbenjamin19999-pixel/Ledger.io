import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InlineWarningChipProps {
  message: string;
  onAction?: () => void;
  actionLabel?: string;
  onDismiss?: () => void;
  className?: string;
}

export function InlineWarningChip({
  message,
  onAction,
  actionLabel = "Visa hjälp",
  onDismiss,
  className,
}: InlineWarningChipProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50/80 px-3 py-1.5 text-xs text-[#7A5417] shadow-sm dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100",
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{message}</span>
      {onAction && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-[#7A5417] hover:bg-[#FAEEDA] dark:text-amber-100 dark:hover:bg-amber-900/40"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Stäng"
          className="rounded p-0.5 text-[#7A5417] hover:bg-[#FAEEDA] dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
