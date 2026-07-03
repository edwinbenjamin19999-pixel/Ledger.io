import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const EarlyBirdCTA = () => {
  return (
    <section id="pricing" className="relative py-24 sm:py-32 overflow-hidden bg-gradient-to-b from-[#0a1428] via-[#0f1f35] to-[#0a1428]">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.15) 59px, rgba(255,255,255,0.15) 60px)",
        }}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)] animate-pulse pointer-events-none" style={{ animationDuration: "4s" }} />

      <div className="relative z-10 container mx-auto px-4 sm:px-6">
        <div className="max-w-[600px] mx-auto">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-[0_0_60px_rgba(6,182,212,0.06)] p-12 sm:p-14 text-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.2)] text-[#3b82f6] text-xs font-semibold mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              AI-driven ekonomifunktion
            </div>

            <h2
              className="font-[800] text-white/95 mb-5 leading-[1.1]"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-1.5px" }}
            >
              Redo att slippa{" "}
              <span className="text-[#3b82f6]">bokföring</span> för alltid?
            </h2>

            <p className="text-[16px] text-white/50 leading-relaxed max-w-[420px] mx-auto mb-10">
              Ersätt manuellt arbete med en autonom ekonomifunktion som aldrig sover.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button
                className="h-12 px-8 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] text-white hover:brightness-110 shadow-[0_4px_24px_rgba(6,182,212,0.4)] hover:scale-[1.03] transition-all duration-200"
                onClick={() => (window.location.href = "/auth")}
              >
                Låt AI ta över din bokföring
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="glass"
                className="h-12 px-8 rounded-xl text-[15px]"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Se din bokföring bli klar automatiskt
              </Button>
            </div>

            <p className="text-xs text-white/35">
              Ingen bindning · Starta på 2 min · Ingen kreditkort · GDPR-säkrat
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
