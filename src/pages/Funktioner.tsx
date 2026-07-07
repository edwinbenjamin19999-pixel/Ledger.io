import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import {
  Zap, Landmark, ShieldCheck, Users, Percent, FileText,
  RefreshCw, Upload, Calendar, Download, ArrowRight,
} from "lucide-react";

/**
 * FLAT POSTER-SIDA — blå header-block → vit funktionsgrid med tintade
 * kort + solida ikon-cirklar → amber CTA-block. Lucide-ikoner (systemets
 * ikonbibliotek) ersätter handskrivna SVG:er.
 */
const FEATURES: { icon: typeof Zap; title: string; body: string }[] = [
  {
    icon: Zap,
    title: "Automatisk kontering",
    body: "Varje transaktion klassificeras mot rätt konto i BAS-kontoplanen. Moms beräknas per rad. Precision över 94% direkt ur lådan.",
  },
  {
    icon: Landmark,
    title: "Bankintegration i realtid",
    body: "Direktkoppling mot din bank via Open Banking. Transaktioner hämtas automatiskt — inga manuella importer eller CSV-filer.",
  },
  {
    icon: ShieldCheck,
    title: "Du godkänner alltid",
    body: "AI bokför — du granskar. Varje post är spårbar till källtransaktionen och låses först när du godkänner.",
  },
  {
    icon: Users,
    title: "Bjud in hela teamet",
    body: "VD bjuder in CFO, ekonom eller kollega. Alla ser samma bokföring i realtid — med rätt behörighet för varje roll. Utlägg registreras av den som gjort dem, inte av administratören.",
  },
  {
    icon: Percent,
    title: "Momshantering",
    body: "Utgående och ingående moms beräknas automatiskt per transaktion. Momsdeklarationen är alltid redo.",
  },
  {
    icon: FileText,
    title: "Löpande bokslut",
    body: "Resultat- och balansräkning uppdateras i realtid. Du ser alltid var företaget står — ingen väntan på månadsslut.",
  },
  {
    icon: RefreshCw,
    title: "Kontinuerlig bankavstämning",
    body: "Banksaldo stäms av mot verifikat automatiskt. Avvikelser flaggas direkt — inte vid nästa revision.",
  },
  {
    icon: Upload,
    title: "Kvittohantering",
    body: "Fotografera kvittot — AI tolkar, konterar och matchar mot rätt transaktion. Fysiska kvitton behövs aldrig.",
  },
  {
    icon: Calendar,
    title: "Deklarationsredo",
    body: "Momsdeklaration, arbetsgivardeklaration och årsredovisning förbereds automatiskt. Du eller din revisor granskar och signerar.",
  },
  {
    icon: Download,
    title: "SIE-export",
    body: "Exportera all bokföring i SIE-format när som helst. Fullt kompatibelt med alla svenska bokföringsprogram. Ingen inlåsning.",
  },
];

export default function Funktioner() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Blått poster-huvud */}
      <section className="relative overflow-hidden bg-[#0052FF] pt-[60px]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-[380px] w-[380px] rounded-full bg-white/5" />
          <div className="absolute -bottom-24 left-[10%] h-[200px] w-[200px] rotate-12 bg-white/5" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 pt-20 pb-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-100">
            Plattformen
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Allt du behöver. Inget du inte behöver.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-50">
            Cogniq sköter hela ekonomifunktionen i bakgrunden — från transaktion till deklaration, och vidare till prognos och beslut.
          </p>
        </div>
      </section>

      {/* Funktionsgrid — vit sektion, grå kortblock, blå ikon-cirklar */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0052FF] text-white transition-transform duration-200 group-hover:scale-110">
                  <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                </div>
                <h3 className="mt-5 text-base font-bold text-[#0F172A]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0F172A]/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blått CTA-block */}
      <section className="relative overflow-hidden bg-[#0052FF] py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-[280px] w-[280px] rounded-full bg-white/10"
        />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Redo för en ekonomi som ligger steget före?
          </h2>
          <p className="mt-3 text-base text-blue-50">
            Pilotfas pågår — begränsat antal platser inför lansering Q3 2026.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="mt-8 inline-flex h-14 items-center gap-2 rounded-md bg-white px-8 text-base font-bold text-[#0052FF] transition-all duration-200 hover:scale-105 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0052FF]"
          >
            Gå med i piloten
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </section>
    </div>
  );
}
