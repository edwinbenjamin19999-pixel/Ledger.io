import { useState, useEffect, useRef } from "react";
import { Check, Lightbulb, AlertTriangle } from "lucide-react";

const steps = [
  "Läser kvitton",
  "Identifierar moms",
  "Matchar betalningar",
  "Bokför",
  "Uppdaterar rapporter",
  "Analyserar lönsamhet",
];

export const DailyAISection = () => {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [showCards, setShowCards] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          steps.forEach((_, i) => {
            setTimeout(() => setVisibleSteps(i + 1), 400 * (i + 1));
          });
          setTimeout(() => setShowCards(true), 400 * steps.length + 600);
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 sm:py-28 bg-gradient-to-b from-[#0f1f35] to-[#0B1D2A]">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <div className="text-center mb-14">
          <h2
            className="font-[800] text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1.5px" }}
          >
            Så här ser din ekonomi ut{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent">
              med Ledger.io
            </span>
          </h2>
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1]">
            <span className="text-[13px] font-semibold text-white/60">Måndag 08:00</span>
          </div>
        </div>

        {/* Steps — desktop only */}
        <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {steps.map((step, i) => (
            <div
              key={step}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-500 ${
                i < visibleSteps
                  ? "border-[rgba(34,211,238,0.2)] bg-[rgba(34,211,238,0.06)] opacity-100 translate-y-0"
                  : "border-white/[0.06] bg-white/[0.02] opacity-30 translate-y-2"
              }`}
            >
              <Check
                className={`w-4 h-4 flex-shrink-0 transition-colors duration-300 ${
                  i < visibleSteps ? "text-emerald-400" : "text-white/20"
                }`}
              />
              <span className="text-[13px] text-white/80 font-medium">{step}</span>
            </div>
          ))}
        </div>

        {/* Mobile: single-insight horizontal swipe (Insight + Risk as 2 slides) */}
        <div className="sm:hidden -mx-4 mb-6">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-3 scrollbar-hide">
            <div className="snap-center flex-shrink-0 w-[88%] rounded-xl border border-[rgba(34,211,238,0.25)] bg-[rgba(34,211,238,0.06)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-[#3b82f6]" />
                <span className="text-[12px] font-semibold text-[#3b82f6] uppercase tracking-wider">Insikt</span>
              </div>
              <p className="text-[15px] text-white/85 leading-relaxed">
                Marginal <span className="tabular-nums font-semibold">−5%</span> (<span className="tabular-nums">−3 200 kr/mån</span>). Rekommendation: justera pris på X.
              </p>
              <button className="mt-3 text-[13px] font-semibold text-[#3b82f6]">Se varför →</button>
            </div>
            <div className="snap-center flex-shrink-0 w-[88%] rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-[12px] font-semibold text-amber-400 uppercase tracking-wider">Varning</span>
              </div>
              <p className="text-[15px] text-white/85 leading-relaxed">
                2 fakturor riskerar att bli sena (<span className="tabular-nums font-semibold">47 200 kr</span>). Rekommendation: skicka påminnelse idag.
              </p>
            </div>
          </div>
          <p className="text-center text-[11px] text-white/30 mt-1">Svep för fler →</p>
        </div>

        {/* Insight + Risk cards — desktop */}
        <div
          className={`hidden sm:grid sm:grid-cols-2 gap-4 mb-10 transition-all duration-700 ${
            showCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="rounded-xl border border-[rgba(34,211,238,0.25)] bg-[rgba(34,211,238,0.06)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-[12px] font-semibold text-[#3b82f6] uppercase tracking-wider">Insikt</span>
            </div>
            <p className="text-[14px] text-white/80 leading-relaxed">
              Marginal <span className="tabular-nums font-semibold">−5%</span> (<span className="tabular-nums">−3 200 kr/mån</span>). Rekommendation: justera pris på X.
            </p>
            <button className="mt-3 text-[13px] font-semibold text-[#3b82f6] hover:text-[#3b82f6] transition-colors">
              Se varför →
            </button>
          </div>

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-[12px] font-semibold text-amber-400 uppercase tracking-wider">Varning</span>
            </div>
            <p className="text-[14px] text-white/80 leading-relaxed">
              2 fakturor riskerar att bli sena (<span className="tabular-nums font-semibold">47 200 kr</span>). Rekommendation: skicka påminnelse idag.
            </p>
          </div>
        </div>

        {/* AI Thinking Layer — desktop only */}
        <div
          className={`hidden sm:flex flex-wrap justify-center gap-x-4 gap-y-1 mb-6 transition-all duration-700 ${
            showCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="text-[13px] text-[#3b82f6] font-medium">AI analyserar varje transaktion</span>
          <span className="text-[13px] text-white/20">·</span>
          <span className="text-[13px] text-emerald-400/70 font-medium">Bokför automatiskt vid hög säkerhet</span>
          <span className="text-[13px] text-white/20">·</span>
          <span className="text-[13px] text-amber-400/70 font-medium">Flaggar avvikelser för granskning</span>
        </div>

        <p
          className={`hidden sm:block text-center text-[15px] text-white/40 italic transition-all duration-700 ${
            showCards ? "opacity-100" : "opacity-0"
          }`}
        >
          Detta sker automatiskt. Du behöver inte göra något.
        </p>
      </div>
    </section>
  );
};
