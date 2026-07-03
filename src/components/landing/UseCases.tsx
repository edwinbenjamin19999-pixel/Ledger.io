import { Building2, Users, BarChart3, TrendingUp } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CASES = [
  {
    icon: Building2,
    title: "För företagaren",
    desc: "Slipp bokföringen helt. Ledger.io konterar, stämmer av och håller dig redo för deklaration — utan att du behöver förstå ett enda kontonummer.",
    outcome: "→ Från 0 till full kontroll på dagen.",
  },
  {
    icon: Users,
    title: "För redovisningsbyrån",
    desc: "Hantera fler klienter med samma team. White label, multi-tenant och automatiserade kontroller — så du kan fokusera på rådgivning istället för datainmatning.",
    outcome: "→ Skala utan att anställa.",
  },
  {
    icon: BarChart3,
    title: "För ekonomichefen",
    desc: "Realtidsdata, automatiserade rapporter och AI-driven prognos. Slipp manuell rapportsamling — fokusera på besluten istället för siffrorna.",
    outcome: "→ CFO-funktionalitet utan CFO-kostnad.",
  },
  {
    icon: TrendingUp,
    title: "För tillväxtbolaget",
    desc: "Budget, prognos och kassaflödesanalys i realtid. Se 12 månader framåt baserat på din faktiska data — inte på gissningar i ett kalkylblad.",
    outcome: "→ Väx med full ekonomisk kontroll.",
  },
];

export const UseCases = () => {
  const reveal = useScrollReveal<HTMLDivElement>();
  return (
    <section className="section-shell">
      <div ref={reveal.ref} className={`section-inner ${reveal.className}`}>
        <p className="section-label">För vem</p>
        <h2
          className="section-headline text-4xl md:text-5xl font-[700] leading-[1.05]"
          style={{ letterSpacing: "-0.8px" }}
        >
          Ett system. <span style={{ color: "#3b82f6" }}>Fyra roller.</span>
        </h2>
        <p className="section-lede text-[15px] leading-relaxed max-w-2xl">
          Ledger.io anpassar sig efter vem du är och vad du behöver — utan att du byter system.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {CASES.map(({ icon: Icon, title, desc, outcome }) => (
            <div
              key={title}
              className="dark-surface-card"
              style={{ padding: "28px 24px" }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: "rgba(29,217,240,0.12)" }}>
                <Icon className="w-5 h-5" style={{ color: "#3b82f6" }} />
              </div>
              <h3
                className="text-xl font-[700] text-white mb-2 tracking-tight"
                style={{ letterSpacing: "-0.5px" }}
              >
                {title}
              </h3>
              <p className="text-[14px] text-white/55 leading-relaxed">
                {desc}
              </p>
              <p className="text-[13px] text-[#3b82f6] font-medium mt-3">
                {outcome}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
