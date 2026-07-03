import { ReactNode } from "react";
import { Check } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  /** Compact left panel — used in onboarding to give more breathing room to the form */
  compact?: boolean;
}

const FEATURES = [
  "AI tolkar kvitton och fakturor automatiskt",
  "Momsdeklaration & AGI med ett klick",
  "Bankintegration med alla storbanker",
];

const STATS = [
  { value: "99.9%", label: "Drifttid" },
  { value: "BAS 2026", label: "Kontoplan" },
  { value: "GDPR", label: "Certifierat" },
];

/**
 * Shared split-screen wrapper for auth + onboarding.
 * LEFT: branding (#0f1f35) — identical to landing hero.
 * RIGHT: white minimal slot for forms.
 */
export const AuthShell = ({ children, compact = false }: AuthShellProps) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* LEFT — branding panel, hidden on mobile */}
      <div className="hidden lg:flex flex-1 bg-[#0f1f35] relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.15) 59px, rgba(255,255,255,0.15) 60px)",
          }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(8,145,178,0.1)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-0">
            <span className="text-2xl font-[800] text-[#3b82f6]">North</span>
            <span className="text-2xl font-[800] text-white">Ledger</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h2
            className={`${compact ? "text-[36px]" : "text-[44px]"} font-[900] text-white leading-[1.1]`}
            style={{ letterSpacing: "-1.8px" }}
          >
            Bokföring.
            <br />
            <span className="text-[#3b82f6]">Automatiserad.</span>
          </h2>

          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-[26px] h-[26px] rounded-md bg-[rgba(34,211,238,0.1)] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#3b82f6]" />
                </div>
                <span className="text-sm text-[rgba(255,255,255,0.5)]">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-10">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-[22px] font-[800] text-white">{s.value}</div>
              <div className="text-[11.5px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — minimal form slot */}
      <div className="w-full lg:w-1/2 xl:w-[560px] flex-shrink-0 bg-white flex items-center justify-center px-6 sm:px-8 py-12 min-h-screen">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-0 mb-8">
            <span className="text-xl font-[800] text-[#3b82f6]">North</span>
            <span className="text-xl font-[800] text-[#0f1f35]">Ledger</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
