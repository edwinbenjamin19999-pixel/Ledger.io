import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/formatNumber";

interface Props {
  net: number;
  priorNet: number;
  inflows: number;
  outflows: number;
  closingCash: number;
}

/**
 * Discreet 1–2 line driver caption. No card chrome.
 */
export const CashflowAIInsight = ({ net, priorNet, inflows, outflows, closingCash }: Props) => {
  const [text, setText] = useState<string>("");

  const fallback = (() => {
    const delta = net - priorNet;
    const dir = delta >= 0 ? "ökning" : "minskning";
    if (priorNet === 0) {
      return `Periodens kassaflöde uppgår till ${formatSEK(net)}.`;
    }
    return `Huvuddrivare: ${dir} av netto med ${formatSEK(Math.abs(delta))} jämfört med föregående period.`;
  })();

  useEffect(() => {
    let cancelled = false;
    setText(fallback);

    const run = async () => {
      try {
        const prompt = `Skriv EN mening (max 180 tecken) på svenska som identifierar huvuddrivaren bakom periodens kassaflöde. Lägg till EN andra mening ENDAST om det finns en tydlig motrörelse värd att nämna. Neutralt, inga emojis, ingen storytelling, inga uppmaningar.
Data:
- Netto: ${net.toFixed(0)} kr
- Föregående netto: ${priorNet.toFixed(0)} kr
- Inflöden: ${inflows.toFixed(0)} kr
- Utflöden: ${Math.abs(outflows).toFixed(0)} kr
- UB likvida medel: ${closingCash.toFixed(0)} kr`;

        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: {
            messages: [{ role: "user", content: prompt }],
            model: "google/gemini-2.5-flash-lite",
          },
        });
        if (error) throw error;
        const ai = (data as any)?.message ?? (data as any)?.content ?? "";
        if (!cancelled && typeof ai === "string" && ai.trim().length > 0) {
          setText(ai.trim());
        }
      } catch {
        // keep fallback
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [net, priorNet, inflows, outflows, closingCash]);

  return (
    <div className="flex items-start gap-2 text-xs italic text-slate-500 leading-relaxed">
      <Sparkles className="h-3.5 w-3.5 mt-0.5 text-slate-400 flex-shrink-0 not-italic" />
      <span className="line-clamp-2">{text}</span>
    </div>
  );
};
