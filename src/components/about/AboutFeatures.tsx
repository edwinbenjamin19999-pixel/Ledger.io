import { Brain, LineChart, Activity, Calculator } from "lucide-react";

const features = [
  { icon: Brain, title: "AI Bokföring", desc: "AI tolkar underlag, föreslår kontering och bokför automatiskt med full spårbarhet." },
  { icon: LineChart, title: "AI CFO", desc: "Proaktiva insikter, KPI:er och prognoser direkt från din löpande bokföring." },
  { icon: Activity, title: "Realtidsrapportering", desc: "RR, BR och kassaflöde uppdateras i samma sekund som en transaktion bokförs." },
  { icon: Calculator, title: "Automatiserad moms", desc: "Momsdeklaration förbereds löpande och lämnas in till Skatteverket utan manuell input." },
];

export const AboutFeatures = () => (
  <section className="bg-[#0F172A] py-24 md:py-32">
    <div className="container mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.05]" style={{ letterSpacing: "-0.8px" }}>
          En plattform. <span className="text-[#3b82f6]">Hela ekonomin.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 hover:border-[#3b82f6]/20 hover:bg-white/[0.03] transition-colors">
            <div className="w-11 h-11 rounded-lg bg-[#3b82f6]/[0.08] border border-[#3b82f6]/20 flex items-center justify-center">
              <f.icon className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <h3 className="mt-5 text-white font-semibold text-lg">{f.title}</h3>
            <p className="mt-2 text-[14px] text-white/60 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
