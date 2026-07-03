import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the annual_reports.id for a given company + fiscal year.
 * Creates a draft row if it does not exist yet.
 */
export function useAnnualReportId(companyId: string | null, year: number, framework: "K2" | "K3") {
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) { setId(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: existing } = await supabase
        .from("annual_reports")
        .select("id")
        .eq("company_id", companyId)
        .eq("fiscal_year", year)
        .maybeSingle();

      if (cancelled) return;

      if (existing?.id) {
        setId(existing.id);
        setLoading(false);
        return;
      }

      const { data: created, error } = await supabase
        .from("annual_reports")
        .insert([{
          company_id: companyId,
          fiscal_year: year,
          fiscal_year_start: `${year}-01-01`,
          fiscal_year_end: `${year}-12-31`,
          report_type: framework.toLowerCase(),
          status: "draft",
        }])
        .select("id")
        .single();

      if (!cancelled) {
        if (error) console.error("Failed to create annual_report:", error.message);
        setId(created?.id ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, year, framework]);

  return { annualReportId: id, loading };
}
