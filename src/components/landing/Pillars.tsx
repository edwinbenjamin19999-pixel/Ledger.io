import { Bot, Landmark, CreditCard, LineChart } from "lucide-react";

/**
 * LJUSA KORTBLOCK — vit sektion, fyra near-white kort med platta Electric
 * Blue ikon-cirklar (enhetligt genom hela sidan). Hover = subtil skala.
 */
const pillars = [
  {
    icon: Bot,
    tint: "bg-[#F5F8FF] hover:bg-[#EAF0FF]",
    iconCircle: "bg-[#0052FF] text-white",
    title: "Bokföringen sköter sig själv",
    desc: "Lägg noll tid på bokföring. Cogniq konterar mot BAS-kontoplanen automatiskt — du fokuserar på företaget.",
  },
  {
    icon: Landmark,
    tint: "bg-[#F5F8FF] hover:bg-[#EAF0FF]",
    iconCircle: "bg-[#0052FF] text-white",
    title: "Deklarationer utan deadlines",
    desc: "Moms (konto 2610–2650), AGI och inkomstskatt lämnas direkt till Skatteverket. Inga formulär, inga glömda deadlines.",
  },
  {
    icon: CreditCard,
    tint: "bg-[#F5F8FF] hover:bg-[#EAF0FF]",
    iconCircle: "bg-[#0052FF] text-white",
    title: "Banken stämd i realtid",
    desc: "Koppla din bank en gång. Kontinuerlig bankavstämning mot verifikat — varje transaktion matchas och konteras automatiskt.",
  },
  {
    icon: LineChart,
    tint: "bg-[#F5F8FF] hover:bg-[#EAF0FF]",
    iconCircle: "bg-[#0052FF] text-white",
    title: "Prognos som ligger steget före",
    desc: "Varje verifikat blir prognos, likviditet och avvikelser i realtid — så du fattar beslut på siffror du kan lita på.",
  },
];

export const Pillars = () => {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0052FF]">
          Plattformen
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F172A]">
          Fyra grundpelare — ett enda system.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#0F172A]/60">
          Allt en ekonomifunktion gör — bokföring, deklaration, avstämning och prognos — i ett system som tänker själv.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div
              key={p.title}
              className={`group rounded-lg p-7 transition-all duration-200 hover:scale-[1.02] ${p.tint}`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 ${p.iconCircle}`}
              >
                <p.icon className="h-6 w-6" strokeWidth={2.5} aria-hidden />
              </div>
              <h3 className="mt-6 text-base font-bold text-[#0F172A]">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#0F172A]/60">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
