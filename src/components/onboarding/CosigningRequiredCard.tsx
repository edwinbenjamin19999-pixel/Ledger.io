import { ShieldAlert, Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { useCoSigningGate } from "@/hooks/useCoSigningGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Used inline by sensitive features (DirectPayment, VAT submit, AGI submit, …)
 * as a guard. Renders nothing when full mode is active — pass the children
 * in through the `feature` prop's wrapper, or use the {@link useCoSigningGate}
 * hook directly when finer placement is needed.
 */
export const CosigningRequiredCard = ({ feature }: { feature: string }) => {
  const { pending, coSigner, coSignatureId } = useCoSigningGate();
  const [sending, setSending] = useState(false);

  if (!pending || !coSigner) return null;

  const sendReminder = async () => {
    if (!coSignatureId) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-cosigner-invite", {
        body: {
          coSignatureId,
          name: coSigner.name,
          email: coSigner.email,
          isReminder: true,
        },
      });
      if (error) throw error;
      toast.success(`Påminnelse skickad till ${coSigner.email}`);
    } catch {
      toast.error("Kunde inte skicka påminnelse");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#F0DDB7] bg-amber-50/70 p-5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#7A5417] mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-[#7A5417]">
            Kräver fullständig firmateckning
          </h3>
          <p className="text-sm text-[#7A5417] mt-1">
            "{feature}" är låst tills <span className="font-medium">{coSigner.name}</span>{" "}
            ({coSigner.email}) har signerat avtalet med BankID. Bolaget tecknas i förening
            och åtgärden är legalt bindande utåt.
          </p>
          <button
            onClick={sendReminder}
            disabled={sending}
            className="mt-3 h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Skicka påminnelse
          </button>
        </div>
      </div>
    </div>
  );
};
