import { Banknote, ScanLine, BookOpen, Receipt, ShieldAlert, LineChart } from "lucide-react";

const ITEMS = [
  { icon: Banknote, title: "Matchar banktransaktioner", desc: "Kontinuerlig bankavstämning mot verifikat — automatisk matchning mot fakturor och underlag." },
  { icon: ScanLine, title: "Tolkar kvitton och fakturor", desc: "AI extraherar belopp, moms, motpart och datum direkt från PDF eller bild (konto 5000–6999)." },
  { icon: BookOpen, title: "Föreslår och bokför kontering", desc: "Konterar mot BAS-kontoplanen automatiskt med spårbar förklaring per transaktion." },
  { icon: Receipt, title: "Räknar moms och deklaration", desc: "Momsperioder och deklarationsunderlag förbereds kontinuerligt (konto 2610–2650)." },
  { icon: ShieldAlert, title: "Upptäcker avvikelser och risker", desc: "Dubbletter, saknade underlag och ovanliga belopp flaggas tidigt." },
  { icon: LineChart, title: "Skapar prognoser och åtgärder", desc: "Resultat- och balansräkning alltid uppdaterad — likviditet och nästa steg baserat på din faktiska data." },
];

/**
 * FLAT AUTOMATIONS-BLOCK — solitt ink-navy med tydliga white/5-kortblock
 * och solida blå ikon-cirklar. Ytan är synlig, inte antydd.
 */
export const AutomationGrid = () => {
  return (
    <section className="relative overflow-hidden bg-[#0F1B2D] py-24 px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-white/5"
      />
      <div className="relative mx-auto max-w-6xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#60A5FA]">
          Vad Bokfy gör
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Det här gör Bokfy <span className="text-[#60A5FA]">åt dig</span>
        </h2>
        <p className="mt-3 max-w-xl text-base text-white/70">
          Det som tar 40 timmar manuellt — Bokfy gör det på sekunder.
        </p>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/60">
          Sex återkommande arbetsmoment som körs automatiskt i bakgrunden — så
          du kan fokusera på besluten istället för bokföringen.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-lg bg-white/[0.07] p-7 transition-all duration-200 hover:scale-[1.02] hover:bg-white/[0.12]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB] text-white transition-transform duration-200 group-hover:scale-110">
                <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              </div>
              <h3 className="mt-5 text-base font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
