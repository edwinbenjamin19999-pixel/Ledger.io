import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle, FileSignature } from "lucide-react";
import { BankIDDemoDialog } from "@/components/tax-agent/shared/BankIDDemoDialog";

interface InviteState {
  loading: boolean;
  valid: boolean;
  reason?: string;
  signerName?: string;
  signerEmail?: string;
  company?: { name: string; org_number: string } | null;
  initiator?: { name: string; email: string } | null;
  documentType?: string;
  documentVersion?: string;
  signatoryRule?: string | null;
  expiresAt?: string;
}

const CoSign = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<InviteState>({ loading: true, valid: false });
  const [bankIdOpen, setBankIdOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setState({ loading: false, valid: false, reason: "missing_token" });
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("verify-cosigner-token", {
          body: { token },
        });
        if (cancelled) return;
        if (error) throw error;
        setState({ loading: false, ...(data as Omit<InviteState, "loading">) });
      } catch {
        if (!cancelled) setState({ loading: false, valid: false, reason: "error" });
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const handleComplete = async () => {
    setSigning(true);
    try {
      const { error } = await supabase.functions.invoke("complete-cosignature", {
        body: { token },
      });
      if (error) throw error;
      setDone(true);
    } catch {
      setDone(false);
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
        <div className="flex items-center gap-2 mb-1">
          <FileSignature className="w-5 h-5 text-[#3b82f6]" />
          <span className="text-[12px] font-semibold tracking-wide text-[#3b82f6] uppercase">
            Cogniq · Medsignering
          </span>
        </div>
        <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">
          Signera kundavtal
        </h1>

        {state.loading && (
          <div className="mt-8 flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Hämtar inbjudan…
          </div>
        )}

        {!state.loading && !state.valid && (
          <div className="mt-6 p-4 rounded-xl bg-[#FAEEDA] border border-[#F0DDB7] text-[#7A5417] text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              {state.reason === "already_signed" || state.reason === "already_complete"
                ? "Den här inbjudan är redan signerad. Du behöver inte göra något mer."
                : state.reason === "expired"
                ? "Inbjudan har gått ut. Be initiatorn skicka en ny."
                : "Vi hittade ingen aktiv inbjudan för den här länken."}
            </div>
          </div>
        )}

        {!state.loading && state.valid && !done && (
          <>
            <p className="text-sm text-slate-600 mt-2 mb-5">
              <span className="font-semibold text-[#0F172A]">{state.initiator?.name}</span>
              {" "}har påbörjat onboarding för{" "}
              <span className="font-semibold text-[#0F172A]">
                {state.company?.name || "ditt bolag"}
              </span>
              {state.company?.org_number ? ` (${state.company.org_number})` : ""}.
              Eftersom bolaget tecknas <span className="font-semibold">i förening</span>,
              behöver du som medsignerare också signera kundavtalet och KYC-deklarationen
              med BankID.
            </p>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-[13px] text-slate-700 space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">Dokument</span>
                <span className="font-medium">Kundavtal {state.documentVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Signerare</span>
                <span className="font-medium">{state.signerName}</span>
              </div>
              {state.signatoryRule && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Teckningsregel</span>
                  <span className="font-medium text-right">{state.signatoryRule}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setBankIdOpen(true)}
              disabled={signing}
              className="w-full h-[52px] rounded-xl bg-[#3b82f6] hover:bg-[#3b82f6] text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Signera med BankID
            </button>

            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Signaturen är juridiskt bindande enligt eIDAS / lag (2016:561).
              IP, tidsstämpel och BankID-metadata loggas i revisionsspåret.
            </p>
          </>
        )}

        {done && (
          <div className="mt-6 p-5 rounded-xl bg-[#E1F5EE] border border-[#BFE6D6] text-[#085041] flex gap-3">
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-[15px]">Tack — du är klar!</p>
              <p className="text-sm mt-1">
                Initiatorn meddelas direkt och bolagets fulla läge aktiveras nu i Cogniq.
              </p>
            </div>
          </div>
        )}

        <BankIDDemoDialog
          open={bankIdOpen}
          onOpenChange={setBankIdOpen}
          title="Signera kundavtal som medsignerare"
          description={`Du signerar kundavtal och KYC för ${state.company?.name || "bolaget"} som behörig firmatecknare i förening.`}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
};

export default CoSign;
