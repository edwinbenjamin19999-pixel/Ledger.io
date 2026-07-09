import { Zap, GitCompareArrows, Percent, ShieldCheck, LineChart, Sparkles } from "lucide-react";

/**
 * Funktionssektion (Cogniq Design System): "Hela bokföringen. Automatiserad."
 * Sex kort, platta blå ikon-rutor, ljus yta.
 */
const FEATURES = [
  {
    icon: Zap,
    title: "AI bokför i realtid",
    desc: "Varje transaktion konteras automatiskt mot rätt BAS-konto — med spårbar motivering du kan granska.",
  },
  {
    icon: GitCompareArrows,
    title: "Automatisk bankavstämning",
    desc: "Koppla din bank och låt Cogniq matcha, avstämma och flagga avvikelser varje natt.",
  },
  {
    icon: Percent,
    title: "Moms & deklaration",
    desc: "Momsrapport, AGI och preliminärskatt förbereds i tid. Du granskar och signerar.",
  },
  {
    icon: ShieldCheck,
    title: "Revisionssäkert",
    desc: "Fullständig verifikationskedja och revisionslogg. Byrå- och Skatteverksredo.",
  },
  {
    icon: LineChart,
    title: "Levande rapporter",
    desc: "Resultat, balans och kassaflöde uppdateras automatiskt — inte en gång i månaden.",
  },
  {
    icon: Sparkles,
    title: "AI Ekonom",
    desc: "Ställ frågor om din ekonomi i klartext. Få svar, prognoser och konkreta råd.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="produkt" className="bg-[#F7F9FC] py-24 px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#14181F] md:text-[2.6rem]">
            Hela bokföringen. Automatiserad.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#14181F]/55">
            Från kvitto till årsredovisning — Cogniq sköter flödet och håller
            dig alltid uppdaterad.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF0FF] text-[#0052FF] transition-transform duration-200 group-hover:scale-110">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </div>
              <h3 className="mt-5 font-display text-[17px] font-semibold tracking-tight text-[#14181F]">
                {title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#14181F]/55">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
