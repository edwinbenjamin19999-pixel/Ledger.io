import { Check, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * AI Ekonom-sektion (Cogniq Design System): "En ekonom som aldrig sover".
 * Mörk navy yta, textkolumn + chatt-mockup (ljust kort på mörk yta).
 */
const POINTS = [
  "Bokför och avstämmer automatiskt varje natt",
  "Flaggar risker innan de blir problem",
  "Prognoser för likviditet och skatt",
];

export const AIEkonomSection = () => {
  const navigate = useNavigate();
  return (
    <section id="ai-ekonom" className="relative overflow-hidden bg-[#0052FF] py-24 px-6 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[6%] top-0 h-[460px] w-[460px] rounded-full bg-white/[0.08] blur-[130px]"
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-16">
        {/* Text */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            AI Ekonom
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-[2.6rem]">
            En ekonom som aldrig sover
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
            Fråga i klartext, få svar direkt. AI Ekonom förstår din bokföring,
            upptäcker avvikelser och föreslår åtgärder — dygnet runt.
          </p>

          <ul className="mt-8 flex flex-col gap-3.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#0052FF]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                <span className="text-[14.5px] text-white/90">{p}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate("/auth")}
            className="group mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-[15px] font-semibold text-[#0052FF] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0052FF]"
          >
            Se AI Ekonom i aktion
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </button>
        </div>

        {/* Chatt-mockup */}
        <div className="rounded-2xl border border-white/20 bg-white p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#4D7CFF] to-[#0052FF] text-white">
              <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[13px] font-semibold text-[#14181F]">AI Ekonom</span>
          </div>

          <div className="space-y-3 pt-4">
            {/* Användarens fråga */}
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#0052FF] px-4 py-2.5 text-[13px] leading-relaxed text-white">
                Hur går det för bolaget den här månaden?
              </div>
            </div>
            {/* AI-svar */}
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-[#F1F5FB] px-4 py-3 text-[13px] leading-relaxed text-[#14181F]">
                Omsättningen är <b className="font-semibold">2,48 mkr</b> (+12,4 %).
                Resultatet före skatt <b className="font-semibold">342 100 kr</b>.
                Likviditeten är stark, men leverantörsskulderna ökade 8 % — vill
                du att jag planerar betalningarna?
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
