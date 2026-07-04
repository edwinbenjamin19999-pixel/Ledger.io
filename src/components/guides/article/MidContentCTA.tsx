import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

interface MidContentCTAProps {
  text?: string;
  ctaLabel?: string;
  href?: string;
}

export const MidContentCTA = ({
  text = "Cogniq bokför kvitton och fakturor automatiskt med 95 % AI-träffsäkerhet — du granskar och godkänner.",
  ctaLabel = "Testa Cogniq gratis",
  href = "/auth",
}: MidContentCTAProps) => (
  <div className="not-prose relative -mx-2 md:-mx-6 my-14 rounded-[24px] border border-slate-900/[0.06] bg-white p-7 md:p-8 shadow-[0_24px_60px_-24px_rgba(0,82,255,0.25)] hover:shadow-[0_28px_70px_-24px_rgba(0,82,255,0.35)] transition-shadow duration-300">
    <div className="flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8">
      <div className="flex items-start gap-4 flex-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF]">
          <Sparkles className="w-5 h-5 text-[#3b82f6]" />
        </div>
        <div className="flex-1">
          <div className="text-[17px] font-semibold text-[#0F172A] tracking-tight">Vill du slippa detta manuellt?</div>
          <p className="mt-1.5 text-[15px] text-slate-600 leading-relaxed">{text}</p>
        </div>
      </div>
      <Link
        to={href}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0F172A]/90 transition-all duration-200"
      >
        {ctaLabel} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);
