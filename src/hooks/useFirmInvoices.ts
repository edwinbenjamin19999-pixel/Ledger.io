import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export type InvoiceStatusGroup = "draft" | "sent" | "overdue" | "paid";

export interface FirmInvoiceRow {
  id: string;
  company_id: string;
  client_name: string;
  invoice_number: string | null;
  counterparty_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number;
  currency: string;
  status: string;
  collection_status: string | null;
  reminder_count: number;
  paid_at: string | null;
  sent_at: string | null;
  group: InvoiceStatusGroup;
}

/**
 * Cross-client AR invoice ledger for WL workspace. Reads `invoices` filtered
 * to the firm's client companies, classifies each row into a workflow group,
 * and joins client display names.
 */
export function useFirmInvoices() {
  const { firmId, clients } = useAdvisorContext();

  return useQuery({
    queryKey: ["firm-invoices", firmId, clients.map((c) => c.id)],
    enabled: !!firmId && clients.length > 0,
    queryFn: async (): Promise<FirmInvoiceRow[]> => {
      const companyIds = clients.map((c) => c.id);
      if (companyIds.length === 0) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, company_id, invoice_number, counterparty_name, invoice_date, due_date, total_amount, currency, status, collection_status, reminder_count, paid_at, sent_at",
        )
        .in("company_id", companyIds)
        .eq("invoice_direction", "outgoing")
        .order("invoice_date", { ascending: false })
        .limit(500);

      if (error) throw error;

      const nameMap = new Map(clients.map((c) => [c.id, c.name]));
      const today = new Date().toISOString().slice(0, 10);

      return (data ?? []).map((r) => {
        const status = String(r.status ?? "");
        let group: InvoiceStatusGroup = "draft";
        if (r.paid_at || status === "paid") group = "paid";
        else if (status === "draft") group = "draft";
        else if (r.due_date && r.due_date < today && !r.paid_at) group = "overdue";
        else group = "sent";

        return {
          id: r.id,
          company_id: r.company_id,
          client_name: nameMap.get(r.company_id) ?? "Okänd klient",
          invoice_number: r.invoice_number,
          counterparty_name: r.counterparty_name,
          invoice_date: r.invoice_date,
          due_date: r.due_date,
          total_amount: Number(r.total_amount ?? 0),
          currency: r.currency ?? "SEK",
          status,
          collection_status: r.collection_status,
          reminder_count: r.reminder_count ?? 0,
          paid_at: r.paid_at,
          sent_at: r.sent_at,
          group,
        };
      });
    },
  });
}
