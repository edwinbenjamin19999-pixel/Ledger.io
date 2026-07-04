import { ArrowRight, Sparkles } from "lucide-react";

export interface AISuggestion {
  id: string;
  text: string;
  cta: string;
  onClick?: () => void;
}

export function AIAssistantBanner({ suggestions }: { suggestions: AISuggestion[] }) {
  if (suggestions.length === 0) return null;
  return (
    <div
      className="rounded-[12px] p-[14px] bg-[#EFF6FF]"
      style={{ border: "0.5px solid #B5D4F4" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-[#0040CC] text-white flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0C447C]">
          AI Årsredovisningsassistent
        </p>
      </div>
      <div className="space-y-2">
        {suggestions.map(s => (
          <div key={s.id} className="flex items-center justify-between gap-3 py-1">
            <p className="text-sm text-[#0F172A] leading-snug">{s.text}</p>
            <button
              onClick={s.onClick}
              className="shrink-0 text-[12px] bg-[#0040CC] hover:bg-[#08374b] text-white px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
            >
              {s.cta} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
