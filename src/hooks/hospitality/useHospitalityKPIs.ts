import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustry } from "@/contexts/IndustryContext";
import { calculateHospitalityKPIs } from "@/lib/hospitality/kpiCalculator";

export function useHospitalityKPIs() {
  const { companyId } = useIndustry();

  return useQuery({
    queryKey: ["hospitality-kpis", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

      const [posRes, ledgerRes, staffRes] = await Promise.all([
        supabase
          .from("pos_daily_sales")
          .select("sale_date, total_sales, transaction_count")
          .eq("company_id", companyId!)
          .gte("sale_date", monthStart),
        supabase
          .from("journal_entry_lines")
          .select("account_number, debit_amount, journal_entries!inner(entry_date, company_id)")
          .eq("journal_entries.company_id", companyId!)
          .gte("journal_entries.entry_date", monthStart),
        supabase
          .from("staff_cost_imports")
          .select("total_cost, actual_cost")
          .eq("company_id", companyId!)
          .eq("period_month", monthStart),
      ]);

      const pos = (posRes.data ?? []) as Array<{
        sale_date: string;
        total_sales: number;
        transaction_count: number;
      }>;
      const txns = pos.reduce((s, r) => s + Number(r.transaction_count || 0), 0);

      return calculateHospitalityKPIs(
        pos,
        (ledgerRes.data ?? []) as any,
        (staffRes.data ?? []) as any,
        txns,
      );
    },
    staleTime: 60_000,
  });
}
