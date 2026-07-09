import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Marketing hero — Ljusblå färgriktning, förslag E ("Blandning, medveten
 * balans"). Vit vänsterkolumn med budskap + två CTA:er; höger en rundad
 * brand-blå panel (#0052FF) med ett flytande vitt produkt-preview-kort
 * (en neutral + en blå nyckeltalsruta). Ersätter den tidigare mörka
 * navy-hero:n. Innehåll bevarat; endast färg + layout enligt specen.
 */
export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section id="hero-section" className="relative w-full bg-white pt-[60px]">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:gap-8">
          {/* Vänster: budskap på vit botten */}
          <div className="hero-anim hero-anim-headline">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#EFF6FF] px-3.5 py-1.5 text-[12.5px] font-medium text-[#0052FF]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#0052FF]" />
              AI-native bokföring · byggd för svenska bolag
            </span>

            <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-[-0.02em] text-[#0F172A] md:text-[3.4rem]">
              Bokföring som{" "}
              <span className="text-[#0052FF]">redan är gjord.</span>
            </h1>

            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#475569]">
              Cogniq kopplar din bank, bokför automatiskt och stämmer av varje
              natt. Du driver bolaget — din AI-ekonom sköter siffrorna.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/auth")}
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#0052FF] px-6 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0040CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2"
              >
                Kom igång gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </button>
              <button
                onClick={() => navigate("/contact")}
                className="inline-flex h-11 items-center justify-center rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-white px-6 text-[15px] font-semibold text-[#0F172A] transition-all duration-200 hover:border-[#0052FF]/40 hover:bg-[#F8FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2"
              >
                Boka demo
              </button>
            </div>

            <p className="mt-6 text-[13px] text-[#94A3B8]">
              Ingen bindningstid · Fri migrering · 14 dagar gratis
            </p>
          </div>

          {/* Höger: blå panel med produkt-preview-kort */}
          <div
            aria-hidden
            className="hero-anim hero-anim-video flex items-center justify-center rounded-[20px] bg-[#0052FF] p-8 sm:p-12 lg:p-14"
          >
            <div className="w-full max-w-[420px] rounded-xl bg-white p-4 shadow-[0_24px_48px_rgba(0,0,0,0.22)]">
              <div className="mb-3 flex gap-2">
                <div className="h-[7px] w-[60px] rounded bg-[#E2E8F0]" />
                <div className="h-[7px] w-[36px] rounded bg-[#E2E8F0]" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-[#F8FAFB] px-3 py-2.5">
                  <div className="text-[10px] text-[#64748B]">Intäkter</div>
                  <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums text-[#0F172A]">
                    842 300 kr
                  </div>
                </div>
                <div className="rounded-lg bg-[#0052FF] px-3 py-2.5">
                  <div className="text-[10px] text-white/80">Resultat</div>
                  <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums text-white">
                    530 200 kr
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-end gap-1.5" aria-hidden>
                {[52, 78, 40, 66, 90, 48, 70].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${i === 4 ? "bg-[#0052FF]" : "bg-[#DBEAFE]"}`}
                    style={{ height: `${h * 0.5}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes heroFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .hero-anim { opacity: 0; animation-fill-mode: forwards; animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-headline { animation: heroFadeUp 700ms 60ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-video    { animation: heroFadeUp 800ms 200ms forwards cubic-bezier(0.16,1,0.3,1); }
        @media (prefers-reduced-motion: reduce) { .hero-anim { opacity: 1; animation: none; } }
      `}</style>
    </section>
  );
};
