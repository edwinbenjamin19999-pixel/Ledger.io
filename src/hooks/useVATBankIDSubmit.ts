/**
 * Orchestrates BankID-signed VAT submission to Skatteverket.
 *
 * Flow:
 *  1. Call edge function `bankid-auth` to start a sign order → orderRef + autoStartToken + qrData.
 *  2. Caller renders the QR / BankID UI and polls `bankid-collect` (handled here via tick callback).
 *  3. On `complete`, call `skv-vat-submit` with the signed XML payload + signature reference.
 *
 * BankID infrastructure may not be live in this project — the edge function returns a clear
 * error message in that case, which the dialog surfaces as "fall back to XML download".
 */
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BankIDStatus = "idle" | "starting" | "pending" | "complete" | "failed";

export interface BankIDStartResult {
  orderRef: string;
  autoStartToken?: string;
  qrData?: string;
}

export interface SubmitResult {
  ok: boolean;
  receiptId?: string;
  receipt?: unknown;
  error?: string;
}

export interface UseVATBankIDSubmitArgs {
  companyId: string;
  periodLabel: string;
  xmlPayload: string;
}

export function useVATBankIDSubmit() {
  const [status, setStatus] = useState<BankIDStatus>("idle");
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<{ orderRef: string; personalNumber?: string } | null>(null);
  const pollTimer = useRef<number | null>(null);

  const reset = useCallback(() => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = null;
    setStatus("idle");
    setOrderRef(null);
    setQrData(null);
    setError(null);
    setSignature(null);
  }, []);

  const start = useCallback(async (companyId: string, periodLabel: string): Promise<BankIDStartResult | null> => {
    setStatus("starting");
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("bankid-auth", {
        body: {
          companyId,
          purpose: "vat_declaration",
          periodLabel,
          userVisibleData: `Signera momsdeklaration ${periodLabel}`,
        },
      });
      if (invokeError) throw new Error(invokeError.message);
      if (!data?.orderRef) throw new Error(data?.error || "BankID-tjänsten är inte tillgänglig");

      setOrderRef(data.orderRef);
      setQrData(data.qrData ?? null);
      setStatus("pending");
      return { orderRef: data.orderRef, autoStartToken: data.autoStartToken, qrData: data.qrData };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Okänt BankID-fel";
      setError(msg);
      setStatus("failed");
      return null;
    }
  }, []);

  const poll = useCallback((ref: string, onComplete: (sig: { orderRef: string; personalNumber?: string }) => void) => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("bankid-collect", {
          body: { orderRef: ref },
        });
        if (!data) return;
        if (data.qrData) setQrData(data.qrData);
        if (data.status === "complete") {
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          pollTimer.current = null;
          const sig = { orderRef: ref, personalNumber: data.completionData?.user?.personalNumber };
          setSignature(sig);
          setStatus("complete");
          onComplete(sig);
        } else if (data.status === "failed") {
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          pollTimer.current = null;
          setError(data.hintCode || "BankID-signering avbröts");
          setStatus("failed");
        }
      } catch {
        // Swallow transient errors; user can cancel.
      }
    }, 2000) as unknown as number;
  }, []);

  const submitToSKV = useCallback(
    async (args: UseVATBankIDSubmitArgs, sig: { orderRef: string; personalNumber?: string }): Promise<SubmitResult> => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("skv-vat-submit", {
          body: {
            companyId: args.companyId,
            periodLabel: args.periodLabel,
            xmlPayload: args.xmlPayload,
            bankidOrderRef: sig.orderRef,
            personalNumber: sig.personalNumber,
          },
        });
        if (invokeError) return { ok: false, error: invokeError.message };
        if (!data?.ok) return { ok: false, error: data?.error || "Skatteverket avvisade inlämningen" };
        return { ok: true, receiptId: data.receiptId, receipt: data.receipt };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Nätverksfel mot Skatteverket" };
      }
    },
    []
  );

  return { status, orderRef, qrData, error, signature, start, poll, submitToSKV, reset };
}
