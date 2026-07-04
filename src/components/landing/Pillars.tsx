import { Bot, Landmark, CreditCard, ShieldCheck } from "lucide-react";

/**
 * FLAT COLOR-BLOCK CARDS — vit sektion med fyra mjukt tintade kortblock.
 * Ingen skugga, ingen kant: färgen definierar ytan. Ikon i solid cirkel.
 * Hover = subtil skala + färgintensifiering (posterprincip).
 */
const pillars = [
  {
    icon: Bot,
    tint: "bg-blue-50 hover:bg-blue-100",
    iconCircle: "bg-[#0052FF] text-white",
    title: "Automatiserad bokföring",
    desc: "Lägg noll tid på bokföring. Cogniq konterar mot BAS-kontoplanen automatiskt — du fokuserar på företaget.",
  },
  {
    icon: Landmark,
    tint: "bg-emerald-50 hover:bg-emerald-100",
    iconCircle: "bg-[#059669] text-white",
    title: "Direkt till myndigheter",
    desc: "Moms (konto 2610–2650), AGI och inkomstskatt lämnas direkt till Skatteverket. Inga formulär, inga glömda deadlines.",
  },
  {
    icon: CreditCard,
    tint: "bg-amber-50 hover:bg-amber-100",
    iconCircle: "bg-[#F59E0B] text-[#0F172A]",
    title: "Bankintegrationer",
    desc: "Koppla din bank en gång. Kontinuerlig bankavstämning mot verifikat — varje transaktion matchas och konteras automatiskt.",
  },
  {
    icon: ShieldCheck,
    tint: "bg-gray-100 hover:bg-gray-200",
    iconCircle: "bg-[#0F172A] text-white",
    title: "Revision & kontroll",
    desc: "Resultat- och balansräkning alltid uppdaterad. Varje post är spårbar, verifierbar och revisionssäker.",
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
          Allt du behöver för automatiserad bokföring och rapportering, integrerat från dag ett.
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
