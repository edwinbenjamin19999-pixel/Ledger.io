import { useState } from "react";
import { useCoSigningGate } from "@/hooks/useCoSigningGate";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Mail, Loader2, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Global banner shown across the app while a "två i förening" onboarding is
 * waiting for the second signatory to complete BankID. Kept slim so it doesn't
 * push layout — single line on desktop, two on narrow viewports.
 */
export const CoSigningPendingBanner = () => {
  const { pending, coSigner, coSignatureId } = useCoSigningGate();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (!pending || dismissed || !coSigner) return null;

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
      toast.error("Kunde inte skicka påminnelse — försök igen");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#FAEEDA] border-b border-[#F0DDB7] px-4 py-2 flex items-center gap-3 text-[13px]">
      <AlertTriangle className="w-4 h-4 text-[#7A5417] shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-[#7A5417]">Co-signering väntar</span>
        <span className="text-[#7A5417] ml-2">
          Inbjudan skickad till <span className="font-medium">{coSigner.name}</span>{" "}
          ({coSigner.email}). Skarpa betalningar och myndighetsinlämningar är låsta tills
          medsigneraren har signerat.
        </span>
      </div>
      <button
        onClick={sendReminder}
        disabled={sending}
        className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-60"
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
        Påminn nu
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="h-7 w-7 rounded-md hover:bg-[#FAEEDA] flex items-center justify-center"
        aria-label="Dölj"
      >
        <X className="w-3.5 h-3.5 text-[#7A5417]" />
      </button>
    </div>
  );
};
