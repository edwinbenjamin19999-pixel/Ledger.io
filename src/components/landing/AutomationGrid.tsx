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
 * LJUST AUTOMATIONS-BLOCK — luftig, near-white yta med vita kort, mjuk skugga
 * och platta Electric Blue ikon-cirklar. SaaS-referensens ljusa känsla.
 */
export const AutomationGrid = () => {
  return (
    <section className="relative overflow-hidden bg-white py-24 px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#0052FF]/5"
      />
      <div className="relative mx-auto max-w-6xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#0052FF]">
          Vad Cogniq gör
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F172A]">
          Det här gör Cogniq <span className="text-[#0052FF]">åt dig</span>
        </h2>
        <p className="mt-3 max-w-xl text-base text-slate-600">
          Det som tar 40 timmar manuellt — Cogniq gör det på sekunder.
        </p>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-500">
          Sex återkommande arbetsmoment som körs automatiskt i bakgrunden — så
          du kan fokusera på besluten istället för bokföringen.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0052FF] text-white transition-transform duration-200 group-hover:scale-110">
                <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              </div>
              <h3 className="mt-5 text-base font-bold text-[#0F172A]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
