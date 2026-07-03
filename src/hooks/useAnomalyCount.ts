import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight pending-anomaly count for dashboard badges.
 * Counts likely-duplicate transactions in the last 30 days
 * minus already resolved anomalies. Cheap query, no full detection scan.
 */
export function useAnomalyCount(companyId: string | null | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const [{ data: entries }, { data: resolutions }] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id, description, entry_date, journal_entry_lines(debit)")
          .eq("company_id", companyId)
          .gte("entry_date", since)
          .limit(300),
        supabase
          .from("anomaly_resolutions")
          .select("anomaly_key")
          .eq("company_id", companyId),
      ]);

      const resolved = new Set((resolutions || []).map((r: any) => r.anomaly_key));
      const seen = new Map<string, string>();
      let dupes = 0;
      let highAmounts = 0;
      const amounts: number[] = [];

      for (const e of entries || []) {
        const desc = (e.description || "").toLowerCase().trim().slice(0, 25);
        const lines = (e as any).journal_entry_lines || [];
        const total = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
        if (!desc || total <= 0) continue;
        const key = `${total}-${desc}`;
        if (seen.has(key)) {
          const id = `dup-${seen.get(key)}-${e.id}`;
          if (!resolved.has(id)) dupes++;
        } else {
          seen.set(key, e.id);
        }
        if (total >= 10000 && total % 1000 === 0) {
          if (!resolved.has(`round-unknown-${e.id}`)) highAmounts++;
        }
        amounts.push(total);
      }

      if (active) setCount(dupes + highAmounts);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  return count;
}
