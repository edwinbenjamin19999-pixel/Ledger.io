import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SimulationKind =
  | "price_increase" | "hire" | "cost_cut" | "new_loan" | "capex" | "collect_ar";

export interface SimulationResult {
  scenario: SimulationKind;
  params: Record<string, unknown>;
  balanced: boolean;
  profitImpact: { kr: number; pct: number };
  liquidityImpact: { kr: number; runwayDaysBefore: number; runwayDaysAfter: number; runwayDelta: number };
  balanceSheetDelta: { assets: number; liabilities: number; equity: number };
  marginChange: { before: number; after: number; deltaPp: number };
  risk: "low" | "medium" | "high";
  ledgerPreview: Array<{ account: string; label: string; debit: number; credit: number; period: string }>;
}

export function useWhatIfSimulation(companyId?: string | null) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (scenario: SimulationKind, params: Record<string, unknown>) => {
    if (!companyId) return null;
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-cfo-scenario", {
        body: { company_id: companyId, scenario, params },
      });
      if (error) throw error;
      setResult(data as SimulationResult);
      return data as SimulationResult;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const reset = useCallback(() => { setResult(null); setError(null); }, []);
  return { result, loading, error, run, reset };
}
