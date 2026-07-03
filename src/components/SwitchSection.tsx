import { FileDown, Upload, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: FileDown,
    step: "1",
    title: "Koppla bank",
    description: "Säker BankID-verifiering — tar 30 sekunder",
  },
  {
    icon: Upload,
    step: "2",
    title: "Ladda upp SIE / börja direkt",
    description: "AI mappar din historik — eller starta från noll",
  },
  {
    icon: Sparkles,
    step: "3",
    title: "AI tar över",
    description: "Bokföring, moms och avstämningar sker automatiskt",
  },
];

export const SwitchSection = () => {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#0B1D2A] to-[#0f1f35]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2
            className="font-[800] text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1.5px" }}
          >
            Kom igång på{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent">
              minuter
            </span>
          </h2>
          <p className="text-white/50 text-[15px]">
            Inga konsulter. Ingen setup. Ingen migrationsstress.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 max-w-3xl mx-auto mb-12">
          {steps.map((s, i) => (
            <div key={s.step} className="flex items-center gap-4 sm:gap-0">
              <div className="flex flex-col items-center text-center w-[200px]">
                <div className="w-14 h-14 rounded-2xl bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.15)] flex items-center justify-center mb-3">
                  <s.icon className="w-6 h-6 text-[#3b82f6]" />
                </div>
                <span className="text-[11px] font-semibold text-[#3b82f6] mb-1">Steg {s.step}</span>
                <h3 className="text-[15px] font-semibold text-white mb-1">{s.title}</h3>
                <p className="text-[12px] text-white/40 leading-relaxed">{s.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:block w-16">
                  <div className="h-px bg-gradient-to-r from-[rgba(34,211,238,0.3)] to-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-[14px] text-white/60 mb-6">
          Första verifikationen skapas inom <span className="text-[#3b82f6] font-semibold tabular-nums">60 sekunder</span>.
        </p>

        <div className="text-center">
          <Button
            className="h-12 px-8 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] text-white hover:brightness-110 shadow-[0_4px_24px_rgba(6,182,212,0.4)] hover:scale-[1.02] transition-all duration-200"
            onClick={() => (window.location.href = "/auth")}
          >
            Sätt igång — AI börjar direkt
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <p className="text-xs text-white/30 mt-3">
            Stöd för SIE1–SIE4 från alla system
          </p>
        </div>
      </div>
    </section>
  );
};
