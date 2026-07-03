import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useWaitlistCount } from "@/hooks/useWaitlistCount";

/**
 * FLAT POSTER HERO — solitt blått block (blue-600), hierarki via skala och
 * vikt. Dekoration = stora geometriska former i låg opacitet, aldrig blur
 * eller glow. CTA-feedback via färgskifte + skala, aldrig skuggor.
 */
export const Hero = () => {
  const navigate = useNavigate();
  const { count } = useWaitlistCount();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    }
  };
  const scrollToHowItWorks = () => scrollToId("how-it-works");

  return (
    <section
      id="hero-section"
      className="relative w-full overflow-hidden bg-[#2563EB] pt-[60px]"
    >
      {/* Geometrisk dekoration — platta former, låg opacitet (posterprincip) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-white/5" />
        <div className="absolute top-1/3 -left-32 w-[340px] h-[340px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-120px] right-[12%] w-[260px] h-[260px] bg-white/5 rotate-12" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        {/* Badge — solid amber-tagg, versaler */}
        <div className="flex justify-center hero-anim hero-anim-badge">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F59E0B] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#0F1B2D]">
            AI som kärna — inte som ett lager
          </span>
        </div>

        {/* Headline — extra bold, tight */}
        <h1 className="hero-anim hero-anim-headline mt-6 text-white font-extrabold tracking-tight leading-[1.05] text-[clamp(40px,6.5vw,76px)]">
          Ekonomin på autopilot.
        </h1>

        {/* Subheadline */}
        <p className="hero-anim hero-anim-sub mx-auto mt-6 max-w-xl text-lg leading-relaxed text-blue-50">
          Det enda ekonomisystemet där AI inte är ett tillägg — det är motorn.
          Bokföring, moms, budget, prognos och rapportering i ett system som
          tänker själv.
        </p>

        {/* CTAs — vit solid + tjock outline (border-4), fylls vid hover */}
        <div className="hero-anim hero-anim-cta mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate("/auth")}
            className="h-14 rounded-md bg-white px-8 text-base font-bold text-[#0F1B2D] transition-all duration-200 hover:scale-105 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2563EB] inline-flex items-center gap-2"
          >
            Kom igång gratis
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={scrollToHowItWorks}
            className="h-14 rounded-md border-4 border-white bg-transparent px-6 text-base font-semibold text-white transition-all duration-200 hover:bg-white hover:text-[#0F1B2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2563EB]"
          >
            Se hur det fungerar ↓
          </button>
        </div>

        {/* Social proof — ärlig status, hög kontrast på blått */}
        <div className="hero-anim hero-anim-cta mt-10 border-t-2 border-white/20 pt-6">
          <p className="text-sm font-medium text-white">
            <span
              aria-hidden
              className="hero-live-dot mr-2 inline-block h-2 w-2 rounded-full bg-emerald-300 align-middle"
            />
            {count.toLocaleString("sv-SE")} anmälda · 14 aktiva pilotkunder · Lansering Q3 2026
          </p>
          <p className="mx-auto mt-5 max-w-xl text-xs font-semibold uppercase tracking-[0.15em] text-blue-100">
            Bokföring · Moms · Löner · Budget · Prognos · Rapportering · Revision · API
          </p>
        </div>

        {/* Produkt-mockup — vit platt ram, ingen skugga: kontrasten gör jobbet */}
        <div className="hero-anim hero-anim-video mx-auto mt-14 max-w-[820px]">
          <div className="overflow-hidden rounded-lg bg-white p-1.5">
            {/* Browser chrome — flat grå list */}
            <div className="flex items-center gap-1.5 rounded-t-md bg-gray-100 px-3.5 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <div className="ml-2 flex h-5 max-w-[260px] flex-grow items-center rounded bg-white px-2.5">
                <span className="text-[11px] text-gray-400 hero-urlbar-text">app.bokfy.se</span>
              </div>
            </div>

            {/* Branded fallback-yta bakom videon — aldrig en tom svart ruta */}
            <div
              aria-hidden={false}
              className="relative w-full overflow-hidden rounded-b-md"
              style={{ aspectRatio: "16 / 10", background: "#0F1B2D" }}
            >
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                }}
              />
              <video
                autoPlay
                loop
                muted
                playsInline
                poster="/hero-demo-poster.jpg"
                className="absolute inset-0 block h-full w-full object-cover"
              >
                <source src="/hero-demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={scrollToHowItWorks}
            aria-label="Scrolla ned"
            className="text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-md"
          >
            <ChevronDown size={22} className="hero-chevron" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeUpLg {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDown {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50%      { transform: translateY(6px); opacity: 1; }
        }
        .hero-anim { opacity: 0; animation-fill-mode: forwards; animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-badge    { animation: heroFadeUp 400ms 0ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-headline { animation: heroFadeUp 400ms 80ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-sub      { animation: heroFadeUp 400ms 160ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-cta      { animation: heroFadeUp 400ms 240ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-video    { animation: heroFadeUpLg 600ms 360ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-chevron       { animation: pulseDown 1.5s ease infinite; }
        @keyframes heroLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.3); }
        }
        .hero-live-dot { animation: heroLivePulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-anim { opacity: 1; animation: none; }
          .hero-chevron, .hero-live-dot { animation: none; }
        }
        @media (max-width: 640px) {
          .hero-urlbar-text { display: none; }
        }
      `}</style>
    </section>
  );
};
