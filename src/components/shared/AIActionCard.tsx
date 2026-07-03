import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  ShieldAlert,
  Sparkles,
  MoreHorizontal,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { AIAction, ActionKind, ActionConfidence } from "@/lib/ai-actions/types";
import type { DismissDuration } from "@/hooks/useActionDismissals";

interface Props {
  action: AIAction;
  onDismiss?: (id: string, duration: DismissDuration) => void | Promise<void>;
  className?: string;
}

const KIND_META: Record<ActionKind, {
  edge: string;
  iconBg: string;
  iconColor: string;
  Icon: typeof Banknote;
  label: string;
}> = {
  financial: {
    edge: "bg-[#3b82f6]/60",
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#3b82f6] dark:text-[#1E3A5F]",
    Icon: Banknote,
    label: "Finansiell åtgärd",
  },
  risk: {
    edge: "bg-amber-500/70",
    iconBg: "bg-[#FAEEDA]",
    iconColor: "text-[#7A5417] dark:text-[#C28A2B]",
    Icon: ShieldAlert,
    label: "Risk",
  },
  optimization: {
    edge: "bg-emerald-500/60",
    iconBg: "bg-[#E1F5EE]",
    iconColor: "text-[#085041] dark:text-[#1D9E75]",
    Icon: Sparkles,
    label: "Optimering",
  },
};

const CONFIDENCE_META: Record<ActionConfidence, { label: string; cls: string }> = {
  high: {
    label: "Hög konfidens",
    cls: "bg-[#E1F5EE] text-[#085041] dark:text-[#1D9E75] border-[#BFE6D6]",
  },
  medium: {
    label: "Medel konfidens",
    cls: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  low: {
    label: "Låg konfidens",
    cls: "bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B] border-[#F0DDB7]",
  },
};

function fmtSEK(n: number) {
  return n.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr";
}

export function AIActionCard({ action, onDismiss, className }: Props) {
  const [busy, setBusy] = useState(false);
  const meta = KIND_META[action.kind];
  const conf = CONFIDENCE_META[action.confidence];
  const Icon = meta.Icon;

  const handlePrimary = async () => {
    try {
      setBusy(true);
      await action.primary.onClick();
    } catch (e) {
      console.error("[AIAction] primary failed", e);
      toast.error("Åtgärden kunde inte slutföras");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-4 sm:p-5",
        "transition-all duration-150 hover:border-border/80 hover:shadow-sm",
        "flex flex-col gap-3 min-w-0",
        className,
      )}
    >
      {/* Left edge */}
      <div
        className={cn(
          "absolute left-0 top-3 bottom-3 w-[3px] rounded-r",
          meta.edge,
        )}
        aria-hidden
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              meta.iconBg,
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", meta.iconColor)} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {meta.label}
            </p>
            <h4 className="text-sm font-semibold text-foreground leading-tight mt-0.5 truncate">
              {action.title}
            </h4>
          </div>
        </div>

        {onDismiss && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mr-1 -mt-1 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onDismiss(action.id, "today")}>
                Dölj idag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDismiss(action.id, "week")}>
                Snooza 7 dagar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDismiss(action.id, "permanent")}>
                Dölj permanent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Explanation */}
      <p className="text-sm text-muted-foreground leading-snug line-clamp-3">
        {action.explanation}
      </p>

      {/* Impact + Confidence row */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-xs">
        {action.impact && (
          <div className="font-semibold text-foreground tabular-nums">
            {action.impact.amount !== undefined
              ? fmtSEK(action.impact.amount)
              : action.impact.label}
            {action.impact.amount !== undefined && action.impact.label && (
              <span className="text-muted-foreground font-normal ml-1.5">
                · {action.impact.label}
              </span>
            )}
          </div>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium",
            conf.cls,
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          {conf.label}
        </span>
      </div>

      {/* Evidence (traceability) */}
      {action.evidence && action.evidence.length > 0 && (
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
          <span className="font-medium uppercase tracking-wider">Underlag:</span>
          {action.evidence.map((e, i) => (
            <span key={i}>
              {e.label}
              {i < action.evidence!.length - 1 && " ·"}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 mt-auto">
        <LoadingButton
          loading={busy}
          onClick={handlePrimary}
          size="sm"
          className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white h-8 text-xs"
        >
          {action.primary.label}
          <ArrowRight className="ml-1 h-3 w-3" />
        </LoadingButton>
        {action.secondary && (
          <Button
            variant="ghost"
            size="sm"
            onClick={action.secondary.onClick}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            {action.secondary.label}
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
