import { useState, ReactNode } from "react";
import { Info, Sparkles, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface AIExplainProps {
  /** Line 1 — What AI did. e.g. "Jag konterade transaktionen på 6212 Telefon & internet." */
  what: string;
  /** Line 2 — Why. Concrete signals separated by commas. */
  why: string;
  /** 0–1 confidence. Used both as a number and to colour the badge. */
  confidence?: number;
  /** Line 4 — Override what happens if AI is wrong. Defaults to the standard correction wording. */
  ifWrong?: string;
  /** Optional CTA shown beneath the explanation (e.g. "Rätta", "Visa post"). */
  action?: { label: string; onClick: () => void };
  /** Trigger label. Defaults to "Varför?". Pass null to render only the (i) icon. */
  label?: string | null;
  /** Visual variant. "icon" = bare (i), "link" = "Varför?" text. */
  variant?: "icon" | "link";
  /** Optional extra slot (e.g. a small list). Rendered between Why and Confidence. */
  extra?: ReactNode;
  className?: string;
  triggerClassName?: string;
}

const confidenceTone = (pct: number) =>
  pct >= 95
    ? { label: "mycket säker", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" }
    : pct >= 80
    ? { label: "säker", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" }
    : pct >= 60
    ? { label: "rimligt säker", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" }
    : { label: "osäker — granska gärna", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" };

function ExplanationBody({ what, why, confidence, ifWrong, action, extra }: Omit<AIExplainProps, "label" | "variant" | "className" | "triggerClassName">) {
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  const tone = pct != null ? confidenceTone(pct) : null;
  return (
    <div className="space-y-3 text-[13px] leading-[1.55]">
      {/* Header */}
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
        <Sparkles className="h-3 w-3 text-[#3b82f6]" />
        AI-förklaring
      </div>

      {/* Line 1 — What */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Vad AI gjorde</div>
        <p className="text-slate-900">{what}</p>
      </div>

      {/* Line 2 — Why */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Baserat på</div>
        <p className="text-slate-700">{why}</p>
      </div>

      {extra}

      {/* Line 3 — Confidence */}
      {pct != null && tone && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Konfidens</div>
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[12px] font-medium tabular-nums", tone.bg, tone.color)}>
              {pct}%
            </span>
            <span className="text-slate-600 text-[12px]">— {tone.label}</span>
          </div>
        </div>
      )}

      {/* Line 4 — If wrong */}
      <div className="pt-2 border-t border-slate-100">
        <p className="text-slate-600 text-[12px]">
          {ifWrong || "Om det är fel, tryck Rätta så lär jag mig till nästa gång."}
        </p>
      </div>

      {/* Optional CTA */}
      {action && (
        <button
          onClick={action.onClick}
          className="w-full mt-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#3b82f6] text-white text-[13px] font-medium active:scale-[0.98] transition-transform"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Universal "Varför?" trigger for any AI-generated value, suggestion or action.
 *
 * - Desktop: opens as a Popover next to the trigger.
 * - Mobile: opens as a bottom Sheet so users don't lose context.
 *
 * Always renders the same 4-line structure (What / Why / Confidence / If wrong),
 * matching the explanation contract used everywhere in the product.
 */
export const AIExplain = ({
  what,
  why,
  confidence,
  ifWrong,
  action,
  extra,
  label = "Varför?",
  variant = "icon",
  className,
  triggerClassName,
}: AIExplainProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const Trigger = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
      aria-label={label || "Varför?"}
      className={cn(
        "inline-flex items-center gap-1 align-middle text-slate-400 hover:text-[#3b82f6] focus:outline-none focus:text-[#3b82f6] transition-colors",
        variant === "link" && "text-[12px] underline decoration-dotted underline-offset-2",
        className,
        triggerClassName,
      )}
    >
      {variant === "icon" ? (
        <Info className="h-3.5 w-3.5" />
      ) : (
        <>
          <Info className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <>
        {Trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-[15px] text-left">AI-förklaring</SheetTitle>
            </SheetHeader>
            <ExplanationBody
              what={what}
              why={why}
              confidence={confidence}
              ifWrong={ifWrong}
              action={action ? { ...action, onClick: () => { setOpen(false); action.onClick(); } } : undefined}
              extra={extra}
            />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[340px] p-4 rounded-2xl border-[0.5px] border-slate-200 shadow-lg"
      >
        <ExplanationBody
          what={what}
          why={why}
          confidence={confidence}
          ifWrong={ifWrong}
          action={action ? { ...action, onClick: () => { setOpen(false); action.onClick(); } } : undefined}
          extra={extra}
        />
      </PopoverContent>
    </Popover>
  );
};
