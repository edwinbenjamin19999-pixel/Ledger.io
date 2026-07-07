import { useState } from "react";
import { Users, Layers, TrendingUp, Rocket } from "lucide-react";

const models = [
  { icon: Users, title: "Fakturera per klient", desc: "Sätt ditt eget pris per bolag eller paket. Återkommande månadsintäkter." },
  { icon: Layers, title: "Bundla rådgivning", desc: "Kombinera plattform med rådgivning, bokslut och deklarationer." },
  { icon: TrendingUp, title: "Höj marginalerna", desc: "AI ersätter manuellt arbete. Mer värde per klient, lägre kostnad." },
  { icon: Rocket, title: "Skala utan att anställa", desc: "Hantera 10x fler klienter med samma team. Tillväxt utan flaskhalsar." },
];

const SCALES = [50, 100, 250] as const;
const PRICE_PER_CLIENT = 800;

export const WLBusinessModel = () => {
  const [clients, setClients] = useState<number>(50);
  const monthly = clients * PRICE_PER_CLIENT;
  const arr = monthly * 12;
  const threeYear = arr * 3;
  const fmt = (n: number) => n.toLocaleString("sv-SE");

  return (
    <section className="bg-[#F5F8FF] py-24 md:py-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-[#0052FF] text-xs font-medium tracking-[0.25em] uppercase mb-3">
            Affärsmodell
          </p>
          <h2
            className="text-4xl md:text-5xl font-[700] text-[#0F172A] leading-[1.05]"
            style={{ letterSpacing: "-0.8px" }}
          >
            Så tjänar du pengar.
          </h2>
          <p className="mt-5 text-[15px] text-slate-500 leading-relaxed">
            Återkommande intäkter, högre marginaler och en plattform som skalar med dig.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {models.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 hover:bg-white transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0052FF]/10 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-[#0052FF]" />
              </div>
              <h3 className="text-[#0F172A] font-semibold mb-2 text-[15px]">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Revenue calculator */}
        <div className="rounded-2xl border border-[#0052FF]/20 bg-gradient-to-br from-[#0052FF]/[0.06] to-transparent p-8 md:p-10">
          {/* Scale toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-lg bg-white border border-slate-200">
              {SCALES.map((s) => (
                <button
                  key={s}
                  onClick={() => setClients(s)}
                  className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
                    clients === s
                      ? "bg-[#0052FF] text-white"
                      : "text-slate-500 hover:text-[#0F172A]"
                  }`}
                >
                  {s} klienter
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Klienter</div>
              <div className="text-4xl font-[700] text-[#0F172A]">{clients}</div>
            </div>
            <div className="text-[#0052FF] text-2xl font-light">×</div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Per månad</div>
              <div className="text-4xl font-[700] text-[#0F172A]">{PRICE_PER_CLIENT} kr</div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Återkommande månadsintäkt</div>
            <div className="text-5xl md:text-6xl font-[700] text-[#0052FF]" style={{ letterSpacing: "-1px" }}>
              {fmt(monthly)} kr
            </div>
            <p className="text-slate-400 text-sm mt-3">
              = {fmt(arr)} kr ARR · {fmt(threeYear)} kr över 3 år
            </p>
            <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200">
              <TrendingUp className="w-3.5 h-3.5 text-[#0052FF]" />
              <span className="text-slate-600 text-xs">Marginal: ~85% efter plattformskostnad</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
