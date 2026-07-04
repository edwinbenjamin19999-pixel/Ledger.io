import { SectionLabel } from "./SectionLabel";
import aiCore from "@/assets/ai-core.png";

/**
 * MINIMALIST MODERN — inverterad slate-sektion som gör kärnbudskapet
 * ("AI som motorn, inte ett tillägg") till en bild: en Higgsfield-genererad
 * 3D-glaskärna som pulserar/roterar, omgiven av dot-textur och radial glow.
 */
const POINTS = [
  { k: "Tolkar", v: "Kvitton, fakturor och kontoutdrag läses automatiskt." },
  { k: "Konterar", v: "Varje rad klassificeras mot BAS med spårbar förklaring." },
  { k: "Förutser", v: "Likviditet och resultat projiceras i realtid." },
];

export const AIEngineSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#0F172A] py-28 md:py-36">
      {/* Textur: dot-mönster + radiala glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.04 }} />
        <div className="absolute right-[6%] top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full bg-[#0052FF] opacity-25 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          {/* Text */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <SectionLabel pulse inverted>Motorn</SectionLabel>
            </div>
            <h2 className="mt-6 text-3xl font-semibold leading-[1.1] tracking-tight text-white md:text-[3.25rem]">
              AI är inte ett tillägg.<br />
              <span className="text-[#4D7CFF]">Det är motorn.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-white/60 lg:mx-0">
              De flesta system har AI klistrat ovanpå gammal kod. Cogniq är
              byggt tvärtom — beräkningskärnan tänker, resten är bara gränssnitt.
            </p>

            <ul className="mx-auto mt-8 max-w-md space-y-4 text-left lg:mx-0">
              {POINTS.map((p) => (
                <li key={p.k} className="flex items-start gap-4">
                  <span className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#4D7CFF]">
                    {p.k}
                  </span>
                  <span className="text-sm leading-relaxed text-white/70">{p.v}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3D-kärna (svävar; videoloop ersätter bilden när den finns) */}
          <div aria-hidden className="relative flex items-center justify-center">
            <div className="ai-core-ring absolute h-[320px] w-[320px] rounded-full border border-dashed border-white/15 md:h-[420px] md:w-[420px]" />
            <video
              autoPlay
              loop
              muted
              playsInline
              poster={aiCore}
              width={1024}
              height={1024}
              className="ai-core-float relative z-10 w-full max-w-[440px] mix-blend-screen"
            >
              <source src="/ai-core.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aiCoreFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-14px) scale(1.02); } }
        .ai-core-float { animation: aiCoreFloat 7s ease-in-out infinite; }
        @keyframes aiCoreRingSpin { to { transform: rotate(360deg); } }
        .ai-core-ring { animation: aiCoreRingSpin 70s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .ai-core-float, .ai-core-ring { animation: none; } }
      `}</style>
    </section>
  );
};
