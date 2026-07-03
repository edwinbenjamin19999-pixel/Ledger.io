import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeUnifiedRunway } from "@/lib/cash/getRunway";
import { getNetResult } from "@/lib/finance/getNetResult";

export interface LiveCFOKPIs {
  net_result: number;
  cash_position: number;
  runway_days: number | null;
  ebit_margin_pct: number | null;
  loaded: boolean;
}

const EMPTY: LiveCFOKPIs = {
  net_result: 0, cash_position: 0, runway_days: null, ebit_margin_pct: null, loaded: false,
};

export function useLiveCFOKPIs(companyId?: string | null) {
  const [kpis, setKpis] = useState<LiveCFOKPIs>(EMPTY);

  const refresh = useCallback(async () => {
    if (!companyId) return;

    // Kanonisk källa för årets resultat — samma härledning som Resultat & balans
    // och Kassaflödesanalys. Konto 8999 exkluderas alltid för att undvika
    // dubbelräkning av årsbokslutsförandet.
    const nr = await getNetResult(companyId);

    if (nr.status === "no_data") { setKpis({ ...EMPTY, loaded: true }); return; }

    // Kanonisk runway + kassa (samma källa som dashboard, Cash Command, Likviditet-live).
    const unified = await computeUnifiedRunway(companyId);
    const cash = unified.liquidCash;

    const safeRevenue = Math.max(0, nr.revenue);
    const net = nr.netResult;
    // Margin requires meaningful revenue (≥ 1 000 kr) to avoid 96 % på 0-bolag.
    const margin = safeRevenue >= 1000 ? (net / safeRevenue) * 100 : null;

    setKpis({
      net_result: net,
      cash_position: cash,
      runway_days: unified.runwayDays,
      ebit_margin_pct: margin,
      loaded: true,
    });
  }, [companyId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`live-cfo-kpis-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entry_lines" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, refresh]);

  return kpis;
}
