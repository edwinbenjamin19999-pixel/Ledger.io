import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StructuredResponseCard } from "./StructuredResponseCard";
import { useCFOChat } from "@/hooks/useCFOChat";
import type { CFOContextPayload } from "@/hooks/useCFOContext";

interface Props {
  companyId: string;
  conversationId: string | null;
  context: CFOContextPayload;
  onConversationCreated?: (id: string) => void;
}

export const ConversationThread = ({ companyId, conversationId, context, onConversationCreated }: Props) => {
  const { messages, sending, send } = useCFOChat(conversationId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetingSent = useRef(false);

  // Auto-greet when opening with context but no messages
  useEffect(() => {
    if (greetingSent.current) return;
    if (conversationId) return; // existing thread
    if (context.type === "general") return;
    greetingSent.current = true;
    const greeting = context.kpi
      ? `Analysera ${context.kpi.toUpperCase()}: värde ${context.value ?? "?"}, percentil ${context.percentile ?? "?"}. Vad bör jag göra?`
      : context.scenario_name
        ? `Validera scenariot "${context.scenario_name}".`
        : "Ge mig en strategisk översikt.";
    send(companyId, greeting, context).then((id) => { if (id) onConversationCreated?.(id); });
  }, [companyId, conversationId, context, send, onConversationCreated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const onSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    const id = await send(companyId, text, context);
    if (id) onConversationCreated?.(id);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && !sending && (
          <div className="text-center py-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0052FF] mb-4">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Strategisk dialog</h3>
            <p className="text-sm text-slate-500 mt-1">Vad vill du analysera?</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[80%] rounded-2xl bg-[#0052FF] dark:bg-white dark:text-slate-900 text-white px-4 py-3 text-sm">
                {m.content}
              </div>
            ) : m.structured ? (
              <StructuredResponseCard structured={m.structured} companyId={companyId} />
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {m.content}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#0052FF]" />
            AI CFO analyserar…
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Fråga AI CFO… (Enter för att skicka)"
            rows={2}
            className="resize-none"
            disabled={sending}
          />
          <Button onClick={onSend} disabled={sending || !input.trim()} className="h-auto py-3 bg-[#0052FF] hover:bg-[#0052FF] text-white gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
