import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  GitCompareArrows,
  Receipt,
  BarChart3,
  Percent,
  Users,
} from "lucide-react";
import { CogniqLogo } from "@/components/brand/CogniqLogo";

/**
 * AGENTISK REDOVISNING HERO — mörk navy scen (matchar footerns ink-navy),
 * dot-grid + radial blå glow, produktskärm (sidebar + KPI:er + AI-flaggad
 * avvikelsepanel) som svävar ned i nästa sektion. Ersätter tidigare ljusa
 * hero: denna variant bär "granskar sig själv"-löftet visuellt genom att
 * visa AI:n som hittar och förklarar avvikelser i bokföringen.
 */
const NAV_ITEMS = [
  { label: "Översikt", icon: LayoutDashboard, active: true },
  { label: "Avstämningar", icon: GitCompareArrows, active: false },
  { label: "Verifikat", icon: Receipt, active: false },
  { label: "Rapporter", icon: BarChart3, active: false },
  { label: "Moms & skatt", icon: Percent, active: false },
  { label: "Kunder", icon: Users, active: false },
] as const;

const KPIS = [
  { label: "Likvida medel", value: "1 284 500", delta: "▲ 8,2% mot förra mån", positive: false },
  { label: "Resultat YTD", value: "+342 100", delta: "▲ 14,6%", positive: true },
  { label: "Avvikelser", value: "6", delta: "3 kräver åtgärd", positive: false },
] as const;

const FLAGS = [
  { code: "B57", text: "Kundfordran konterad bort utan registrerat inflöde", value: "−48 200", negative: true },
  { code: "V112", text: "Moms 25% på leverantörsfaktura saknar underlag", value: "−12 050", negative: true },
  { code: "B65", text: "Periodisering föreslagen — hyra kv.4", value: "löst", negative: false },
] as const;

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section id="hero-section" className="relative w-full bg-[#0B1D2A] pt-[60px]">
      {/* Radial blå glow + dot-grid — egen overflow-hidden yta, stör inte overlap nedanför */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1100px 520px at 72% -6%, rgba(0,82,255,0.30), transparent 60%), radial-gradient(700px 400px at 6% 8%, rgba(77,124,255,0.14), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(900px 500px at 50% 0%, #000, transparent 75%)",
            WebkitMaskImage: "radial-gradient(900px 500px at 50% 0%, #000, transparent 75%)",
          }}
        />
      </div>

      <div className="relative z-[2] mx-auto max-w-3xl px-6 pt-20 pb-2 text-center md:pt-24">
        <div className="hero-anim hero-anim-badge inline-flex items-center gap-2.5 rounded-full border border-white/15 px-4 py-1.5 text-[12.5px] text-white/80">
          <span aria-hidden className="hero-live-dot h-1.5 w-1.5 rounded-full bg-[#4D7CFF]" />
          AI-native bokföring · byggd för svenska bolag
        </div>

        <h1 className="hero-anim hero-anim-headline mt-7 font-display text-[2.6rem] font-bold leading-[1.03] tracking-[-0.03em] text-white md:text-6xl lg:text-[4.3rem]">
          Bokföring som<br />
          <span className="text-[#4D7CFF]">redan är gjord.</span>
        </h1>

        <p className="hero-anim hero-anim-sub mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/70">
          Cogniq kopplar din bank, bokför automatiskt och stämmer av varje
          natt. Du driver bolaget — din AI-ekonom sköter siffrorna.
        </p>

        <div className="hero-anim hero-anim-cta mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/auth")}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0052FF] px-7 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(0,40,120,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0040CC] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1D2A] sm:w-auto"
          >
            Kom igång gratis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </button>
          <button
            onClick={() => navigate("/contact")}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/[0.22] bg-white/[0.06] px-7 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1D2A] sm:w-auto"
          >
            Boka demo
          </button>
        </div>

        <p className="hero-anim hero-anim-cta mt-8 text-sm text-white/50">
          Ingen bindningstid · Fri migrering · 14 dagar gratis
        </p>
      </div>

      {/* Produktskärm — svävar ned över nästa sektion (kompenseras av dess top-padding) */}
      <div className="hero-anim hero-anim-video relative z-[2] mx-auto -mb-28 mt-14 max-w-[1000px] px-6 md:-mb-32 md:mt-16">
        <div className="overflow-hidden rounded-2xl border border-[#16273a] bg-white shadow-[0_40px_80px_-32px_rgba(4,18,40,0.55),0_2px_6px_rgba(4,18,40,0.2)]">
          {/* Fönsterlist */}
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
            <span className="h-[11px] w-[11px] rounded-full bg-[#FF5F57]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#FEBC2E]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#28C840]" />
            <span className="ml-3.5 font-mono text-xs text-slate-400">app.cogniq.se/oversikt</span>
          </div>

          <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[200px_1fr]">
            {/* Sidebar */}
            <aside className="hidden flex-col gap-0.5 bg-[#0B1D2A] p-3.5 md:flex">
              <div className="px-1 pb-4 pt-1">
                <CogniqLogo size={20} reversed />
              </div>
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] ${
                    item.active ? "bg-white/[0.09] text-white" : "text-white/60"
                  }`}
                >
                  <item.icon className="h-[14px] w-[14px]" strokeWidth={2} aria-hidden />
                  {item.label}
                </div>
              ))}
            </aside>

            {/* Huvudyta */}
            <div className="bg-[#FAFBFD] p-5 md:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[19px] font-semibold tracking-tight text-[#0F172A]">
                    Översikt
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Cogniq Demo AB · Räkenskapsår 2025
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                  Exportera
                </span>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {KPIS.map((k) => (
                  <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                      {k.label}
                    </div>
                    <div
                      className={`mt-2 font-mono text-[21px] tracking-tight tabular-nums ${
                        k.positive ? "text-emerald-600" : "text-[#0F172A]"
                      }`}
                    >
                      {k.value}
                    </div>
                    <div className={`mt-1 text-[11px] ${k.delta.startsWith("▲") ? "text-emerald-600" : "text-slate-500"}`}>
                      {k.delta}
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
                  <span className="grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-lg bg-[#EAF0FF] text-[#0052FF]">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="text-[12.5px] font-semibold text-[#0F172A]">
                    Cogniq hittade 6 avvikelser i bokföringen
                  </span>
                  <span className="ml-auto whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 font-mono text-[10px] text-red-600">
                    3 nya
                  </span>
                </div>
                {FLAGS.map((f) => (
                  <div
                    key={f.code}
                    className="flex items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-[12.5px]"
                  >
                    <span className="w-[46px] flex-shrink-0 font-mono text-[10px] text-slate-400">
                      {f.code}
                    </span>
                    <span className="flex-1 text-slate-600">{f.text}</span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        f.negative ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
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
        @keyframes heroLivePulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }
        .hero-live-dot { animation: heroLivePulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-anim { opacity: 1; animation: none; }
          .hero-live-dot { animation: none; }
        }
      `}</style>
    </section>
  );
};
