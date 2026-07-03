import { useEffect, useState } from "react";

interface WelcomeOverlayProps {
  onComplete: () => void;
  /** Total visible duration in ms (incl. fade out). Default: 2600ms */
  durationMs?: number;
  /** Optional company name to personalize the greeting */
  companyName?: string | null;
}

/**
 * Premium fade-in transition shown when entering the dashboard for the first time
 * after onboarding (`?welcome=1`). Auto-dismisses after `durationMs`.
 */
export const WelcomeOverlay = ({ onComplete, durationMs = 2600, companyName }: WelcomeOverlayProps) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeAt = Math.max(0, durationMs - 300);
    const fadeTimer = setTimeout(() => setFadingOut(true), fadeAt);
    const doneTimer = setTimeout(onComplete, durationMs);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [durationMs, onComplete]);

  const greeting = companyName
    ? `Välkommen, ${companyName}`
    : "Välkommen till Ledger.io";

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm transition-opacity duration-300 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-0 mb-6">
        <span className="text-3xl font-[800] text-[#3b82f6]">North</span>
        <span className="text-3xl font-[800] text-[#0f1f35]">Ledger</span>
      </div>

      <h1 className="text-[22px] font-bold text-[#0f1f35] tracking-tight text-center px-6">
        {greeting}
      </h1>
      <p className="mt-2 text-[14px] text-slate-500 text-center max-w-[320px] px-6">
        Vad kan jag hjälpa dig med idag?
      </p>

      {/* Thin progress bar */}
      <div className="mt-8 w-[200px] h-[2px] bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#3b82f6] rounded-full"
          style={{
            animation: "wl-progress 2.2s ease-out forwards",
          }}
        />
      </div>

      <p className="mt-5 text-[12px] text-slate-400 tracking-wide">
        Initierar din ekonomiplattform…
      </p>

      <style>{`
        @keyframes wl-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

