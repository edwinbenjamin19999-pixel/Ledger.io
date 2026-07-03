import { useState, useRef, useCallback } from "react";
import { streamAIResponse } from "@/lib/stream-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export function useAICopilot(annualReportId: string | null, companyId: string | null) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      if (!annualReportId || !companyId) {
        toast.error("Saknar utkast");
        return;
      }
      const userMsg: CopilotMessage = { role: "user", content: text, ts: Date.now() };
      const assistantMsg: CopilotMessage = { role: "assistant", content: "", ts: Date.now() };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ar-copilot-stream`;
      let acc = "";
      await streamAIResponse(
        url,
        {
          annualReportId,
          companyId,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        },
        {
          onDelta: (chunk) => {
            acc += chunk;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { ...next[next.length - 1], content: acc };
              return next;
            });
          },
          onDone: () => setStreaming(false),
          onError: (msg) => {
            toast.error(msg);
            setStreaming(false);
          },
        },
        abortRef.current.signal,
      );
    },
    [annualReportId, companyId, messages],
  );

  const cancel = () => abortRef.current?.abort();

  const clear = () => setMessages([]);

  return { messages, streaming, send, cancel, clear };
}
