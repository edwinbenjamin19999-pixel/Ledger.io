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
    <section className="bg-[#0f1f35] py-24 md:py-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-[#3b82f6] text-xs font-medium tracking-[0.25em] uppercase mb-3">
            Affärsmodell
          </p>
          <h2
            className="text-4xl md:text-5xl font-[700] text-white leading-[1.05]"
            style={{ letterSpacing: "-0.8px" }}
          >
            Så tjänar du pengar.
          </h2>
          <p className="mt-5 text-[15px] text-white/55 leading-relaxed">
            Återkommande intäkter, högre marginaler och en plattform som skalar med dig.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {models.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 className="text-white font-semibold mb-2 text-[15px]">{title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Revenue calculator */}
        <div className="rounded-2xl border border-[#3b82f6]/20 bg-gradient-to-br from-[#3b82f6]/[0.06] to-transparent p-8 md:p-10">
          {/* Scale toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {SCALES.map((s) => (
                <button
                  key={s}
                  onClick={() => setClients(s)}
                  className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
                    clients === s
                      ? "bg-[#3b82f6] text-[#0a1525]"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  {s} klienter
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
            <div>
              <div className="text-white/50 text-xs uppercase tracking-wider mb-2">Klienter</div>
              <div className="text-4xl font-[700] text-white">{clients}</div>
            </div>
            <div className="text-[#3b82f6] text-2xl font-light">×</div>
            <div>
              <div className="text-white/50 text-xs uppercase tracking-wider mb-2">Per månad</div>
              <div className="text-4xl font-[700] text-white">{PRICE_PER_CLIENT} kr</div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/[0.06] text-center">
            <div className="text-white/50 text-xs uppercase tracking-wider mb-2">Återkommande månadsintäkt</div>
            <div className="text-5xl md:text-6xl font-[700] text-[#3b82f6]" style={{ letterSpacing: "-1px" }}>
              {fmt(monthly)} kr
            </div>
            <p className="text-white/40 text-sm mt-3">
              = {fmt(arr)} kr ARR · {fmt(threeYear)} kr över 3 år
            </p>
            <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <TrendingUp className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span className="text-white/60 text-xs">Marginal: ~85% efter plattformskostnad</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
