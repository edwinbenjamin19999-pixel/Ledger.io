import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  companyName: string;
  entityType: string;
  requestId: string;
}

const TYPE_LABEL: Record<string, string> = {
  vat_declaration: "momsdeklaration",
  payroll_run: "lönekörning",
  agi_submission: "AGI-deklaration",
  income_tax_declaration: "INK2",
  annual_report: "årsredovisning",
  financial_report: "finansiell rapport",
  payment: "utbetalning",
  invoice: "faktura",
  journal_entry: "verifikation",
};

export function RequestSigningDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  entityType,
  requestId,
}: Props) {
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");

  const label = TYPE_LABEL[entityType] ?? entityType;

  const handleSend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.from("admin_notifications").insert({
        company_id: companyId,
        notification_type: "bankid_signing_request",
        severity: "warning",
        title: `Signering krävs: ${label}`,
        message:
          note ||
          `Din rådgivare har förberett ${label} för ${companyName}. Granska och signera med BankID för att slutföra processen.`,
        metadata: {
          request_id: requestId,
          entity_type: entityType,
          requires_bankid: true,
          requested_at: new Date().toISOString(),
        },
      });
      if (error) throw error;
      toast.success("Signeringsbegäran skickad. Klienten signerar med BankID.");
      onOpenChange(false);
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte skicka begäran");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div
            className="h-10 w-10 rounded-2xl mb-2 flex items-center justify-center"
            style={{ background: "hsl(var(--brand-primary) / 0.1)" }}
          >
            <ShieldCheck className="h-5 w-5" style={{ color: "hsl(var(--brand-primary))" }} />
          </div>
          <DialogTitle>Skicka för BankID-signering</DialogTitle>
          <DialogDescription>
            Klienten <span className="font-semibold text-[#0F172A]">{companyName}</span> får en notis och kan
            granska + signera <span className="font-semibold">{label}</span> direkt i sin app.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#64748B]">Meddelande (valfritt)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={`T.ex. "Granska och signera ${label} senast fredag."`}
            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{ ['--tw-ring-color' as string]: 'hsl(var(--brand-primary))' }}
          />
          <div className="bg-[#F8FAFC] rounded-xl px-3 py-2.5 text-xs text-[#64748B] flex items-start gap-2">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "hsl(var(--brand-primary))" }} />
            <span>
              Signaturen är legalt bindande och loggas i revisionsspåret. Inget manuellt arbete krävs efter att
              klienten signerat — statusen uppdateras automatiskt.
            </span>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              Avbryt
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-60"
              style={{ background: "hsl(var(--brand-primary))" }}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Skicka för signering
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
