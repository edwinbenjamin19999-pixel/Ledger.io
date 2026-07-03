import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PreAccountingRow {
  id: string;
  invoice_id: string;
  company_id: string;
  account: string | null;
  vat_code: string | null;
  cost_center: string | null;
  project_code: string | null;
  periodization_plan: { months?: { month: string; amount: number }[] } | null;
  confidence: number | null;
  source: string | null;
}

export function useInvoicePreAccounting(invoiceId: string | null) {
  return useQuery({
    queryKey: ["invoice-preaccounting", invoiceId],
    enabled: !!invoiceId,
    queryFn: async (): Promise<PreAccountingRow | null> => {
      const { data, error } = await supabase
        .from("invoice_preaccounting")
        .select(
          "id,invoice_id,company_id,account,vat_code,cost_center,project_code,periodization_plan,confidence,source",
        )
        .eq("invoice_id", invoiceId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PreAccountingRow) ?? null;
    },
  });
}
