/**
 * Centraliserad felhantering för anrop till Lovable AI Gateway-edge-functions.
 *
 * Alla AI-anrop i frontend ska gå via dessa helpers så att 429 (rate limit),
 * 402 (krediter slut) och 5xx (gateway-fel) renderas konsekvent på svenska.
 *
 * Använd:
 *   import { handleAIResponse, toastAIError } from "@/lib/ai-error-handler";
 *
 *   const resp = await fetch(url, {...});
 *   const data = await handleAIResponse(resp); // throws AIError on failure
 *
 *   // eller efter ett supabase.functions.invoke:
 *   if (error) toastAIError(error);
 */

import { toast } from "sonner";

export type AIErrorCode = "rate_limit" | "credits" | "auth" | "gateway" | "network" | "empty" | "unknown";

export class AIError extends Error {
  code: AIErrorCode;
  status?: number;
  constructor(code: AIErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Översätter ett HTTP-status från en AI-edge-function till svenskt felmeddelande. */
export function aiMessageForStatus(status: number): { code: AIErrorCode; message: string } {
  if (status === 429) {
    return {
      code: "rate_limit",
      message: "AI-tjänsten är överbelastad just nu. Försök igen om en minut.",
    };
  }
  if (status === 402) {
    return {
      code: "credits",
      message: "AI-krediterna är slut. Lägg till mer i Workspace → Usage.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      code: "auth",
      message: "Du är inte inloggad. Logga in igen och försök på nytt.",
    };
  }
  if (status >= 500) {
    return {
      code: "gateway",
      message: "AI-tjänsten svarade inte. Försök igen om en stund.",
    };
  }
  return {
    code: "unknown",
    message: "Något gick fel i AI-anropet. Försök igen.",
  };
}

/**
 * Validerar svar från en edge-function som anropar Lovable AI Gateway.
 * Kastar AIError vid fel; returnerar parsed JSON annars.
 */
export async function handleAIResponse<T = unknown>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const { code, message } = aiMessageForStatus(resp.status);
    throw new AIError(code, message, resp.status);
  }
  try {
    return (await resp.json()) as T;
  } catch {
    throw new AIError("empty", "AI svarade tomt. Försök igen.");
  }
}

/**
 * Visar en toast baserat på fel från ett AI-anrop. Klarar både AIError,
 * supabase.functions.invoke-error och vanliga Error-objekt.
 */
export function toastAIError(err: unknown, opts?: { onRetry?: () => void; prefix?: string }) {
  let message = "Något gick fel i AI-anropet.";
  let status: number | undefined;

  if (err instanceof AIError) {
    message = err.message;
    status = err.status;
  } else if (err && typeof err === "object") {
    const e = err as { status?: number; context?: { status?: number }; message?: string };
    status = e.status ?? e.context?.status;
    if (status) {
      message = aiMessageForStatus(status).message;
    } else if (e.message) {
      message = e.message;
    }
  } else if (typeof err === "string") {
    message = err;
  }

  const fullMsg = opts?.prefix ? `${opts.prefix}: ${message}` : message;

  toast.error(fullMsg, {
    action: opts?.onRetry ? { label: "Försök igen", onClick: opts.onRetry } : undefined,
  });
}

/**
 * Kontrollerar status-koden från ett supabase.functions.invoke-fel och
 * returnerar svenskt meddelande. Använd när du har FunctionsHttpError.
 */
export function aiErrorMessage(err: unknown, fallback = "AI-tjänsten kunde inte svara just nu."): string {
  if (err instanceof AIError) return err.message;
  if (err && typeof err === "object") {
    const e = err as { status?: number; context?: { status?: number }; message?: string };
    const status = e.status ?? e.context?.status;
    if (status) return aiMessageForStatus(status).message;
    if (e.message) return e.message;
  }
  if (typeof err === "string") return err;
  return fallback;
}
