import { Cpu, AlertCircle, Lightbulb } from "lucide-react";

const items = [
  {
    icon: Cpu,
    title: "AI bokför",
    desc: "Transaktioner konteras automatiskt med konfidensbaserad autonomi.",
    example: "Ex: 95% av fakturor konteras utan mänsklig hand.",
  },
  {
    icon: AlertCircle,
    title: "AI upptäcker problem",
    desc: "Anomalier, dubbelfakturor och avvikelser flaggas i realtid.",
    example: "Ex: Dubbelbetalning fångas innan den lämnar banken.",
  },
  {
    icon: Lightbulb,
    title: "AI föreslår åtgärder",
    desc: "Konkreta rekommendationer för marginal, kassaflöde och skatt.",
    example: "Ex: ”Höj pris med 4% — täcker ökade lönekostnader.”",
  },
];

export const WLAIDifferentiation = () => {
  return (
    <section className="bg-[#0F1B2D] py-24 md:py-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-[#3b82f6] text-xs font-medium tracking-[0.25em] uppercase mb-3">
            AI-motorn
          </p>
          <h2
            className="text-4xl md:text-5xl font-[700] text-white leading-[1.05]"
            style={{ letterSpacing: "-0.8px" }}
          >
            AI:n som driver din plattform.
          </h2>
          <p className="mt-5 text-[15px] text-white/55 leading-relaxed">
            Inte ett bolt-on. En motor byggd för svensk redovisning från grunden.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map(({ icon: Icon, title, desc, example }) => (
            <div
              key={title}
              className="relative rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-7 flex flex-col"
            >
              <div className="absolute top-7 right-7 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 className="text-white font-semibold mb-2 text-[15px]">{title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
              <div className="mt-5 pt-4 border-t border-white/[0.05]">
                <p className="text-[#3b82f6] text-xs leading-relaxed italic">{example}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
