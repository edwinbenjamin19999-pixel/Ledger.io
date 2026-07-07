import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const expectations = [
  { step: "1", label: "30 min demo", desc: "Vi visar plattformen live." },
  { step: "2", label: "Branding-setup", desc: "Logga, färger, domän." },
  { step: "3", label: "Live om 7 dagar", desc: "Första klienten inbjuden." },
];

export const WLFinalCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="bg-white py-24 md:py-32 border-t border-slate-200">
      <div className="container mx-auto max-w-3xl px-6 text-center">
        <h2
          className="text-4xl md:text-5xl font-[700] text-[#0F172A] leading-[1.05]"
          style={{ letterSpacing: "-0.8px" }}
        >
          Redo att lansera <span className="text-[#0052FF]">din egen plattform?</span>
        </h2>
        <p className="mt-6 text-slate-500 text-base leading-relaxed">
          Boka en demo. Vi visar hur snabbt du kan vara igång under ditt varumärke.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/white-label/onboarding")}
            className="h-12 px-7 bg-[#0052FF] hover:bg-[#0040CC] text-white font-semibold rounded-lg group shadow-[0_2px_24px_rgba(0,82,255,0.25)]"
          >
            Lansera min plattform
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => (window.location.href = "mailto:demo@cogniq.se?subject=White Label demo")}
            className="h-12 px-7 rounded-lg"
          >
            Boka demo
          </Button>
        </div>

        {/* What happens after */}
        <div className="mt-14 pt-10 border-t border-slate-200">
          <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-6">Vad händer efter demo?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {expectations.map((e) => (
              <div key={e.step} className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 text-left">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-xs font-semibold flex items-center justify-center">
                    {e.step}
                  </span>
                  <span className="text-[#0F172A] text-sm font-semibold">{e.label}</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
