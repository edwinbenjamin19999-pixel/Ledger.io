import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import { useWaitlistCount } from "@/hooks/useWaitlistCount";
import { SectionLabel } from "./SectionLabel";

/**
 * MINIMALIST MODERN HERO — asymmetriskt 1.1fr/0.9fr-grid på varm off-white.
 * Vänster: Calistoga-rubrik med gradient-text + gradient-underline på
 * nyckelordet, gradient-CTA. Höger: Higgsfield-genererad 3D-glaskomposition
 * som svävar, roterande streckad ring, två flytande KPI-kort.
 * Under: produktvideon i upphöjt skuggat kort.
 */
export const Hero = () => {
  const navigate = useNavigate();
  const { count } = useWaitlistCount();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section id="hero-section" className="relative w-full overflow-hidden bg-background bg-dot-grid pt-[60px]">
      {/* Radial accent-glow — atmosfäriskt djup, känns mer än syns */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-[-10%] h-[600px] w-[600px] rounded-full bg-[#0052FF] opacity-[0.08] blur-[150px]" />
        <div className="absolute bottom-0 left-[-10%] h-[400px] w-[400px] rounded-full bg-[#4D7CFF] opacity-[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-10 lg:pt-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          {/* ── Vänster: text ── */}
          <div className="text-center lg:text-left">
            <div className="hero-anim hero-anim-badge flex justify-center lg:justify-start">
              <SectionLabel pulse>Beslutsintelligens för växande bolag</SectionLabel>
            </div>

            <h1 className="hero-anim hero-anim-headline mt-8 font-display text-[2.75rem] leading-[1.05] tracking-[-0.02em] text-foreground md:text-6xl lg:text-[4.6rem]">
              Ekonomin som{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="text-[#0052FF]">tänker själv.</span>
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-3 w-full rounded-sm bg-[#0052FF]/15 md:-bottom-2 md:h-4"
                />
              </span>
            </h1>

            <p className="hero-anim hero-anim-sub mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              Cogniq bokför, stämmer av och deklarerar automatiskt — och
              förvandlar varje siffra till prognoser, varningar och beslut du
              kan lita på. Byggt för svenska regler, spårbart in i minsta
              verifikat.
            </p>

            <div className="hero-anim hero-anim-cta mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <button
                onClick={() => navigate("/auth")}
                className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0052FF] px-8 text-base font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0040CC] hover:shadow-accent-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 sm:w-auto"
              >
                Gå med i piloten
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </button>
              <button
                onClick={() => scrollToId("how-it-works")}
                className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-border bg-card px-6 text-base font-semibold text-foreground transition-all duration-200 hover:border-[#0052FF]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 sm:w-auto"
              >
                Se Cogniq i arbete ↓
              </button>
            </div>

            {/* Social proof */}
            <div className="hero-anim hero-anim-cta mt-10 border-t border-border pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                <span aria-hidden className="hero-live-dot mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />
                <span className="font-semibold text-foreground tabular-nums">
                  {count.toLocaleString("sv-SE")}
                </span>{" "}
                anmälda · 14 aktiva pilotkunder · Lansering Q3 2026
              </p>
            </div>
          </div>

          {/* ── Höger: abstrakt svävande UI-komposition (ref-stil) ── */}
          <div aria-hidden className="relative hidden h-[480px] select-none lg:block">
            {/* Roterande streckad ring — glaciärt långsam */}
            <div className="hero-ring absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[#0052FF]/20" />

            {/* Stort skelett-kort */}
            <div className="hero-float-slow absolute left-[6%] top-[10%] z-10 w-[300px] rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#0052FF]/15" />
                <div className="space-y-2">
                  <div className="h-2.5 w-32 rounded-full bg-muted" />
                  <div className="h-2 w-20 rounded-full bg-muted" />
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="h-2 w-full rounded-full bg-muted" />
                <div className="h-2 w-4/5 rounded-full bg-muted" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-10 rounded-lg bg-gradient-to-br from-[#0052FF]/15 to-[#4D7CFF]/10" />
                <div className="h-10 rounded-lg bg-muted" />
                <div className="h-10 rounded-lg bg-muted" />
              </div>
            </div>

            {/* Mindre överlappande kort */}
            <div className="hero-float-a absolute bottom-[16%] left-[30%] z-20 w-[220px] rounded-2xl border border-border bg-card p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="h-8 w-8 rounded-full bg-[#0052FF]" />
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} className="h-1 w-1 rounded-full bg-[#0052FF]/30" />
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-2 w-full rounded-full bg-muted" />
                <div className="h-2 w-2/3 rounded-full bg-muted" />
              </div>
            </div>

            {/* Mini-statkort */}
            <div className="hero-float-b absolute right-[2%] top-[22%] z-20 rounded-xl border border-border bg-card px-4 py-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0052FF] text-white">
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Kontering</div>
                  <div className="text-sm font-semibold text-foreground">98% konfidens</div>
                </div>
              </div>
            </div>

            {/* Likviditets-kort */}
            <div className="hero-float-a absolute bottom-[4%] right-[10%] z-20 rounded-xl border border-border bg-card px-4 py-3 shadow-xl" style={{ animationDelay: "1.2s" }}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <TrendingUp className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Likviditet</div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">+12,4%</div>
                </div>
              </div>
            </div>

            {/* Live-pill */}
            <div className="absolute bottom-[24%] left-[4%] z-20 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 shadow-md">
              <span className="hero-live-dot h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-foreground">AI bokför — live</span>
            </div>

            {/* Hörnaccent — solid blå kloss */}
            <div className="absolute right-[6%] bottom-[30%] z-0 h-12 w-12 rounded-xl bg-[#0052FF] opacity-90 shadow-accent" />
            {/* Blå cirkel bakom */}
            <div className="absolute left-[16%] bottom-[6%] z-0 h-16 w-16 rounded-full bg-gradient-to-br from-[#0052FF]/20 to-[#4D7CFF]/10" />
          </div>
        </div>

        {/* ── Produktvideo i upphöjt kort ── */}
        <div className="hero-anim hero-anim-video mx-auto mt-16 max-w-[880px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
            <div className="flex items-center gap-1.5 rounded-t-xl bg-muted px-3.5 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <div className="ml-2 flex h-5 max-w-[260px] flex-grow items-center rounded-md bg-card px-2.5">
                <span className="font-mono text-[11px] text-muted-foreground hero-urlbar-text">app.cogniq.se</span>
              </div>
            </div>
            <div className="relative w-full overflow-hidden rounded-b-xl" style={{ aspectRatio: "16 / 10", background: "#0F172A" }}>
              <video autoPlay loop muted playsInline poster="/hero-demo-poster.jpg" className="absolute inset-0 block h-full w-full object-cover">
                <source src="/hero-demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-anim { opacity: 0; animation-fill-mode: forwards; animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-badge    { animation: heroFadeUp 700ms 0ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-headline { animation: heroFadeUp 700ms 100ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-sub      { animation: heroFadeUp 700ms 200ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-cta      { animation: heroFadeUp 700ms 300ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-video    { animation: heroFadeUp 800ms 450ms forwards cubic-bezier(0.16,1,0.3,1); }
        @keyframes heroRingSpin { to { transform: translate(-50%,-50%) rotate(360deg); } }
        .hero-ring { animation: heroRingSpin 60s linear infinite; }
        @keyframes heroFloatSlow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .hero-float-slow { animation: heroFloatSlow 6s ease-in-out infinite; }
        @keyframes heroFloatA { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .hero-float-a { animation: heroFloatA 5s ease-in-out infinite; }
        @keyframes heroFloatB { 0%,100% { transform: translateY(0); } 50% { transform: translateY(10px); } }
        .hero-float-b { animation: heroFloatB 4s ease-in-out 0.6s infinite; }
        @keyframes heroLivePulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }
        .hero-live-dot { animation: heroLivePulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-anim { opacity: 1; animation: none; }
          .hero-ring, .hero-float-slow, .hero-float-a, .hero-float-b, .hero-live-dot { animation: none; }
        }
        @media (max-width: 640px) { .hero-urlbar-text { display: none; } }
      `}</style>
    </section>
  );
};
