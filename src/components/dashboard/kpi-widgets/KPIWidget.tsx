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
  /** F07 · lyft ett KPI till den blå "hero"-brickan (#0052FF, vit text). */
  accent?: boolean;
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
  accent,
}: Props) {
  const positive = changePct != null ? (invertColor ? changePct < 0 : changePct >= 0) : null;
  const ArrowIcon =
    changePct == null ? Minus : changePct > 0 ? ArrowUp : changePct < 0 ? ArrowDown : Minus;

  return (
    <Card
      className={cn(
        "p-4 flex flex-col gap-2 relative transition-all min-h-[148px]",
        onClick && !editing && "cursor-pointer",
        accent
          ? "bg-[#0052FF] border-transparent text-white hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
          : onClick && !editing && "hover:border-primary/40",
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
        <h3 className={cn(
          "text-xs font-medium uppercase tracking-wide truncate",
          accent ? "text-white/75" : "text-muted-foreground",
        )}>
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
                accent
                  ? "text-white"
                  : positive
                    ? "text-emerald-600"
                    : "text-destructive",
              )}
            >
              <ArrowIcon className="h-3 w-3" />
              {Math.abs(changePct).toFixed(1)}%
              {changeLabel && (
                <span className={cn("font-normal ml-1", accent ? "text-white/60" : "text-muted-foreground")}>{changeLabel}</span>
              )}
            </span>
          )}
        </div>
      )}

      {children}

      {aiComment && !loading && (
        <div className={cn(
          "mt-auto pt-2 border-t flex items-start gap-1.5",
          accent ? "border-white/20" : "border-border/50",
        )}>
          <Sparkles className={cn("h-3 w-3 shrink-0 mt-0.5", accent ? "text-white/80" : "text-primary")} />
          <p className={cn("text-xs leading-snug", accent ? "text-white/80" : "text-muted-foreground")}>{aiComment}</p>
        </div>
      )}
    </Card>
  );
}
