import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AccrualScheduleRow {
  id: string;
  company_id: string;
  description: string;
  total_amount: number;
  period_start: string;
  period_end: string;
  months_total: number;
  cost_account_number: string;
  prepaid_account_number: string;
  status: "active" | "completed" | "cancelled";
  source_invoice_id: string | null;
  source_journal_entry_id: string | null;
  postings: AccrualPostingRow[];
}

export interface AccrualPostingRow {
  id: string;
  schedule_id: string;
  period_month: string;
  amount: number;
  status: "pending" | "posted" | "skipped";
  journal_entry_id: string | null;
  posted_at: string | null;
}

export const useAccrualSchedules = (companyId: string | null) =>
  useQuery({
    queryKey: ["accrual-schedules", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<AccrualScheduleRow[]> => {
      const { data: schedules, error } = await supabase
        .from("accrual_schedules" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = ((schedules || []) as any[]).map(s => s.id);
      if (!ids.length) return [];
      const { data: postings } = await supabase
        .from("accrual_postings" as any)
        .select("*")
        .in("schedule_id", ids)
        .order("period_month", { ascending: true });
      const byId: Record<string, AccrualPostingRow[]> = {};
      ((postings || []) as any[]).forEach((p) => {
        (byId[p.schedule_id] ||= []).push(p as AccrualPostingRow);
      });
      return ((schedules || []) as any[]).map((s) => ({ ...(s as any), postings: byId[s.id] || [] }));
    },
  });
