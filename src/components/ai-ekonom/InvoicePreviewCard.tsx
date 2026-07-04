import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, ExternalLink, Trash2, UserPlus, Loader2, FileText, CheckCircle2 } from "lucide-react";

export interface InvoicePreviewLine {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  vat_amount: number;
}

export interface InvoicePreviewData {
  invoice_id: string;
  invoice_number: string;
  customer: { id: string | null; name: string; org_number: string | null; email: string | null };
  customer_was_created: boolean;
  invoice_date: string;
  due_date: string;
  due_days: number;
  lines: InvoicePreviewLine[];
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  revenue_account: string;
}

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface Props {
  data: InvoicePreviewData;
  companyId: string | null;
}

type Status = "draft" | "sending" | "sent" | "cancelled";

export const InvoicePreviewCard = ({ data, companyId }: Props) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("draft");

  const handleSend = async () => {
    if (!companyId) { toast.error("Saknar företagskontext"); return; }
    setStatus("sending");
    try {
      // 1. Update invoice status → sent
      const { error: updErr } = await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", data.invoice_id);
      if (updErr) throw updErr;

      // 2. Create journal entry for the sent invoice (Dr 1510 / Cr revenue + Cr VAT)
      const journalLines: any[] = [
        { account_number: "1510", debit: data.total_amount, credit: 0, description: `Faktura ${data.invoice_number} ${data.customer.name}` },
        { account_number: data.revenue_account, debit: 0, credit: data.subtotal, description: `Försäljning faktura ${data.invoice_number}` },
      ];
      const vatByRate: Record<number, number> = {};
      for (const l of data.lines) vatByRate[l.vat_rate] = (vatByRate[l.vat_rate] || 0) + l.vat_amount;
      for (const [rate, amount] of Object.entries(vatByRate)) {
        if (amount <= 0) continue;
        const vatAccount = Number(rate) === 25 ? "2610" : Number(rate) === 12 ? "2620" : Number(rate) === 6 ? "2630" : null;
        if (vatAccount) journalLines.push({ account_number: vatAccount, debit: 0, credit: amount, description: `Utgående moms ${rate}%` });
      }

      // Resolve account ids
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId)
        .in("account_number", journalLines.map(l => l.account_number));
      const accMap = new Map((accounts || []).map(a => [a.account_number, a.id]));

      const { data: { user } } = await supabase.auth.getUser();
      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          company_id: companyId,
          entry_date: data.invoice_date,
          description: `Kundfaktura ${data.invoice_number} – ${data.customer.name}`,
          status: "draft",
          created_by: user?.id,
        })
        .select("id")
        .maybeSingle();
      if (jeErr || !je) throw jeErr || new Error("Kunde inte skapa verifikation");

      const lineRows = journalLines
        .filter(l => accMap.has(l.account_number))
        .map(l => ({
          journal_entry_id: je.id,
          account_id: accMap.get(l.account_number),
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        }));
      const { error: linesErr } = await supabase.from("journal_entry_lines").insert(lineRows);
      if (linesErr) throw linesErr;

      await supabase.from("journal_entries").update({ status: "approved" }).eq("id", je.id);
      await supabase.from("invoices").update({ journal_entry_id: je.id }).eq("id", data.invoice_id);

      setStatus("sent");
      toast.success(`Faktura ${data.invoice_number} skickad och bokförd`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Kunde inte skicka fakturan");
      setStatus("draft");
    }
  };

  const handleCancel = async () => {
    try {
      await supabase.from("invoices").update({ status: "cancelled" }).eq("id", data.invoice_id);
      setStatus("cancelled");
      toast.success("Utkast borttaget");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte ta bort utkast");
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#C8DDF5] bg-gradient-to-br from-[#3b82f6]/5 via-card to-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 bg-[#EFF6FF] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-[#3b82f6] dark:text-[#1E3A5F]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Fakturautkast</p>
            <p className="text-sm font-semibold text-foreground truncate">#{data.invoice_number} – {data.customer.name}</p>
          </div>
        </div>
        <span className={
          "text-[10px] font-medium px-2 py-0.5 rounded-full " +
          (status === "sent"
            ? "bg-[#E1F5EE] text-[#085041] dark:text-[#1D9E75]"
            : status === "cancelled"
            ? "bg-muted text-muted-foreground"
            : "bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B]")
        }>
          {status === "sent" ? "Skickad" : status === "cancelled" ? "Borttagen" : "Utkast"}
        </span>
      </div>

      {/* Customer */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground space-y-0.5">
            {data.customer.org_number && <div>Org.nr: <span className="text-foreground">{data.customer.org_number}</span></div>}
            {data.customer.email && <div>E-post: <span className="text-foreground">{data.customer.email}</span></div>}
            <div>Förfaller: <span className="text-foreground">{data.due_date}</span> ({data.due_days} dagar)</div>
          </div>
          {data.customer_was_created && data.customer.id && (
            <button
              onClick={() => navigate(`/customers?customer=${data.customer.id}`)}
              className="text-[11px] flex items-center gap-1 text-[#3b82f6] dark:text-[#1E3A5F] hover:underline"
            >
              <UserPlus className="w-3 h-3" />
              Ny kund — komplettera uppgifter
            </button>
          )}
        </div>
      </div>

      {/* Lines */}
      <div className="px-4 py-3 border-b border-border/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium pb-1.5">Beskrivning</th>
              <th className="text-right font-medium pb-1.5 w-12">Antal</th>
              <th className="text-right font-medium pb-1.5 w-20">À-pris</th>
              <th className="text-right font-medium pb-1.5 w-12">Moms</th>
              <th className="text-right font-medium pb-1.5 w-24">Summa</th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {data.lines.map((l, i) => (
              <tr key={i} className="border-t border-border/30">
                <td className="py-1.5 pr-2">{l.description}</td>
                <td className="py-1.5 text-right tabular-nums">{l.quantity}</td>
                <td className="py-1.5 text-right tabular-nums">{fmt(l.unit_price)}</td>
                <td className="py-1.5 text-right tabular-nums">{l.vat_rate}%</td>
                <td className="py-1.5 text-right tabular-nums">{fmt(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-4 py-3 border-b border-border/30 space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{fmt(data.subtotal)} kr</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Moms</span><span className="tabular-nums">{fmt(data.vat_amount)} kr</span></div>
        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border/30"><span>Totalt</span><span className="tabular-nums">{fmt(data.total_amount)} kr</span></div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={status !== "draft"}
          className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white"
        >
          {status === "sending" ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Skickar…</>
          ) : status === "sent" ? (
            <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Skickad</>
          ) : (
            <><Send className="w-3.5 h-3.5 mr-1.5" /> Skicka faktura</>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/invoices?invoice=${data.invoice_id}`)}
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          Öppna faktura
        </Button>
        {status === "draft" && (
          <Button size="sm" variant="ghost" onClick={handleCancel} className="text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Avbryt utkast
          </Button>
        )}
      </div>
    </div>
  );
};
