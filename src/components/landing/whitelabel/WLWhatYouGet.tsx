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
    <section className="bg-white py-24 md:py-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-[#0052FF] text-xs font-medium tracking-[0.25em] uppercase mb-3">
            Det här ingår
          </p>
          <h2
            className="text-4xl md:text-5xl font-[700] text-[#0F172A] leading-[1.05]"
            style={{ letterSpacing: "-0.8px" }}
          >
            Hela plattformen — under ditt varumärke.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="relative rounded-xl border border-slate-200 bg-white shadow-sm p-7 hover:border-[#0052FF]/20 hover:bg-white transition-all"
            >
              <div className="absolute top-5 right-5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0052FF]/10">
                <Check className="w-3 h-3 text-[#0052FF]" strokeWidth={3} />
                <span className="text-[10px] font-medium text-[#0052FF] tracking-wide uppercase">Ingår</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-[#0052FF]" />
              </div>
              <h3 className="text-[#0F172A] font-semibold mb-2 text-[15px]">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
