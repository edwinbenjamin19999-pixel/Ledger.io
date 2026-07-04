import { Brain, Zap, FileText, TrendingUp, Shield, Building2 } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Bokföring",
    description:
      "Ladda upp kvitton och fakturor. Systemet tolkar, klassificerar och skapar verifikatet — du godkänner.",
    highlight: true,
  },
  {
    icon: Zap,
    title: "Automatisk avstämning",
    description:
      "Banktransaktioner importeras och matchas mot fakturor och bokföring automatiskt.",
  },
  {
    icon: FileText,
    title: "Komplett fakturaflöde",
    description:
      "Skapa, skicka och hantera fakturor. Automatisk momsberäkning och betalningsuppföljning.",
  },
  {
    icon: TrendingUp,
    title: "Rapporter i realtid",
    description:
      "Resultaträkning, balansräkning och kassaflöde — alltid uppdaterat.",
  },
  {
    icon: Shield,
    title: "Svensk standard",
    description:
      "BAS 2026, svenska skatteregler och momsdeklaration. Korrekt från start.",
  },
  {
    icon: Building2,
    title: "Från enskild firma till koncern",
    description:
      "Samma plattform oavsett storlek. Koncernkonsolidering och kostnadsställen vid behov.",
  },
];

export const SimpleFeatures = () => {
  return (
    <section id="features" className="py-16 sm:py-24 bg-[#f8fafc] border-y border-[#e2e8f0]">
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
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
            />
          </svg>
          <span className="text-[11.5px] uppercase tracking-[0.12em] font-semibold text-[#3b82f6]">
            Funktioner
          </span>
        </div>

        <h2 className="text-center text-[42px] font-[800] text-[#0F172A] mb-3 leading-tight" style={{ letterSpacing: "-1.5px" }}>
          Allt du behöver i en bokföringsplattform
        </h2>
        <p className="text-center text-[16px] text-[#475569] mb-12 max-w-lg mx-auto">
          Kärnfunktioner som fungerar — från verifikat till årsredovisning.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`rounded-xl border p-8 hover:shadow-lg hover:-translate-y-[3px] transition-all duration-200 ${
                feature.highlight
                  ? "border-[rgba(0,82,255,0.3)] bg-gradient-to-br from-[#f0faff] to-white"
                  : "border-[#e2e8f0] bg-white"
              }`}
            >
              <div className="w-[42px] h-[42px] rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 className="font-semibold text-[15px] text-[#0F172A] mb-1.5">
                {feature.title}
              </h3>
              <p className="text-sm text-[#64748b] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
