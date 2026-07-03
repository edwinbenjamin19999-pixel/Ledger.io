import { Palette, Globe, Brain, FileCheck, BarChart3, MessageSquare, Check } from "lucide-react";

const items = [
  { icon: Palette, title: "White label-branding", desc: "Egen logotyp, färger och typografi genom hela plattformen." },
  { icon: Globe, title: "Klientportal under ditt varumärke", desc: "Dina kunder ser ditt företag — inte vårt. Egen domän." },
  { icon: Brain, title: "Egen domän & infrastruktur", desc: "din-byrå.se. Säker, skalbar och driftsatt åt dig." },
  { icon: FileCheck, title: "AI-driven bokföring", desc: "Automatisk kontering med 95%+ konfidens. AI lär av dina rättelser." },
  { icon: BarChart3, title: "Automatisk moms & rapportering", desc: "Moms, AGI, RR/BR och årsbokslut — förberedda automatiskt." },
  { icon: MessageSquare, title: "Realtidsöversikt & AI-rådgivare", desc: "Live KPI:er och inbyggd AI som svarar dygnet runt." },
];

export const WLWhatYouGet = () => {
  return (
    <section className="bg-[#0F1B2D] py-24 md:py-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-[#3b82f6] text-xs font-medium tracking-[0.25em] uppercase mb-3">
            Det här ingår
          </p>
          <h2
            className="text-4xl md:text-5xl font-[700] text-white leading-[1.05]"
            style={{ letterSpacing: "-0.8px" }}
          >
            Hela plattformen — under ditt varumärke.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-7 hover:border-[#3b82f6]/20 hover:bg-white/[0.03] transition-all"
            >
              <div className="absolute top-5 right-5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3b82f6]/10">
                <Check className="w-3 h-3 text-[#3b82f6]" strokeWidth={3} />
                <span className="text-[10px] font-medium text-[#3b82f6] tracking-wide uppercase">Ingår</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 className="text-white font-semibold mb-2 text-[15px]">{title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
