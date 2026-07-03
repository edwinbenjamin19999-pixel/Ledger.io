import { ArrowRight } from "lucide-react";

/**
 * FLAT CTA-BLOCK — helt amber-block (posterprincip: en sektion, en färg,
 * ett budskap). Mörk text på amber för AA-kontrast. Dekorativ cirkel i
 * låg opacitet, ingen skugga eller gradient.
 */
export const PilotCTA = () => {
  return (
    <section id="pilot" className="relative overflow-hidden bg-[#F59E0B] py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full bg-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-[8%] h-[200px] w-[200px] rotate-12 bg-white/10"
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0F1B2D]/70">
          Pilotprogram
        </p>
        <h2 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight text-[#0F1B2D]">
          Vi söker utvalda pilotföretag att växa med.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#0F1B2D]/80">
          Ansök om tidig tillgång — begränsat antal platser. Du får full
          onboarding, direktlinje till teamet och påverkar produkten.
        </p>
        <a
          href="mailto:pilot@ledger.io"
          className="mt-8 inline-flex h-14 items-center gap-2 rounded-md bg-[#0F1B2D] px-8 text-base font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-[#1a2c46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1B2D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F59E0B]"
        >
          Ansök om pilotplats
          <ArrowRight className="h-5 w-5" aria-hidden />
        </a>
      </div>
    </section>
  );
};
