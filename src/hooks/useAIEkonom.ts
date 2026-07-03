import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { classifyIntent, type Intent, type AnyBlock } from "@/lib/ai-ekonom/intentRouter";
import { toastAIError, aiMessageForStatus } from "@/lib/ai-error-handler";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: Intent;
  blocks?: AnyBlock[];
  streaming?: boolean;
  error?: boolean;
  retryOf?: string; // user message text to re-send
  ts: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-bookkeeper-stream`;
const REQUEST_TIMEOUT_MS = 90_000;
const STREAM_IDLE_TIMEOUT_MS = 20_000;

function findStructuredJsonBlock(text: string): { start: number; end: number } | null {
  const fencedStart = text.search(/```(?:json|javascript|js)?\s*/i);
  if (fencedStart !== -1) {
    const fenceEnd = text.indexOf("```", fencedStart + 3);
    if (fenceEnd !== -1) {
      const candidate = text.slice(fencedStart, fenceEnd + 3);
      if (/createJournalEntry|"lines"\s*:/.test(candidate)) {
        return { start: fencedStart, end: fenceEnd + 3 };
      }
    } else {
      return { start: fencedStart, end: text.length };
    }
  }

  const keyIndex = text.indexOf('"createJournalEntry"');
  if (keyIndex === -1) return null;

  let start = keyIndex;
  while (start >= 0 && text[start] !== "{") start -= 1;
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return { start, end: i + 1 };
    }
  }

  return { start, end: text.length };
}

/**
 * Strip structured bookkeeping JSON from assistant text so the UI can show
 * the dedicated action/verifikat block instead of raw payload text.
 */
function stripJsonBlocks(text: string): string {
  if (!text) return text;

  let out = text.replace(/```(?:json|javascript|js)?\s*[\s\S]*?```/gi, (m) =>
    /createJournalEntry|"lines"\s*:/.test(m) ? "" : m,
  );

  const structuredBlock = findStructuredJsonBlock(out);
  if (structuredBlock) {
    out = `${out.slice(0, structuredBlock.start)}${out.slice(structuredBlock.end)}`;
  }

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function useAIEkonom(companyId: string | null) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIntent, setActiveIntent] = useState<Intent | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    if (!companyId) {
      const { toast } = await import("sonner");
      toast.error("Inget aktivt bolag valt", { description: "Välj bolag i toppmenyn och försök igen." });
      return;
    }
    const intent = classifyIntent(text);
    setActiveIntent(intent);

    const userTurn: ChatTurn = { id: crypto.randomUUID(), role: "user", text, ts: Date.now() };
    const aiTurnId = crypto.randomUUID();
    const aiTurn: ChatTurn = { id: aiTurnId, role: "assistant", text: "", intent, blocks: [], streaming: true, retryOf: text, ts: Date.now() };
    setTurns(prev => [...prev, userTurn, aiTurn]);
    setLoading(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let requestTimedOut = false;
    let streamWentIdle = false;
    let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const clearTimers = () => {
      if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
    };
    const resetIdleTimeout = () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => {
        streamWentIdle = true;
        ctrl.abort();
      }, STREAM_IDLE_TIMEOUT_MS);
    };

    fetchTimeoutId = setTimeout(() => {
      requestTimedOut = true;
      ctrl.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          message: text,
          companyId,
          intent,
          conversationHistory: turns.slice(-8).map(t => ({ role: t.role, content: t.text })),
        }),
        signal: ctrl.signal,
      });

      if (fetchTimeoutId) { clearTimeout(fetchTimeoutId); fetchTimeoutId = null; }

      if (!resp.ok || !resp.body) {
        const { message } = aiMessageForStatus(resp.status);
        toastAIError({ status: resp.status });
        setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, streaming: false, error: true, text: t.text || message } : t));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      const blocks: AnyBlock[] = [];
      resetIdleTimeout();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetIdleTimeout();
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            if (parsed.journalEntry) {
              const j = parsed.journalEntry;
              // Derive amount from lines[] if not provided directly (sum of debits)
              let amountNum: number | null = null;
              if (typeof j.amount === "number") amountNum = j.amount;
              else if (Array.isArray(j.lines)) {
                amountNum = j.lines.reduce(
                  (sum: number, l: { debit?: number | null }) => sum + (Number(l.debit) || 0),
                  0,
                );
              }
              const amountLabel =
                amountNum && amountNum > 0
                  ? `${amountNum.toLocaleString("sv-SE")} kr`
                  : "—";
              blocks.push({
                kind: "action",
                title: j.description || "Bokföringsförslag",
                voucherId: j.id,
                date: j.entry_date || j.date,
                status: j.status,
                amount: amountLabel,
                lines: Array.isArray(j.lines)
                  ? j.lines.map((line: { account: string; accountName?: string; debit?: number | null; credit?: number | null }) => ({
                      account: line.account,
                      accountName: line.accountName,
                      debit: line.debit,
                      credit: line.credit,
                    }))
                  : [],
                confidence: j.ai_confidence ?? j.confidence,
                fields: [
                  { label: "Datum", value: j.entry_date || j.date || "—" },
                  { label: "Belopp", value: amountLabel, mono: true },
                  ...(j.account_number ? [{ label: "Konto", value: `${j.account_number} ${j.account_name || ""}` }] : []),
                ],
                primary: j.id ? { label: "Öppna verifikation", intent: "open" } : { label: "Godkänn", intent: "approve" },
              });
              continue;
            }
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, text: stripJsonBlocks(acc) } : t));
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, streaming: false, blocks, text: stripJsonBlocks(acc) || "Klar." } : t));
    } catch (e: any) {
      if (streamWentIdle) {
        setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, streaming: false, error: true, text: t.text || "AI-assistenten svarar inte just nu. Försök igen — ditt bolag och text är sparat." } : t));
      } else if (requestTimedOut) {
        setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, streaming: false, error: true, text: t.text || "AI-assistenten tog för lång tid att svara. Försök igen." } : t));
      } else if (e?.name !== "AbortError") {
        toastAIError(e, { prefix: "AI-anrop avbrutet" });
        setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, streaming: false, error: true, text: t.text || "Avbruten." } : t));
      } else {
        setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, streaming: false } : t));
      }
    } finally {
      clearTimers();
      setLoading(false);
    }
  }, [companyId, turns, loading]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const retry = useCallback((turnId: string) => {
    const t = turns.find(x => x.id === turnId);
    if (t?.retryOf) send(t.retryOf);
  }, [turns, send]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { turns, send, stop, retry, loading, activeIntent, setTurns };
}
