import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ForecastLock {
  id: string;
  company_id: string;
  budget_id: string | null;
  account_number: string;
  period_month: string; // YYYY-MM-DD
  locked_value: number;
  locked_at: string;
  locked_by: string | null;
  note: string | null;
}

export interface LockInput {
  companyId: string;
  budgetId: string | null;
  accountNumber: string;
  periodMonth: string; // YYYY-MM-01
  lockedValue: number;
  note?: string;
}

export function useForecastLocks(companyId: string | null, budgetId: string | null) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["forecast-locks", companyId, budgetId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [] as ForecastLock[];
      let q = supabase
        .from("forecast_locks")
        .select("*")
        .eq("company_id", companyId);
      if (budgetId) q = q.eq("budget_id", budgetId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ForecastLock[];
    },
  });

  const lock = useMutation({
    mutationFn: async (input: LockInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const { data, error } = await supabase
        .from("forecast_locks")
        .upsert(
          {
            company_id: input.companyId,
            budget_id: input.budgetId,
            account_number: input.accountNumber,
            period_month: input.periodMonth,
            locked_value: input.lockedValue,
            locked_by: userId,
            note: input.note ?? null,
            locked_at: new Date().toISOString(),
          },
          { onConflict: "company_id,budget_id,account_number,period_month" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as ForecastLock;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forecast-locks", companyId, budgetId] });
    },
  });

  const unlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forecast_locks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forecast-locks", companyId, budgetId] });
    },
  });

  /** Returns { 'acct|monthIdx' → value } for fast lookup in forecastEngine. */
  const asMap = (): Record<string, number> => {
    const m: Record<string, number> = {};
    (list.data || []).forEach((l) => {
      const monthIdx = new Date(l.period_month).getMonth();
      m[`${l.account_number}|${monthIdx}`] = Number(l.locked_value);
    });
    return m;
  };

  return { list, lock, unlock, asMap };
}
