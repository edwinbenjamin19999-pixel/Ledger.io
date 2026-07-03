import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VarianceRow } from "@/components/financial-analysis/types";

export interface AccountSuggestion {
  account_number: string;
  suggested_value: number;
  reason: string | null;
  expected_impact_sek: number;
  confidence: number;
}

interface Args {
  companyId: string | null;
  rows: VarianceRow[];
  periodHash: string;
  enabled?: boolean;
}

export function useAccountSuggestions({ companyId, rows, periodHash, enabled = true }: Args) {
  return useQuery({
    queryKey: ['account-suggestions', companyId, periodHash],
    enabled: enabled && !!companyId && rows.length > 0,
    staleTime: 1000 * 60 * 60, // 1h client-side
    queryFn: async (): Promise<AccountSuggestion[]> => {
      if (!companyId) return [];

      // Flatten account-level rows from all sections
      const accounts = rows.flatMap(section =>
        (section.children || []).map(child => ({
          account_number: child.accountNumber || child.id,
          account_name: child.label,
          actual: child.actual,
          budget: child.comparison,
          forecast: null,
          is_revenue: child.isRevenue,
        }))
      );

      if (accounts.length === 0) return [];

      const { data, error } = await supabase.functions.invoke('financial-account-suggestions', {
        body: { company_id: companyId, period_hash: periodHash, accounts },
      });

      if (error) {
        console.error('account suggestions error', error);
        return [];
      }
      return (data?.suggestions || []) as AccountSuggestion[];
    },
  });
}
