import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import {
  fetchAllBureauClientSummaries,
  type BureauClientSummary,
} from "@/services/bureauClientSync";

export type BureauSyncStatus = "live" | "reconnecting" | "offline";

export interface BureauSyncState {
  summaries: BureauClientSummary[];
  isLoading: boolean;
  status: BureauSyncStatus;
  lastUpdated: Date | null;
}

const toFallbackSummary = (client: ReturnType<typeof useAdvisorContext>["clients"][number]): BureauClientSummary => ({
  company_id: client.id,
  company_name: client.name,
  org_number: client.org_number,
  current_month_revenue: 0,
  current_month_costs: 0,
  current_month_result: 0,
  cash_balance: 0,
  gross_margin_pct: 0,
  accounts_receivable_amount: 0,
  accounts_payable_amount: 0,
  dso_days: 0,
  output_vat: 0,
  input_vat: 0,
  vat_next_deadline: null,
  vat_amount_due: 0,
  overdue_customer_invoices_count: client.overdueInvoices,
  overdue_customer_invoices_amount: 0,
  overdue_supplier_invoices_count: 0,
  overdue_supplier_invoices_amount: 0,
  missing_receipts_count: client.pendingExpenses,
  unreconciled_transactions: client.draftEntries,
  last_bookkeeping_date: null,
  annual_revenue_12m: 0,
  pending_payroll_approval: 0,
  next_agi_deadline: null,
  active_employees: 0,
  assigned_accountant_id: null,
  client_status: client.urgency === "high" || client.urgency === "medium" ? "watch" : "active",
  monthly_fee: 0,
  time_spent_this_month: 0,
  last_bureau_action: null,
  next_deliverable: null,
});

/**
 * Aggregated bureau-wide client summaries + live realtime sync status.
 *
 * Subscribes to invoices, journal_entries, vat_declarations and bank_transactions
 * across all bureau client companies; whenever one changes we invalidate the
 * summary query so KPI cards / panels reflect the new state immediately.
 */
export function useBureauSync(): BureauSyncState {
  const { firmId, clients, isLoading: ctxLoading } = useAdvisorContext();
  const qc = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const companyIds = clients.map((c) => c.id);
  const queryKey = ["bureau-summaries", firmId, [...companyIds].sort().join(",")];

  const { data, isLoading, isFetching, isError, isSuccess, failureCount } = useQuery({
    queryKey,
    enabled: !!firmId && companyIds.length > 0,
    staleTime: 60_000,
    retry: 3,
    refetchInterval: 15 * 60_000, // 15min TTL fallback
    queryFn: async () => {
      const rows = await fetchAllBureauClientSummaries(
        firmId!,
        clients.map((c) => ({ id: c.id, name: c.name, org_number: c.org_number })),
      );
      setLastUpdated(new Date());
      return rows;
    },
  });

  useEffect(() => {
    if (!firmId || companyIds.length === 0) return;

    const tables = ["invoices", "journal_entries", "vat_declarations", "bank_transactions"];

    const channel = supabase.channel(`bureau-sync-${firmId}-${companyIds.join("-")}`);
    tables.forEach((table) =>
      companyIds.forEach((companyId) => {
        channel.on(
          "postgres_changes" as never,
          { event: "*", schema: "public", table, filter: `company_id=eq.${companyId}` } as never,
          () => {
            qc.invalidateQueries({ queryKey: ["bureau-summaries", firmId] });
            setLastUpdated(new Date());
          },
        );
      }),
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [firmId, companyIds.join(","), qc]);

  const syncStatus: BureauSyncStatus =
    isError && failureCount >= 3
      ? "offline"
      : ctxLoading || (isFetching && !isSuccess)
        ? "reconnecting"
        : "live";

  return {
    summaries: data ?? clients.map(toFallbackSummary),
    isLoading: ctxLoading || isLoading,
    status: syncStatus,
    lastUpdated,
  };
}
