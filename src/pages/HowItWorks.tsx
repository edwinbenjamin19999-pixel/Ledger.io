import { useEffect } from "react";
import { CheckCircle2, ShieldCheck, RotateCcw, GraduationCap, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AUTO_CONFIDENCE_THRESHOLD } from "@/lib/aiValueSettings";

interface Section {
  icon: typeof CheckCircle2;
  title: string;
  intro: string;
  items: { label: string; detail?: string }[];
}

const AUTO_PCT = Math.round(AUTO_CONFIDENCE_THRESHOLD * 100);

const SECTIONS: Section[] = [
  {
    icon: Sparkles,
    title: "Vad AI gör automatiskt",
    intro: `Följande sker utan att du behöver göra något — men endast när konfidensen ligger på minst ${AUTO_PCT}%. Allt loggas i AI-aktivitetsloggen.`,
    items: [
      { label: "Kontering av transaktioner", detail: `När leverantör, belopp och historik matchar tidigare bokföringar med ≥ ${AUTO_PCT}% säkerhet.` },
      { label: "Bankmatchning", detail: "Fakturor matchas mot bankhändelser när belopp och datum stämmer ±5 kr / 5 dagar." },
      { label: "Momsberäkning", detail: "25/12/6% bestäms från BAS-konto och leverantörsdata. EU-moms hanteras enligt OSS-regler." },
      { label: "Periodisering", detail: "Återkommande kostnader (försäkringar, abonnemang) periodiseras enligt fakturans giltighetstid." },
      { label: "Påminnelser till kunder", detail: "Skickas enligt din inställda kadens — du ser alltid utskickslogg." },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Vad du alltid godkänner själv",
    intro: "Vissa åtgärder är permanenta eller kräver mänskligt omdöme. Dessa gör AI aldrig på egen hand.",
    items: [
      { label: "Betalningar och bankgirering", detail: "AI förbereder betalförslag, men signering och utskick gör du." },
      { label: "Inlämning till Skatteverket", detail: "Moms, AGI, INK2 — allt kräver din digitala signatur innan inlämning." },
      { label: "Bokslut och årsredovisning", detail: "AI tar fram förslag och underlag; du godkänner varje justeringspost." },
      { label: "Avskrivning eller borttagning av poster", detail: "Permanenta ändringar kräver alltid en bekräftelse." },
      { label: "Ändringar av användarrättigheter och företagsinställningar", detail: "Hanteras endast av administratörer." },
    ],
  },
  {
    icon: RotateCcw,
    title: "Vad händer om AI har fel?",
    intro: "Inget är någonsin permanent dolt. Felaktiga AI-åtgärder kan rättas eller backas direkt — och allt lämnar revisionsspår.",
    items: [
      { label: "Rätta", detail: "Ändra konto, moms eller belopp. AI registrerar din ändring som en korrigering och uppdaterar sin modell för det här bolaget." },
      { label: "Backa (reversera)", detail: "Skapar en motbokningspost enligt BFL — originalposten behålls för revision." },
      { label: "Spårbarhet", detail: "Varje AI-beslut har en post i AI-aktivitetsloggen med tidsstämpel, konfidens och underlag." },
      { label: "Revisorbehörighet", detail: "Din revisor får läsbehörighet och ser exakt vilka poster AI gjort autonomt vs. vilka du godkänt." },
    ],
  },
  {
    icon: GraduationCap,
    title: "Hur AI blir bättre",
    intro: "AI lär sig per bolag — inte över bolag. Din historik förbättrar dina egna förslag, inga andras.",
    items: [
      { label: "Korrigeringar = träningsdata", detail: "När du rättar en kontering används det som signal nästa gång samma leverantör eller mönster dyker upp." },
      { label: "Konfidens kalibreras kontinuerligt", detail: "Om AI ofta har fel på en viss kostnadstyp sänks konfidensen och du får ett förslag istället för en autobokning." },
      { label: "Inga delade modeller mellan kunder", detail: "Bolagets transaktioner används aldrig för att träna en gemensam modell. Multi-tenant-isolering är hård." },
      { label: "Du styr nivån", detail: "I AI-inställningar kan du sänka eller höja tröskeln för autonom kontering, eller stänga av den helt per kontoplan." },
    ],
  },
];

export default function HowItWorks() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Hur Ledger.io fungerar | Transparens och kontroll";
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") || "";
    meta?.setAttribute(
      "content",
      "Faktisk beskrivning av vilka beslut Ledger.io fattar automatiskt, vilka som alltid kräver din godkänning, och hur korrigeringar hanteras.",
    );
    return () => {
      document.title = prevTitle;
      meta?.setAttribute("content", prevDesc);
    };
  }, []);

  return (
    <>

      <PageHeader
        icon={Sparkles}
        title="Hur Ledger.io fungerar"
        subtitle="Faktisk beskrivning av AI:ns roll, gränser och spårbarhet — skriven för dig som vill förstå systemet innan du litar på det."
      />

      <div className="px-8 pb-16 max-w-[840px] mx-auto space-y-8">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="bg-white rounded-3xl border-[0.5px] border-slate-200 p-7">
              <header className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4.5 w-4.5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-0.5">Avsnitt {idx + 1}</div>
                  <h2 className="text-[18px] font-medium text-slate-900">{section.title}</h2>
                </div>
              </header>
              <p className="text-[14px] text-slate-600 mb-5 leading-[1.6]">{section.intro}</p>
              <ul className="space-y-3.5">
                {section.items.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-slate-900">{item.label}</div>
                      {item.detail && (
                        <div className="text-[13px] text-slate-600 leading-[1.55] mt-0.5">{item.detail}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="text-[12px] text-slate-500 text-center pt-2">
          Saknar du något här? <a href="/contact" className="text-[#3b82f6] underline decoration-dotted underline-offset-2">Hör av dig</a> så uppdaterar vi sidan.
        </p>
      </div>
    </>
  );
}
