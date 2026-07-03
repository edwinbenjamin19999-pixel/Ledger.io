import { useNavigate } from "react-router-dom";
import {
  Layers,
  Workflow,
  LineChart,
  Building2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveStatusBar } from "@/components/roadmap/LiveStatusBar";
import { CapabilityLayerCard, type LayerStatus } from "@/components/roadmap/CapabilityLayerCard";
import { WhiteLabelLayer } from "@/components/roadmap/WhiteLabelLayer";

const phases: Array<{
  icon: typeof Layers;
  title: string;
  description: string;
  capabilities: string[];
  audience: string;
  status: LayerStatus;
}> = [
  {
    icon: Layers,
    title: "Fas 1 — Core Platform",
    description:
      "Grunden för bokföring, fakturering och moms är fullt implementerad och används aktivt av företag i Sverige.",
    capabilities: [
      "Dubbel bokföring enligt BAS 2026",
      "Fakturering, kund- och leverantörsreskontra",
      "Momshantering (SKV 4700) med full validering",
      "Bankintegration via PSD2 (Enable Banking)",
      "Verifikationsregister med spårbarhet",
    ],
    audience: "SME, egenföretagare, små bolag",
    status: "live",
  },
  {
    icon: Workflow,
    title: "Fas 2 — Workflow & Efficiency",
    description:
      "Dagliga ekonomiflöden är optimerade för att minimera manuellt arbete och skapa ett effektivt arbetssätt.",
    capabilities: [
      "AI-driven kontering med 94% automationsgrad",
      "Automatisk matchning bank ↔ verifikat",
      "Utläggshantering med kvitto-OCR",
      "Periodiseringsmotor och bokslutsjusteringar",
      "Direktbetalningar och betalningsförslag",
    ],
    audience: "Ekonomiansvariga, controllers",
    status: "live",
  },
  {
    icon: LineChart,
    title: "Fas 3 — Insight & Control",
    description:
      "Ger företag och rådgivare full kontroll genom realtidsinsikter och analys.",
    capabilities: [
      "AI CFO med proaktiva insikter",
      "Kassaflödesprognos i 12-månaders scenarier",
      "Finansiell analys (Utfall vs Budget vs Prognos)",
      "Drill-down från rapport till verifikat",
      "Anomali- och bedrägeridetektering",
    ],
    audience: "CFO:er, rådgivare, styrelser",
    status: "expanding",
  },
  {
    icon: Building2,
    title: "Fas 4 — Structure & Scale",
    description:
      "Utvecklad för växande bolag och redovisningsbyråer med behov av struktur och skalbarhet.",
    capabilities: [
      "Multi-bolag och koncernkonsolidering",
      "Byråportal med klienthantering",
      "Roll- och behörighetsstyrning (RBAC)",
      "Godkännandeflöden och attesthierarki",
      "API-first arkitektur för integrationer",
    ],
    audience: "Redovisningsbyråer, koncerner",
    status: "expanding",
  },
  {
    icon: Sparkles,
    title: "Fas 5 — AI & Automation",
    description:
      "Utvecklingen mot en autonom ekonomiplattform där AI hanterar stora delar av bokföringen.",
    capabilities: [
      "Autonom bokslutsmotor (zero-touch close)",
      "Self-learning regelmotor per bolag",
      "AI-driven årsredovisning (K2/K3)",
      "Voice-first mobile assistant",
      "Predictive compliance & skattesimulering",
    ],
    audience: "Hela plattformen",
    status: "next",
  },
];

const summaryBullets = [
  "Plattformen används i verkliga scenarier",
  "Designad för svenska regelverk",
  "Byggd för att skala med företag och byråer",
  "AI är integrerat i kärnan — inte ett tillägg",
];

const ProductRoadmap = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <header className="border-b border-slate-900/[0.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm font-semibold tracking-tight text-slate-900 hover:text-slate-700"
          >
            Ledger.io
          </button>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="ghost"
            className="h-9 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Till Dashboard
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        {/* Hero */}
        <section className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-900/[0.06] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Product Evolution
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl md:leading-[1.1]">
            En levande finansiell plattform — byggd för att skala.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            Ledger.io är i produktion och driver bokföring, fakturering och moms för riktiga
            företag. Här är de lager som utgör plattformen idag — och vart vi rör oss härnäst.
          </p>
        </section>

        {/* Live Status */}
        <section className="mt-12">
          <LiveStatusBar />
        </section>

        {/* Capability Layers */}
        <section className="mt-16 space-y-5 md:mt-20">
          {phases.map((phase) => (
            <CapabilityLayerCard key={phase.title} {...phase} />
          ))}
        </section>

        {/* White Label */}
        <section className="mt-16 md:mt-20">
          <WhiteLabelLayer />
        </section>

        {/* Strategic Summary */}
        <section className="mt-16 md:mt-20">
          <div className="rounded-[22px] border border-slate-900/[0.06] bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] md:p-12">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              En stabil grund — och en tydlig riktning.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
              Ledger.io är idag en stabil och fungerande plattform för bokföring och
              ekonomihantering. Fokus framåt ligger på automation, intelligens och
              skalbarhet — både för företag och redovisningsbyråer.
            </p>
            <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {summaryBullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d9488]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900/[0.06] py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Ledger.io · Infrastructure for Swedish finance
      </footer>
    </div>
  );
};

export default ProductRoadmap;
