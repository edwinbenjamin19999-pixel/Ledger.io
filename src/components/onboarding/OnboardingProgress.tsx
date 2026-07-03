interface OnboardingProgressProps {
  /** Current step (1-5) */
  current: number;
  /** Total steps (default 5) */
  total?: number;
}

/**
 * Premium 5-segment progress indicator with "Steg X av Y" label.
 * Reused across `/auth` (signup) and `/quick-onboarding`.
 */
export const OnboardingProgress = ({ current, total = 5 }: OnboardingProgressProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              n <= current ? "bg-[#3b82f6]" : "bg-slate-100"
            }`}
          />
        ))}
      </div>
      <p className="text-[12px] uppercase tracking-wider text-slate-400">
        Steg {current} av {total}
      </p>
    </div>
  );
};
