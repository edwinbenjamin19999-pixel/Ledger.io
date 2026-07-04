import { Building2, Users, BarChart3, TrendingUp } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CASES = [
  {
    icon: Building2,
    title: "För företagaren",
    desc: "Slipp bokföringen helt. Cogniq konterar, stämmer av och håller dig redo för deklaration — utan att du behöver förstå ett enda kontonummer.",
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

/**
 * FLAT "EMERALD BENEFITS"-BLOCK — helt emerald-600-block (posterprincip:
 * en sektion, en färg). Vita ikon-cirklar med emerald-ikon, white/10-kort.
 * AA: vit text på #059669 passerar.
 */
export const UseCases = () => {
  const reveal = useScrollReveal<HTMLDivElement>();
  return (
    <section className="relative overflow-hidden bg-[#0F172A] py-24 px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[8%] h-[320px] w-[320px] rounded-full bg-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-[220px] w-[220px] rotate-12 bg-white/10"
      />
      <div ref={reveal.ref} className={`relative mx-auto max-w-5xl ${reveal.className}`}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">
          För vem
        </p>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.05] text-white">
          Ett system. Fyra roller.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/85">
          Cogniq anpassar sig efter vem du är och vad du behöver — utan att
          du byter system.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {CASES.map(({ icon: Icon, title, desc, outcome }) => (
            <div
              key={title}
              className="group rounded-lg bg-white/10 p-7 transition-all duration-200 hover:scale-[1.02] hover:bg-white/[0.16]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#059669] transition-transform duration-200 group-hover:scale-110">
                <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              </div>
              <h3 className="mb-2 text-xl font-bold tracking-tight text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-white/85">{desc}</p>
              <p className="mt-3 text-[13px] font-bold text-white">{outcome}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
