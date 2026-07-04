import { Check, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const TRADITIONAL = [
  "AI tillagt ovanpå ett 20 år gammalt system",
  "Separata moduler för varje funktion",
  "Manuell export mellan bokföring och rapporter",
  "Reaktiv kontroll — fel hittas vid revision",
  "Prognos i ett separat kalkylblad",
];

const CONTO = [
  "AI som kärna — byggt från grunden för automation",
  "Ett system: bokföring, moms, löner, budget, prognos",
  "Realtidsdata — resultat och balans alltid uppdaterad",
  "Proaktiv kontroll — avvikelser flaggas direkt",
  "Prognos baserad på din faktiska bokföring",
];

/**
 * FLAT JÄMFÖRELSE — vit sektion. Legacy = grått muted-block,
 * Cogniq = blue-50-block med tjock blå kant (border-2).
 * Färg och kant bär vinnaren — ingen glow.
 */
export const WhyNorthLedger = () => {
  const reveal = useScrollReveal<HTMLDivElement>();
  const navigate = useNavigate();
  return (
    <section className="bg-white py-24 px-6">
      <div ref={reveal.ref} className={`mx-auto max-w-5xl ${reveal.className}`}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#0052FF]">
          Jämförelse
        </p>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.05] text-[#0F172A]">
          Inte ett bokföringsprogram.{" "}
          <span className="text-[#0052FF]">Ett ekonomisystem.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#0F172A]/60">
          Skillnaden mellan att lappa ett gammalt system med AI — och att bygga
          ett nytt från grunden.
        </p>

        <div className="mt-12 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
          {/* Legacy — muted grått block */}
          <div className="rounded-lg bg-gray-100 p-7">
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0F172A]/50">
              Legacy-system + AI-tillägg
            </div>
            <ul className="space-y-4">
              {TRADITIONAL.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-white">
                    <X className="h-3 w-3 text-[#DC2626]" strokeWidth={3} aria-hidden />
                  </div>
                  <span className="text-sm leading-relaxed text-[#0F172A]/60">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cogniq — blue-50-block med tjock blå kant */}
          <div className="rounded-lg border-2 border-[#0052FF] bg-blue-50 p-7">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0052FF]">
                Cogniq
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0052FF] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                Rekommenderas
              </span>
            </div>
            <ul className="space-y-4">
              {CONTO.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-[#0052FF]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden />
                  </div>
                  <span className="text-sm font-medium leading-relaxed text-[#0F172A]">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="inline-flex h-14 items-center gap-2 rounded-md bg-[#0052FF] px-8 text-[15px] font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-[#0040CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2"
          >
            Säkra din plats — 14 dagar utan kostnad vid lansering
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
};
