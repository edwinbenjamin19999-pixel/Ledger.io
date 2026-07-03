import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

/**
 * Live count of error_logs that need admin attention
 * (status: pending, analyzing, manual or failed). Only fetches for platform admins.
 */
export function useUnresolvedErrorCount() {
  const { isPlatformAdmin } = usePlatformAdmin();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isPlatformAdmin) {
      setCount(0);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { count: c } = await supabase
        .from("error_logs")
        .select("id", { count: "exact", head: true })
        .in("fix_status", ["pending", "analyzing", "manual", "failed"]);
      if (!cancelled) setCount(c || 0);
    };

    load();

    const channel = supabase
      .channel("error-logs-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "error_logs" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isPlatformAdmin]);

  return count;
}
