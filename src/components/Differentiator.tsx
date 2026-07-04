import { X, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const oldWay = [
  "Du bokför manuellt",
  "Du skickar moms",
  "Du analyserar själv",
  "Du följer upp fakturor",
  "Du jobbar i flera system",
];

const northledger = [
  "AI bokför automatiskt",
  "AI skickar moms & AGI",
  "AI analyserar din ekonomi",
  "AI följer upp kunder",
  "Allt sker i bakgrunden",
];

export const Differentiator = () => {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#0F172A] to-[#0a1428] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2
            className="font-[800] text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1.5px" }}
          >
            Från manuellt till{" "}
            <span className="text-[#3b82f6]">automatiserat</span>
          </h2>
          <p className="text-white/50 text-lg max-w-[500px] mx-auto">
            Så här har bokföring alltid fungerat — och så här fungerar det nu.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Old way */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
                Gammalt sätt
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/30 border border-white/[0.08]">
                Manuellt
              </span>
            </div>
            <ul className="space-y-4">
              {oldWay.map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/35">
                  <X className="w-4 h-4 text-red-400/60 flex-shrink-0" />
                  <span className="text-[14px] line-through decoration-white/20">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-white/[0.06]">
              <p className="text-[12px] text-white/25">Tid per månad: ~4–8 timmar</p>
            </div>
          </div>

          {/* Cogniq */}
          <div className="rounded-2xl border border-[rgba(0,82,255,0.2)] bg-[rgba(0,82,255,0.06)] p-7 shadow-[0_0_40px_rgba(0,82,255,0.08)]">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-sm font-semibold text-[#3b82f6] uppercase tracking-wider">
                Cogniq
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,82,255,0.1)] text-[#3b82f6] border border-[rgba(0,82,255,0.2)]">
                Autonom
              </span>
            </div>
            <ul className="space-y-4">
              {northledger.map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/80">
                  <Check className="w-4 h-4 text-[#3b82f6] flex-shrink-0" />
                  <span className="text-[14px]">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-[rgba(0,82,255,0.1)]">
              <p className="text-[12px] text-[#3b82f6]">Tid per månad: ~5 minuter</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <Button
            className="h-12 px-8 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] text-white hover:brightness-110 shadow-[0_4px_24px_rgba(0,82,255,0.4)] hover:scale-[1.02] transition-all duration-200"
            onClick={() => (window.location.href = "/auth")}
          >
            Byt till Cogniq
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </section>
  );
};
