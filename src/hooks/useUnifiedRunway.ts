import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeUnifiedRunway, type UnifiedRunway } from "@/lib/cash/getRunway";

/**
 * React-hook över den kanoniska runway-beräkningen. Lyssnar på
 * journal_entry_lines för live-uppdatering.
 */
export function useUnifiedRunway(companyId?: string | null) {
  const [data, setData] = useState<UnifiedRunway | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!companyId) { setData(null); setLoading(false); return; }
    setLoading(true);
    try {
      const r = await computeUnifiedRunway(companyId);
      setData(r);
    } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`unified-runway-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entry_lines" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, refresh]);

  return { data, loading, refresh };
}
