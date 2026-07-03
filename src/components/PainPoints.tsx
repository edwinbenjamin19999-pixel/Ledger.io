import { Clock, CalendarX, Calculator, Banknote } from "lucide-react";

const points = [
  {
    icon: Clock,
    title: "Timmar av manuell bokföring",
    description:
      "Du borde driva ditt företag — inte sitta med verifikationer och Excel.",
  },
  {
    icon: CalendarX,
    title: "Missade deadlines",
    description:
      "Momsdeklarationer, AGI och bokslut — det är lätt att missa. Inte med NorthLedger.",
  },
  {
    icon: Calculator,
    title: "Komplicerade skatteregler",
    description:
      "BAS-konton, avskrivningar och periodiseringar. Vi hanterar allt automatiskt.",
  },
  {
    icon: Banknote,
    title: "Dyra redovisningsbyråer",
    description:
      "Sluta betala 5 000 kr/mån för något som kan göras bättre och snabbare.",
  },
];

export const PainPoints = () => {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section label */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <svg
            className="w-4 h-4 text-[#3b82f6]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <span className="text-[11.5px] uppercase tracking-[0.12em] font-semibold text-[#3b82f6]">
            Vanliga utmaningar
          </span>
        </div>

        <h2 className="text-center text-[42px] font-[800] text-[#0f1f35] mb-3 leading-tight" style={{ letterSpacing: "-1.5px" }}>
          Känner du igen dig?
        </h2>
        <p className="text-center text-[16px] text-[#475569] mb-12 max-w-lg mx-auto">
          De flesta företagare kämpar med samma saker. NorthLedger tar bort dem.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {points.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-[#e2e8f0] bg-white p-7 hover:border-[rgba(8,145,178,0.3)] hover:shadow-lg hover:-translate-y-[3px] transition-all duration-200 group"
            >
              <div className="w-[42px] h-[42px] rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 className="font-semibold text-[15px] text-[#0f1f35] mb-1.5">
                {p.title}
              </h3>
              <p className="text-sm text-[#64748b] leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
