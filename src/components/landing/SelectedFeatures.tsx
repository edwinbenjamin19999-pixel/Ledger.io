import { Bot, FileCheck, LineChart, BookOpenCheck, BrainCircuit, Wallet } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Auto-bokföring",
    desc: "Transaktioner med ≥95% konfidens bokförs autonomt. Lägre tröskel går till granskning.",
  },
  {
    icon: FileCheck,
    title: "Moms & AGI till Skatteverket",
    desc: "Förbered, granska och lämna in deklarationer direkt från plattformen.",
  },
  {
    icon: LineChart,
    title: "Kassaflödesprognos 12 mån",
    desc: "Drivarbaserad modell med scenarier — bas, optimistiskt, pessimistiskt.",
  },
  {
    icon: BookOpenCheck,
    title: "Bokslut & årsredovisning",
    desc: "K2 och K3 med automatiserad mappning till SRU-koder och Bolagsverket.",
  },
  {
    icon: BrainCircuit,
    title: "AI CFO",
    desc: "Löpande analys av marginaler, likviditet och avvikelser — med åtgärdsförslag.",
  },
  {
    icon: Wallet,
    title: "Lönehantering & arbetsgivardeklaration",
    desc: "Löner beräknas och betalas ut automatiskt. AGI lämnas direkt till Skatteverket varje månad.",
  },
];

/**
 * FLAT FUNKTIONS-BLOCK — grå-100-sektion, vita kortblock med
 * navy ikon-brickor. Hover = skala + intensifiering.
 */
export const SelectedFeatures = () => {
  return (
    <section id="features" className="bg-gray-100 py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#0052FF]">
          Funktioner
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F172A]">
          Det som ersätter manuellt arbete.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#0F172A]/60">
          Sex kärnflöden som körs autonomt — granskade, spårbara och alltid aktuella.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group flex items-start gap-5 rounded-lg bg-white p-7 transition-transform duration-200 hover:scale-[1.02]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-[#0F172A] text-white transition-transform duration-200 group-hover:scale-110">
                <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              </div>
              <div>
                <h3 className="mb-1.5 text-lg font-bold text-[#0F172A]">{title}</h3>
                <p className="max-w-md text-sm leading-relaxed text-[#0F172A]/60">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
