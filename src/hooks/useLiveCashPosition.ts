import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeUnifiedRunway } from "@/lib/cash/getRunway";

export interface CashPositionAccount {
  id: string;
  bank_name: string;
  balance: number;
  last_synced_at: string | null;
  freshness_seconds: number | null;
  connection_status: "live" | "stale" | "manual";
}

export interface LiveCashPosition {
  currentBalance: number;
  expectedInflows30d: number;
  committedOutflows30d: number;
  netCashFlow30d: number;
  runwayDays: number | null;
  burnRateMonthly: number;
  accounts: CashPositionAccount[];
  dataFreshness: {
    oldest_sync_seconds: number | null;
    newest_sync_seconds: number | null;
    has_stale_data: boolean;
  };
  computed_at: string;
}

/**
 * Live cash position — auto-refetches every 60s and exposes manual refresh.
 * Combine with useRealtimeCashUpdates(companyId, refresh) for instant updates.
 */
export function useLiveCashPosition(companyId?: string | null) {
  const [data, setData] = useState<LiveCashPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        "compute-cash-position",
        { body: { company_id: companyId, horizon_days: 30 } },
      );
      if (invokeError) throw invokeError;
      const payload = result as LiveCashPosition;
      // Kanonisk runway + likvid kassa — override edge-svaret så att Cash Command,
      // Likviditet-live, Bankintegration och AI CFO alltid visar samma siffror.
      const unified = await computeUnifiedRunway(companyId);
      if (unified.liquidCash !== 0) payload.currentBalance = unified.liquidCash;
      payload.runwayDays = unified.runwayDays;
      if (unified.avgMonthlyBurn > 0) payload.burnRateMonthly = unified.avgMonthlyBurn;
      setData(payload);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [companyId, refresh]);

  return { data, loading, error, refresh };
}
