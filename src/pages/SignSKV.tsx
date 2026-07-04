/**
 * Public mobile-friendly signing page used by VD / firmatecknare to BankID-sign
 * a Skatteverket filing (VAT, AGI) without logging in to the app.
 *
 * URL: /sign-skv/:envelopeId?token=…
 *
 * Flow:
 *  1. Verify envelope via SECURITY DEFINER `get_signing_envelope_by_token` RPC.
 *  2. Start BankID via `bankid-auth` edge function.
 *  3. Poll `bankid-collect`. On complete, post payload to `skv-vat-submit`
 *     (or skv-agi-submit / skv-income-tax-submit depending on document_type).
 *  4. Mark envelope completed.
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck,
  Smartphone,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Envelope {
  id: string;
  document_type: string;
  document_title: string;
  status: string;
  signatories: Array<{ name: string; email: string }>;
  payload: { xml: string; periodLabel: string; companyId?: string };
  sent_at: string | null;
  completed_at: string | null;
}

type Stage = "loading" | "ready" | "starting" | "pending" | "submitting" | "done" | "error";

export default function SignSKV() {
  const { envelopeId } = useParams<{ envelopeId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [stage, setStage] = useState<Stage>("loading");
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  // 1. Load envelope via public RPC
  useEffect(() => {
    if (!envelopeId || !token) {
      setStage("error");
      setError("Ogiltig länk — saknad envelope eller token");
      return;
    }
    (async () => {
      const { data, error: rpcErr } = await supabase.rpc(
        "get_signing_envelope_by_token",
        { _token: token }
      );
      if (rpcErr || !data || data.length === 0) {
        setStage("error");
        setError("Länken är ogiltig eller har redan använts");
        return;
      }
      setEnvelope(data[0] as Envelope);
      setStage("ready");
    })();
  }, [envelopeId, token]);

  // 2. Start BankID
  const start = useCallback(async () => {
    if (!envelope) return;
    setStage("starting");
    setError(null);
    try {
      const { data, error: e } = await supabase.functions.invoke("bankid-auth", {
        body: {
          purpose: envelope.document_type,
          periodLabel: envelope.payload.periodLabel,
          userVisibleData: `Signera ${envelope.document_title}`,
        },
      });
      if (e || !data?.orderRef) {
        throw new Error(data?.error || e?.message || "BankID kunde inte startas");
      }
      setOrderRef(data.orderRef);
      setQrData(data.qrData ?? null);
      setStage("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Okänt BankID-fel");
      setStage("error");
    }
  }, [envelope]);

  // 3. Poll
  useEffect(() => {
    if (stage !== "pending" || !orderRef || !envelope) return;
    const interval = window.setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("bankid-collect", {
          body: { orderRef },
        });
        if (!data) return;
        if (data.qrData) setQrData(data.qrData);
        if (data.status === "complete") {
          window.clearInterval(interval);
          setStage("submitting");
          const { data: sd, error: sErr } = await supabase.functions.invoke(
            "skv-submit-from-mobile-link",
            {
              body: {
                envelopeId: envelope.id,
                publicToken: token,
                documentType: envelope.document_type,
                bankidOrderRef: orderRef,
                personalNumber: data.completionData?.user?.personalNumber,
              },
            }
          );
          if (sErr || !sd?.ok) {
            setStage("error");
            setError(sd?.error || sErr?.message || "Skatteverket avvisade inlämningen");
            return;
          }
          setReceiptId(sd.receiptId ?? null);
          setStage("done");
        } else if (data.status === "failed") {
          window.clearInterval(interval);
          setStage("error");
          setError(data.hintCode || "BankID-signering avbröts");
        }
      } catch {
        // transient — continue polling
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [stage, orderRef, envelope, token]);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2 text-[#3b82f6] mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Cogniq Signering
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            {envelope?.document_title ?? "Skatteverkets-deklaration"}
          </h1>
          {envelope?.payload?.periodLabel && (
            <p className="text-xs text-slate-500 mt-0.5">
              Period: {envelope.payload.periodLabel}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {stage === "loading" && (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Laddar…
            </div>
          )}

          {stage === "ready" && envelope && (
            <>
              <div className="text-sm text-slate-700 leading-relaxed">
                Hej {envelope.signatories?.[0]?.name ?? ""}! Du är ombedd att
                signera <strong>{envelope.document_title}</strong> med BankID.
                Direkt efter signering skickas deklarationen automatiskt till
                Skatteverket.
              </div>
              <Button onClick={start} className="w-full gap-2 bg-[#3b82f6] hover:bg-[#3b82f6]/80">
                <Smartphone className="h-4 w-4" />
                Starta BankID
              </Button>
              <p className="text-[11px] text-slate-400 text-center">
                Du behöver inget konto i Cogniq för att signera.
              </p>
            </>
          )}

          {stage === "starting" && (
            <div className="flex items-center justify-center py-8 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Startar BankID…
            </div>
          )}

          {stage === "pending" && (
            <div className="space-y-3 text-center">
              {qrData && (
                <div className="mx-auto w-44 h-44 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-400">
                    QR-kod
                  </span>
                </div>
              )}
              <p className="text-sm text-slate-700 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Öppna BankID-appen och signera
              </p>
              <p className="text-xs text-slate-500">
                Eller scanna QR-koden från en annan enhet.
              </p>
            </div>
          )}

          {stage === "submitting" && (
            <div className="flex items-center justify-center py-6 text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Skickar till Skatteverket…
            </div>
          )}

          {stage === "done" && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900">
                Klart!
              </h2>
              <p className="text-sm text-slate-600">
                {envelope?.document_title} har signerats och lämnats in till
                Skatteverket.
              </p>
              {receiptId && (
                <p className="text-[11px] font-mono text-slate-500">
                  Kvittens-id: {receiptId}
                </p>
              )}
            </div>
          )}

          {stage === "error" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Något gick fel</AlertTitle>
              <AlertDescription className="text-xs">
                {error ?? "Okänt fel"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-slate-50 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Säker signering via BankID</span>
          <span>cogniq.se</span>
        </div>
      </div>
    </div>
  );
}
