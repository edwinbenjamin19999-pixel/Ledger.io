import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
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
  payment: "utbetalning",
  invoice: "faktura",
  journal_entry: "verifikation",
  annual_report: "årsredovisning",
  financial_report: "finansiell rapport",
};

export function SendReminderButton({ companyId, companyName, entityType, requestId }: Props) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const label = TYPE_LABEL[entityType] ?? entityType;
      const { error } = await supabase.from("admin_notifications").insert({
        company_id: companyId,
        notification_type: "approval_reminder",
        severity: "info",
        title: `Påminnelse: godkänn ${label}`,
        message: `Din rådgivare har skickat en påminnelse om att granska och signera ${label} för ${companyName}.`,
        metadata: { request_id: requestId, entity_type: entityType, sent_at: new Date().toISOString() },
      });
      if (error) throw error;
      toast.success("Påminnelse skickad till klient");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte skicka påminnelse");
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={sending}
      className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-60 transition-colors flex items-center gap-1.5"
    >
      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      Påminn
    </button>
  );
}
