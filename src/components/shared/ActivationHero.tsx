/**
 * ActivationHero — canonical replacement for EmptyState when a module has activation potential.
 *
 * Use this instead of <EmptyState /> whenever the user can take an action that unlocks
 * meaningful value (connect a bank, upload a document, enable automation, etc.).
 * Reserve <EmptyState /> for terminal empty cases (search returned 0, filtered list empty).
 *
 * Enforces Law 2 (No Empty States) + Law 5 (AI Shows Receipts) structurally:
 * - `valueProp` is required and must include a concrete metric (SEK saved, hours saved, %).
 * - `steps` makes the path forward explicit.
 *
 * See mem://style/product-experience-laws-sv
 */
import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivationStep {
  label: string;
  done?: boolean;
}

interface ActivationHeroProps {
  title: string;
  /** Must include a concrete metric — e.g. "AI bokför 95% automatiskt → sparar 40+ timmar/månad" */
  valueProp: string;
  steps?: ActivationStep[];
  primaryCtaLabel: string;
  onPrimaryCta: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function ActivationHero({
  title,
  valueProp,
  steps,
  primaryCtaLabel,
  onPrimaryCta,
  secondaryCtaLabel,
  onSecondaryCta,
  icon: Icon = Sparkles,
  className,
}: ActivationHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-800/60 bg-[#0F1F3D] p-6 sm:p-8",
        className,
      )}
    >
      {/* Subtle cyan accent */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#EFF6FF] blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] border border-[#C8DDF5] flex items-center justify-center">
            <Icon className="h-4 w-4 text-[#1E3A5F]" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3b82f6]/80">
            Aktivera
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl">{valueProp}</p>

        {/* Primary + secondary CTAs — only ONE primary (Law 4) */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button
            onClick={onPrimaryCta}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#3b82f6] transition-colors"
          >
            {primaryCtaLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
          {secondaryCtaLabel && onSecondaryCta && (
            <button
              onClick={onSecondaryCta}
              className="inline-flex items-center rounded-xl border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/50 transition-colors"
            >
              {secondaryCtaLabel}
            </button>
          )}
        </div>

        {/* Steps */}
        {steps && steps.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Så kommer du igång
            </p>
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold shrink-0",
                      step.done
                        ? "bg-[#E1F5EE] text-[#1D9E75] border border-[#BFE6D6]"
                        : "bg-slate-800 text-slate-400 border border-slate-700",
                    )}
                  >
                    {step.done ? "✓" : i + 1}
                  </span>
                  <span className={cn(step.done ? "text-slate-400 line-through" : "text-slate-200")}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
