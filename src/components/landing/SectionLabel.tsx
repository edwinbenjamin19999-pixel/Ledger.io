/**
 * MINIMALIST MODERN sektionsetikett — mono-pill med accentkant och
 * (valfritt pulserande) punkt. Återanvänds ovanför varje sektionsrubrik.
 */
export const SectionLabel = ({
  children,
  pulse = false,
  inverted = false,
}: {
  children: React.ReactNode;
  pulse?: boolean;
  inverted?: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-3 rounded-full border px-5 py-2 ${
      inverted
        ? "border-white/25 bg-white/10"
        : "border-[#0052FF]/30 bg-[#0052FF]/5"
    }`}
  >
    <span
      aria-hidden
      className={`h-2 w-2 rounded-full bg-[#0052FF] ${
        pulse ? "animate-[labelPulse_2s_ease-in-out_infinite]" : ""
      }`}
    />
    <span
      className={`font-mono text-xs uppercase tracking-[0.15em] ${
        inverted ? "text-white/90" : "text-[#0052FF]"
      }`}
    >
      {children}
    </span>
    <style>{`
      @keyframes labelPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.7; }
      }
      @media (prefers-reduced-motion: reduce) {
        .animate-\\[labelPulse_2s_ease-in-out_infinite\\] { animation: none; }
      }
    `}</style>
  </span>
);
