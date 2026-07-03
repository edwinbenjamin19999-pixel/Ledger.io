import { Receipt, Brain, BookOpen, Calculator, FileBarChart, ChevronRight } from "lucide-react";

const nodes = [
  { icon: Receipt, label: "Kvitto", sub: "Foto eller PDF" },
  { icon: Brain, label: "AI", sub: "Tolkning & analys" },
  { icon: BookOpen, label: "Bokföring", sub: "Auto-kontering" },
  { icon: Calculator, label: "Moms", sub: "Korrekt kod" },
  { icon: FileBarChart, label: "Rapport", sub: "Realtid" },
];

export const AboutSolution = () => (
  <section className="bg-[#0F1B2D] py-24 md:py-32">
    <div className="container mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.05]" style={{ letterSpacing: "-0.8px" }}>
          Vi automatiserar <span className="text-[#3b82f6]">hela flödet.</span>
        </h2>
        <p className="mt-5 text-[15px] text-white/55 leading-relaxed">
          Ett enda kvitto resulterar i bokförd verifikation, momsavdrag och uppdaterad rapport — utan manuella steg.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-3">
        {nodes.map((n, i) => (
          <div key={n.label} className="flex flex-col md:flex-row items-center gap-6 md:gap-3 md:flex-1 md:last:flex-none">
            <div className="flex flex-col items-center text-center md:flex-1">
              <div className="w-14 h-14 rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/[0.06] flex items-center justify-center">
                <n.icon className="w-6 h-6 text-[#3b82f6]" />
              </div>
              <div className="mt-3 text-white font-semibold text-[14px]">{n.label}</div>
              <div className="text-[12px] text-white/45 mt-0.5">{n.sub}</div>
            </div>
            {i < nodes.length - 1 && (
              <ChevronRight className="w-5 h-5 text-[#3b82f6] flex-shrink-0 md:mb-12 rotate-90 md:rotate-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);
