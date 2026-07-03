import { supabase } from "@/integrations/supabase/client";
import { getLiquidCash } from "./getLiquidCash";

export interface UnifiedRunway {
  /** UB på likvida medel (BAS 1910–1930), samma källa som Kassaflödesanalysen. */
  liquidCash: number;
  /** Genomsnittlig månadskostnad (BAS 4–7) över senaste 12 mån (posted/approved). */
  avgMonthlyBurn: number;
  /** avgMonthlyBurn / 30 — dagsutbetalning. */
  avgDailyBurn: number;
  /** Kanonisk runway i dagar. null = burn ej meningsfull. 0 = ingen kassa. */
  runwayDays: number | null;
  /** Runway i månader (avrundad), null när dagsantalet är null. */
  runwayMonths: number | null;
}

/**
 * Single source of truth för runway-beräkningen.
 *
 *   runway_days = aktuell likvid kassa / genomsnittlig daglig burn rate
 *
 * Alla moduler (Likviditet-live, Cash Command, dashboardens runway-widget,
 * AI CFO, Bankintegration) MÅSTE läsa runway härifrån. Inga lokala
 * burn/runway-beräkningar tillåts — de driver isär siffrorna.
 */
export async function computeUnifiedRunway(companyId: string): Promise<UnifiedRunway> {
  const empty: UnifiedRunway = {
    liquidCash: 0, avgMonthlyBurn: 0, avgDailyBurn: 0, runwayDays: null, runwayMonths: null,
  };
  if (!companyId) return empty;

  const [liquidCash, accountsRes] = await Promise.all([
    getLiquidCash(companyId),
    supabase
      .from("chart_of_accounts")
      .select("id, account_number")
      .eq("company_id", companyId)
      .gte("account_number", "4000")
      .lte("account_number", "7999"),
  ]);

  const costAccountIds = (accountsRes.data ?? []).map((a) => a.id);
  if (costAccountIds.length === 0) {
    return { ...empty, liquidCash };
  }

  // 12 senaste månadernas kostnader. Endast slutgiltiga verifikationer räknas.
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: costLines } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, journal_entries!inner(company_id, status, entry_date)")
    .eq("journal_entries.company_id", companyId)
    .in("journal_entries.status", ["approved", "posted"])
    .gte("journal_entries.entry_date", sinceIso)
    .in("account_id", costAccountIds);

  const totalBurn = (costLines ?? []).reduce(
    (s, l) => s + Number(l.debit ?? 0) - Number(l.credit ?? 0),
    0,
  );

  const avgMonthlyBurn = Math.max(0, totalBurn / 12);
  const avgDailyBurn = avgMonthlyBurn / 30;

  let runwayDays: number | null;
  if (liquidCash <= 0) runwayDays = 0;
  else if (avgDailyBurn <= 0) runwayDays = null;
  else runwayDays = Math.min(9999, Math.round(liquidCash / avgDailyBurn));

  return {
    liquidCash,
    avgMonthlyBurn,
    avgDailyBurn,
    runwayDays,
    runwayMonths: runwayDays === null ? null : Math.round(runwayDays / 30),
  };
}
