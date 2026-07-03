import { useState, useRef } from "react";
import { Sparkles, Copy, X, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  firmId: string;
  initialQuestion?: string;
  onClose: () => void;
}

/**
 * Inline AI copilot response panel — streams from bureau-copilot edge function.
 * Renders below the command bar with markdown formatting + action buttons.
 */
export const CopilotAIPanel = ({ firmId, initialQuestion = "", onClose }: Props) => {
  const [messages, setMessages] = useState<Msg[]>(
    initialQuestion ? [{ role: "user", content: initialQuestion }] : [],
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-fire if there's an initial question
  useState(() => {
    if (initialQuestion) void send(initialQuestion, []);
  });

  async function send(text: string, history: Msg[]) {
    setStreaming(true);
    const newHistory: Msg[] = [...history, { role: "user", content: text }];
    setMessages([...newHistory, { role: "assistant", content: "" }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Inte inloggad");

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bureau-copilot`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firm_id: firmId, messages: newHistory }),
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("För många AI-förfrågningar — försök igen om en stund.");
        } else if (resp.status === 402) {
          toast.error("AI-krediter slut. Lägg till krediter i workspace-inställningar.");
        } else {
          toast.error("AI-fel: " + resp.status);
        }
        setStreaming(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: acc };
                return next;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("AI-fel: " + (e instanceof Error ? e.message : "okänt"));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    const q = input.trim();
    setInput("");
    void send(q, messages);
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#7C3AED]" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-medium text-[#7C3AED]">
            AI-svar
          </span>
        </div>
        <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="text-[11px] text-[#94A3B8] mb-1">Du frågade:</div>
            ) : null}
            {m.role === "user" ? (
              <div className="text-[12px] text-[#475569] italic">{m.content}</div>
            ) : (
              <div className="text-[12px] text-[#0F172A] leading-[1.6] prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0 prose-table:text-[11px] prose-th:bg-[#F8FAFC] prose-th:p-1.5 prose-td:p-1.5 prose-table:border prose-th:border prose-td:border prose-th:border-[#E2E8F0] prose-td:border-[#E2E8F0]">
                {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : streaming ? (
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-[11px]">Tänker…</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Follow-up input */}
      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2 pt-3 border-t border-[#E2E8F0]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={streaming ? "AI svarar…" : "Följdfråga…"}
          disabled={streaming}
          className="flex-1 text-[12px] text-[#0F172A] bg-transparent focus:outline-none placeholder:text-[#94A3B8]"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="bg-[#1D4ED8] hover:bg-[#1074A0] disabled:bg-[#CBD5E1] text-[#E6F4FA] rounded-[8px] text-[11px] font-medium px-[10px] h-[28px] flex items-center gap-1"
        >
          {streaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Skicka
        </button>
      </form>

      {lastAssistant?.content && !streaming && (
        <div className="mt-2 flex items-center gap-3 text-[10px]">
          <button
            onClick={() => {
              navigator.clipboard.writeText(lastAssistant.content);
              toast.success("Svar kopierat");
            }}
            className="text-[#475569] hover:text-[#1D4ED8] flex items-center gap-1"
          >
            <Copy className="h-3 w-3" /> Kopiera svar
          </button>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] ml-auto">
            Stäng
          </button>
        </div>
      )}
    </div>
  );
};
