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
 * FLAT AUTH-SHELL — split-screen som speglar landningssidans poster-hero.
 * VÄNSTER: solitt blue-600-block med geometrisk dekoration (inga glows,
 * mönster eller gradienter). Amber marker-highlight på "Automatiserad."
 * HÖGER: vit minimal yta för formulär.
 */
export const AuthShell = ({ children, compact = false }: AuthShellProps) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* LEFT — inverterat svart editoriellt block, dolt på mobil */}
      <div className="hidden lg:flex flex-1 bg-foreground text-background relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        {/* Vertikalt linjemönster (spec: inverted section texture) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 1px, #fff 1px, #fff 2px)",
            backgroundSize: "4px 100%",
          }}
        />

        <div className="relative z-10">
          <span className="font-display text-2xl tracking-tight text-background">
            <span className="font-bold">Bok</span>
            <span className="font-light">fy</span>
          </span>
        </div>

        <div className="relative z-10 space-y-8">
          <h2
            className={`font-display ${compact ? "text-[44px]" : "text-[56px]"} font-medium text-background leading-[1.05] tracking-tight`}
          >
            Bokföring.
            <br />
            {/* Inversion för emphasis: vit ruta, svart text */}
            <span className="mt-2 inline-block bg-background px-3 text-foreground">
              Automatiserad.
            </span>
          </h2>

          <div className="space-y-4 border-t border-background/20 pt-6">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <span className="font-mono text-xs text-background/50">—</span>
                <span className="font-serif text-[15px] text-background/90">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-10 border-t border-background/20 pt-6">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-display text-[24px] font-bold text-background">{s.value}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-background/50">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — minimal form slot */}
      <div className="w-full lg:w-1/2 xl:w-[560px] flex-shrink-0 bg-background flex items-center justify-center px-6 sm:px-8 py-12 min-h-screen border-l-4 border-foreground">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-0 mb-8">
            <span className="font-display text-xl tracking-tight text-foreground">
              <span className="font-bold">Bok</span>
              <span className="font-light">fy</span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
