import { Sparkles, ArrowRight } from "lucide-react";
import { useLocation } from "react-router-dom";

const SUGGESTIONS_BY_PATH: Array<{ match: RegExp; questions: string[] }> = [
  { match: /^\/(invoices|kundfakturor|fakturor)/, questions: [
    "Vilka fakturor är obetalda?",
    "Vem är min bästa betalare?",
    "Hur mycket väntar jag på i kundfordringar?",
  ]},
  { match: /^\/(reports|rapporter)/, questions: [
    "Jämför den här månaden med förra året",
    "Vad driver kostnadsökningen?",
    "Visa mig marginaltrender",
  ]},
];

const DEFAULT_QUESTIONS = [
  "Hur går det den här månaden?",
  "Vilka fakturor är förfallna?",
  "Hur ser kassan ut de närmaste 30 dagarna?",
];

function ask(message: string) {
  window.dispatchEvent(new CustomEvent("open-ai-assistant", { detail: { message, autoSend: true } }));
}

export function AskAIInlineCard() {
  const { pathname } = useLocation();
  const match = SUGGESTIONS_BY_PATH.find(s => s.match.test(pathname));
  const questions = match?.questions || DEFAULT_QUESTIONS;

  return (
    <div className="rounded-2xl border border-[#3b82f6]/20 bg-gradient-to-br from-[#3b82f6]/5 to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground">Fråga din AI-ekonom</h3>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Ställ en fråga om dina siffror — jag svarar med riktiga belopp från din bokföring.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => ask(q)}
                className="group inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border border-[#3b82f6]/30 bg-white hover:bg-[#3b82f6]/10 text-[#0040CC] font-medium transition-colors"
              >
                {q}
                <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
