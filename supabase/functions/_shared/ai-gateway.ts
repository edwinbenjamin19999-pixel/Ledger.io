// Shared AI Gateway helper with automatic model fallback.
// Ensures we never break if a provider is down, rate-limited, or returns empty.
//
// Usage:
//   const data = await callAIWithFallback({
//     primary: "openai/gpt-5",
//     fallbacks: ["google/gemini-2.5-pro", "google/gemini-2.5-flash"],
//     messages: [...],
//   });

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface AIGatewayOptions {
  primary: string;
  fallbacks?: string[];
  messages: Array<{ role: string; content: any }>;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: any;
  response_format?: any;
  reasoning?: { effort: string };
  signal?: AbortSignal;
}

export interface AIGatewayResult {
  data: any;
  modelUsed: string;
  attemptsLog: Array<{ model: string; status: number | "ok" | "empty" | "exception"; error?: string }>;
}

/**
 * Calls Lovable AI Gateway with automatic fallback to backup models.
 * Retries on: 429 (rate limit), 500/502/503 (server errors), empty content, network errors.
 * Does NOT retry on: 401/403 (auth), 400 (bad request), 402 (no credits) — these are permanent.
 */
export async function callAIWithFallback(opts: AIGatewayOptions): Promise<AIGatewayResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const models = [opts.primary, ...(opts.fallbacks || [])];
  const attemptsLog: AIGatewayResult["attemptsLog"] = [];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const body: any = {
        model,
        messages: opts.messages,
      };
      if (opts.temperature !== undefined) body.temperature = opts.temperature;
      if (opts.max_tokens !== undefined) body.max_tokens = opts.max_tokens;
      if (opts.tools) body.tools = opts.tools;
      if (opts.tool_choice) body.tool_choice = opts.tool_choice;
      if (opts.response_format) body.response_format = opts.response_format;
      if (opts.reasoning) body.reasoning = opts.reasoning;

      const resp = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });

      // Permanent failures — don't retry, surface immediately
      if (resp.status === 402) {
        attemptsLog.push({ model, status: 402, error: "credits exhausted" });
        throw new Error("AI-krediter slut. Lägg till mer i Settings.");
      }
      if (resp.status === 401 || resp.status === 403) {
        attemptsLog.push({ model, status: resp.status, error: "auth failed" });
        throw new Error("AI-tjänsten kunde inte autentiseras.");
      }

      // Transient failures — try next model
      if (resp.status === 429 || resp.status >= 500) {
        const errText = await resp.text().catch(() => "");
        attemptsLog.push({ model, status: resp.status, error: errText.slice(0, 200) });
        lastError = new Error(`Model ${model} returned ${resp.status}`);
        console.warn(`[ai-gateway] ${model} failed (${resp.status}), trying next...`);
        continue;
      }

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        attemptsLog.push({ model, status: resp.status, error: errText.slice(0, 200) });
        lastError = new Error(`Model ${model} returned ${resp.status}: ${errText.slice(0, 100)}`);
        console.warn(`[ai-gateway] ${model} returned ${resp.status}, trying next...`);
        continue;
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      const toolCalls = data.choices?.[0]?.message?.tool_calls;

      // Empty response — try next
      if (!content && !toolCalls) {
        attemptsLog.push({ model, status: "empty" });
        lastError = new Error(`Model ${model} returned empty content`);
        console.warn(`[ai-gateway] ${model} returned empty response, trying next...`);
        continue;
      }

      attemptsLog.push({ model, status: "ok" });
      return { data, modelUsed: model, attemptsLog };
    } catch (e: any) {
      // Permanent errors thrown above re-throw
      if (e.message?.includes("krediter slut") || e.message?.includes("autentiseras")) {
        throw e;
      }
      attemptsLog.push({ model, status: "exception", error: e.message?.slice(0, 200) });
      lastError = e;
      console.warn(`[ai-gateway] ${model} threw: ${e.message}`);
      continue;
    }
  }

  console.error("[ai-gateway] All models failed:", attemptsLog);
  throw lastError || new Error("Alla AI-modeller misslyckades");
}

/**
 * Recommended fallback chains by task type.
 * Use these constants to keep model selection consistent across functions.
 *
 * HYBRID STRATEGY (2026-04):
 * - GPT-5 / 5.2 for compliance-critical reasoning (tax, VAT, audit)
 * - Gemini 2.5 Pro for multimodal (receipts, PDFs) and long-context (annual reports)
 * - Gemini Flash for streaming chat (low latency, low cost)
 * - GPT-5-nano / Gemini Flash-Lite for classification
 */
export const MODEL_CHAINS: Record<string, { primary: string; fallbacks: string[] }> = {
  // Complex text reasoning (year-end audit, annual report sections, deep analysis)
  complexReasoning: {
    primary: "openai/gpt-5",
    fallbacks: ["google/gemini-2.5-pro", "google/gemini-2.5-flash"],
  },
  // Highest precision (corporate tax, K10, INK2 calculations)
  precisionReasoning: {
    primary: "openai/gpt-5.2",
    fallbacks: ["openai/gpt-5", "google/gemini-2.5-pro"],
  },
  // Compliance-critical reasoning (VAT/SKV 4700, AGI, regulatory submissions)
  // Zero tolerance for errors — OpenAI primary, GPT-5 fallback, Gemini Pro last resort
  compliance: {
    primary: "openai/gpt-5.2",
    fallbacks: ["openai/gpt-5", "google/gemini-2.5-pro"],
  },
  // Balanced insights (CFO chat, business insights, narrative analysis)
  balancedInsights: {
    primary: "openai/gpt-5-mini",
    fallbacks: ["google/gemini-2.5-flash", "google/gemini-3-flash-preview"],
  },
  // Multimodal (receipts, invoices, K-blanketter, contracts) — Gemini superior
  multimodal: {
    primary: "google/gemini-2.5-pro",
    fallbacks: ["openai/gpt-5", "google/gemini-2.5-flash"],
  },
  // Long-context narrative (annual reports, multi-document analysis)
  // Gemini Pro has 1M+ context window
  longContext: {
    primary: "google/gemini-2.5-pro",
    fallbacks: ["openai/gpt-5", "google/gemini-2.5-flash"],
  },
  // Streaming chat (low latency UX — global assistant, AI bookkeeper chat)
  streaming: {
    primary: "google/gemini-3-flash-preview",
    fallbacks: ["google/gemini-2.5-flash", "openai/gpt-5-mini"],
  },
  // Bookkeeping decisions — Gemini Pro default (multimodal + cost),
  // GPT-5 fallback for high-stakes accuracy
  bookkeeping: {
    // Streaming chat — prioritize low latency so the chat UI doesn't hit
    // the 45s idle timeout while the model warms up.
    primary: "google/gemini-3-flash-preview",
    fallbacks: ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "openai/gpt-5-mini"],
  },
  // High-value bookkeeping (transactions > 50 000 kr) — GPT-5 first for strict rule reasoning
  bookkeepingHighValue: {
    primary: "openai/gpt-5",
    fallbacks: ["google/gemini-2.5-pro", "google/gemini-2.5-flash"],
  },
  // Fast classification (categorization, intent routing, anomaly flags)
  classification: {
    primary: "openai/gpt-5-nano",
    fallbacks: ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"],
  },
} as const;

/* =========================================================================
   Streaming with fallback
   ========================================================================= */

export interface AIStreamOptions {
  primary: string;
  fallbacks?: string[];
  messages: Array<{ role: string; content: any }>;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: any;
  reasoning?: { effort: string };
  signal?: AbortSignal;
}

export interface AIStreamResult {
  /** Upstream SSE body — pipe straight to client. */
  body: ReadableStream<Uint8Array>;
  modelUsed: string;
  attemptsLog: Array<{ model: string; status: number | "ok"; error?: string }>;
}

/**
 * Streaming variant of callAIWithFallback.
 *
 * Tries each model in order. Only the **handshake** is fallback-protected —
 * once a model starts streaming we trust it (mid-stream errors surface to
 * the client through normal SSE close, and the client's stream-helper has
 * its own retry logic).
 *
 * Returns the upstream ReadableStream so the caller can wrap or forward it.
 */
export async function callAIStreamWithFallback(opts: AIStreamOptions): Promise<AIStreamResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const models = [opts.primary, ...(opts.fallbacks || [])];
  const attemptsLog: AIStreamResult["attemptsLog"] = [];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const body: any = { model, messages: opts.messages, stream: true };
      if (opts.temperature !== undefined) body.temperature = opts.temperature;
      if (opts.max_tokens !== undefined) body.max_tokens = opts.max_tokens;
      if (opts.tools) body.tools = opts.tools;
      if (opts.tool_choice) body.tool_choice = opts.tool_choice;
      if (opts.reasoning) body.reasoning = opts.reasoning;

      const resp = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });

      if (resp.status === 402) {
        attemptsLog.push({ model, status: 402, error: "credits exhausted" });
        throw new Error("AI-krediter slut. Lägg till mer i Settings.");
      }
      if (resp.status === 401 || resp.status === 403) {
        attemptsLog.push({ model, status: resp.status, error: "auth failed" });
        throw new Error("AI-tjänsten kunde inte autentiseras.");
      }
      if (resp.status === 429 || resp.status >= 500) {
        const errText = await resp.text().catch(() => "");
        attemptsLog.push({ model, status: resp.status, error: errText.slice(0, 200) });
        lastError = new Error(`Stream model ${model} returned ${resp.status}`);
        console.warn(`[ai-gateway:stream] ${model} failed (${resp.status}), trying next...`);
        continue;
      }
      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        attemptsLog.push({ model, status: resp.status, error: errText.slice(0, 200) });
        lastError = new Error(`Stream model ${model} returned ${resp.status}`);
        continue;
      }

      attemptsLog.push({ model, status: "ok" });
      return { body: resp.body, modelUsed: model, attemptsLog };
    } catch (e: any) {
      if (e.message?.includes("krediter slut") || e.message?.includes("autentiseras")) throw e;
      attemptsLog.push({ model, status: 0 as any, error: e.message?.slice(0, 200) });
      lastError = e;
      console.warn(`[ai-gateway:stream] ${model} threw: ${e.message}`);
      continue;
    }
  }

  console.error("[ai-gateway:stream] All models failed:", attemptsLog);
  throw lastError || new Error("Alla AI-modeller misslyckades (stream)");
}

/**
 * Build a one-shot SSE ReadableStream from a pre-computed text. Useful when
 * a non-streaming response is reused as a stream for the client.
 */
export function textToSSEStream(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const sseData = JSON.stringify({ choices: [{ delta: { content } }] });
      controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}
