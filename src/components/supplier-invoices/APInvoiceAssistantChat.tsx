/**
 * APInvoiceAssistantChat — live AI sidekick for a single supplier invoice.
 * Streams Markdown answers from the ap-invoice-assistant edge function.
 * Suggested-action chips inject real prompts into the chat.
 */
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  /** Static one-liner shown above the chat as the initial AI insight. */
  initialInsight?: string;
}

const SUGGESTIONS = [
  "Varför detta konto?",
  "Jämför med tidigare fakturor",
  "Kontrollera dubblett",
  "Är beloppet rimligt?",
];

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ap-invoice-assistant`;

export function APInvoiceAssistantChat({
  invoiceId,
  invoiceNumber,
  supplierName,
  initialInsight,
}: Props) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset chat when switching invoices
  useEffect(() => {
    setMessages([]);
    setInput("");
    abortRef.current?.abort();
  }, [invoiceId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Du behöver vara inloggad");

      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          invoice_id: invoiceId,
          messages: next,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error("AI-tjänsten är överbelastad — prova igen om en stund.");
          return;
        }
        if (resp.status === 402) {
          toast.error("AI-krediter slut. Lägg till krediter i Settings → Workspace → Usage.");
          return;
        }
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Kunde inte starta AI-svar");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buffer += decoder.decode(r.value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) upsert(delta);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush trailing buffer
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const payload = raw.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) upsert(delta);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("AI chat error", e);
        toast.error(e.message || "AI-fel");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="rounded-2xl bg-slate-950 text-slate-100 border-t-2 border-[#3b82f6] overflow-hidden shadow-lg">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#1E3A5F]" />
          <span className="text-sm font-semibold">Cogniq Assistent</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            #{invoiceNumber}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Initial insight */}
          {initialInsight && messages.length === 0 && (
            <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 rounded-xl p-3 border border-slate-800">
              {initialInsight}
            </div>
          )}

          {/* Conversation */}
          {messages.length > 0 && (
            <div
              ref={scrollRef}
              className="max-h-[280px] overflow-y-auto space-y-3 pr-1 scrollbar-thin"
            >
              {messages.map((m, i) => (
                <div key={i} className={cn(m.role === "user" && "text-right")}>
                  <div
                    className={cn(
                      "inline-block max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                      m.role === "user"
                        ? "bg-[#EFF6FF] text-blue-100 border border-[#C8DDF5]"
                        : "bg-slate-900 text-slate-100 border border-slate-800",
                    )}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-invert prose-xs max-w-none [&_*]:text-xs [&_h2]:text-sm [&_h2]:mt-2 [&_h2]:mb-1 [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Tänker…
                </div>
              )}
            </div>
          )}

          {/* Suggestions (only before first message) */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={streaming}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ställ en fråga om fakturan från ${supplierName}…`}
              disabled={streaming}
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 text-xs h-9 focus-visible:ring-[#3b82f6]/40"
            />
            <Button
              type="submit"
              size="sm"
              disabled={streaming || !input.trim()}
              className="bg-[#3b82f6] hover:bg-[#3b82f6] text-slate-950 h-9"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
