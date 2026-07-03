import { Check, X } from "lucide-react";

const TRADITIONAL = [
  "Manuellt arbete per klient",
  "Låg skalbarhet — fler kunder kräver fler anställda",
  "Beroende av flera olika system",
  "Tidsbaserad fakturering med tak på intäkter",
];

const WL = [
  "Automatiserade arbetsflöden — AI bokför",
  "Skala till hundratals klienter med samma team",
  "Allt-i-ett plattform under ditt varumärke",
  "Återkommande intäkter med hög marginal",
];

export const WLWhyWins = () => {
  return (
    <section className="bg-[#0f1f35] py-24 md:py-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-[#3b82f6] text-xs font-medium tracking-[0.25em] uppercase mb-3">
            Varför vinner du
          </p>
          <h2
            className="text-4xl md:text-5xl font-[700] text-white leading-[1.05]"
            style={{ letterSpacing: "-0.8px" }}
          >
            En modell byggd för <span className="text-[#3b82f6]">tillväxt.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="text-[11.5px] uppercase tracking-wider text-white/40 font-medium mb-5">
              Traditionellt
            </div>
            <ul className="space-y-4">
              {TRADITIONAL.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-white/30" />
                  </div>
                  <span className="text-[14px] text-white/55 leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/[0.04] p-8">
            <div className="text-[11.5px] uppercase tracking-wider text-[#3b82f6] font-medium mb-5">
              Med Ledger.io White Label
            </div>
            <ul className="space-y-4">
              {WL.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-md bg-[#3b82f6]/[0.12] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#3b82f6]" />
                  </div>
                  <span className="text-[14px] text-white/80 leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
