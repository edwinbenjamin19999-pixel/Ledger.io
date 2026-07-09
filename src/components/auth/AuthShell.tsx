import { ReactNode } from "react";
import { CogniqLogo } from "@/components/brand/CogniqLogo";

interface AuthShellProps {
  children: ReactNode;
  /** Behålls för bakåtkompatibilitet (onboarding). */
  compact?: boolean;
}

/**
 * SPLIT AUTH — Ljusblå färgriktning, förslag E. Delat kort: vänster brand-blå
 * panel (#0052FF) med ljus logga upptill och citat nedtill; höger vit yta med
 * formuläret (children). Ersätter den tidigare centrerade immersiva auth-vyn.
 */
export const AuthShell = ({ children }: AuthShellProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFB] px-4 py-10">
      <div className="grid w-full max-w-[860px] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.25)] md:grid-cols-[38%_1fr]">
        {/* Vänster: brand-blå panel */}
        <div className="flex flex-row items-center justify-between gap-4 bg-[#0052FF] p-7 md:flex-col md:items-start md:justify-between md:p-8">
          <CogniqLogo size={26} reversed />
          <p className="max-w-[15ch] text-[14px] font-semibold leading-relaxed text-white md:mt-auto">
            "Bokföring som redan är gjord."
          </p>
        </div>

        {/* Höger: vitt formulär */}
        <div className="flex flex-col justify-center bg-white p-8 sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
};
