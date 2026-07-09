import { ReactNode } from "react";
import aiCore from "@/assets/ai-core.png";
import { CogniqLogo } from "@/components/brand/CogniqLogo";

interface AuthShellProps {
  children: ReactNode;
  /** Compact — mindre vertikal luft (används i onboarding). */
  compact?: boolean;
}

const TRUST = ["Drift i Sverige", "BAS 2026", "GDPR", "BankID"];

/**
 * CENTRERAD IMMERSIV AUTH — medvetet bort från split-screen-mönstret.
 * Ljus dot-grid-canvas med radial Electric-Blue-glow, en kompakt 3D-AI-orb
 * som brandmärke, och ett enda fokuserat kort. Formuläret levereras som
 * children.
 */
export const AuthShell = ({ children, compact = false }: AuthShellProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-dot-grid">
      {/* Ambient — radiala glows uppe och nere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-[#0052FF] opacity-[0.08] blur-[150px]" />
        <div className="absolute bottom-[-20%] left-1/2 h-[360px] w-[520px] -translate-x-1/2 rounded-full bg-[#4D7CFF] opacity-[0.05] blur-[130px]" />
      </div>

      <div className={`relative z-10 flex min-h-screen flex-col items-center justify-center px-6 ${compact ? "py-8" : "py-12"}`}>
        {/* 3D-AI-orb som brandmärke */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="auth-orb-ring absolute h-24 w-24 rounded-full border border-dashed border-[#0052FF]/25" />
          <div className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-[#0F172A] shadow-xl">
            <video
              autoPlay
              loop
              muted
              playsInline
              poster={aiCore}
              className="h-full w-full object-cover"
              aria-hidden
            >
              <source src="/ai-core.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        {/* Wordmark */}
        <div className="mb-8 flex items-center">
          <CogniqLogo size={30} />
        </div>

        {/* Fokuserat kort med formuläret */}
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl sm:p-10">
          {children}
        </div>

        {/* Trust-strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {TRUST.map((t, i) => (
            <span key={t} className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
              {i > 0 && <span aria-hidden className="text-border">·</span>}
              {t}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes authOrbRing { to { transform: rotate(360deg); } }
        .auth-orb-ring { animation: authOrbRing 24s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .auth-orb-ring { animation: none; } }
      `}</style>
    </div>
  );
};
