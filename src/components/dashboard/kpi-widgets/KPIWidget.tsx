import { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus, X, GripVertical, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  title: string;
  primaryValue: ReactNode;
  changePct?: number | null;
  changeLabel?: string;
  aiComment?: string;
  loading?: boolean;
  onClick?: () => void;
  editing?: boolean;
  onRemove?: () => void;
  dragHandleProps?: any;
  tooltip?: string;
  children?: ReactNode;
  invertColor?: boolean;
}

export function KPIWidget({
  title,
  primaryValue,
  changePct,
  changeLabel,
  aiComment,
  loading,
  onClick,
  editing,
  onRemove,
  dragHandleProps,
  tooltip,
  children,
  invertColor,
}: Props) {
  const positive = changePct != null ? (invertColor ? changePct < 0 : changePct >= 0) : null;
  const ArrowIcon =
    changePct == null ? Minus : changePct > 0 ? ArrowUp : changePct < 0 ? ArrowDown : Minus;

  return (
    <Card
      className={cn(
        "p-4 flex flex-col gap-2 relative transition-all min-h-[148px]",
        onClick && !editing && "cursor-pointer hover:border-primary/40",
        editing && "outline-dashed outline-1 outline-muted-foreground/30",
      )}
      onClick={editing ? undefined : onClick}
    >
      {editing && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5 bg-background/80 backdrop-blur rounded-t-lg z-10">
          <button {...dragHandleProps} className="p-1 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            aria-label="Ta bort widget"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
          {tooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">
                  {title}
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            title
          )}
        </h3>
      </div>

      {loading ? (
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      ) : (
        <div className="flex items-baseline gap-2 flex-wrap">
          <div className="text-2xl font-semibold tabular-nums">{primaryValue}</div>
          {changePct != null && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium tabular-nums",
                positive ? "text-emerald-600" : "text-destructive",
              )}
            >
              <ArrowIcon className="h-3 w-3" />
              {Math.abs(changePct).toFixed(1)}%
              {changeLabel && (
                <span className="text-muted-foreground font-normal ml-1">{changeLabel}</span>
              )}
            </span>
          )}
        </div>
      )}

      {children}

      {aiComment && !loading && (
        <div className="mt-auto pt-2 border-t border-border/50 flex items-start gap-1.5">
          <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-snug">{aiComment}</p>
        </div>
      )}
    </Card>
  );
}
