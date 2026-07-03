// Streaming helper för AI edge functions
import { supabase } from "@/integrations/supabase/client";

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onJournalEntry?: (entry: any) => void;
  onInvoicePreview?: (preview: any) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

const REQUEST_TIMEOUT_MS = 120_000;
// Bumped from 20s → 45s to tolerate long tool-execution pauses
// (e.g. create_journal_entry + second-pass summary streaming) without
// killing the connection mid-flight.
const STREAM_IDLE_TIMEOUT_MS = 45_000;

export async function streamAIResponse(
  url: string,
  body: Record<string, any>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const controller = new AbortController();
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
      controller.abort();
    }, STREAM_IDLE_TIMEOUT_MS);
  };

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  fetchTimeoutId = setTimeout(() => {
    requestTimedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimers();
    if (requestTimedOut) callbacks.onError("AI-assistenten tog för lång tid att svara. Försök igen med en kortare fråga eller utan bilagor.");
    else if (streamWentIdle) callbacks.onError("AI-assistenten slutade svara mitt i svaret. Försök igen.");
    else if (e?.name === "AbortError") callbacks.onError("AI-förfrågan avbröts.");
    else callbacks.onError("Kunde inte ansluta till AI-assistenten. Kontrollera anslutningen och försök igen.");
    callbacks.onDone();
    return;
  }

  if (fetchTimeoutId) clearTimeout(fetchTimeoutId);

  if (!resp.ok || !resp.body) {
    clearTimers();
    const { aiMessageForStatus } = await import("./ai-error-handler");
    callbacks.onError(aiMessageForStatus(resp.status).message);
    callbacks.onDone();
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  resetIdleTimeout();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resetIdleTimeout();
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          clearTimers();
          callbacks.onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);

          if (parsed.journalEntry) {
            callbacks.onJournalEntry?.(parsed.journalEntry);
            continue;
          }

          if (parsed.invoicePreview) {
            callbacks.onInvoicePreview?.(parsed.invoicePreview);
            continue;
          }

          const content = parsed.choices?.[0]?.delta?.content;
          if (content) callbacks.onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
  } catch (e: any) {
    if (streamWentIdle) callbacks.onError("AI-assistenten slutade svara mitt i svaret. Försök igen.");
    else if (requestTimedOut) callbacks.onError("AI-assistenten tog för lång tid att svara. Försök igen med en kortare fråga eller utan bilagor.");
    else if (e?.name !== "AbortError") callbacks.onError("Anslutningen avbröts.");
    callbacks.onDone();
    return;
  }

  clearTimers();
  callbacks.onDone();
}
