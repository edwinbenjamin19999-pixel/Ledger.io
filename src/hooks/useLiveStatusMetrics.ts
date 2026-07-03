import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LiveMetrics {
  events: number | null;
  companies: number | null;
  loading: boolean;
}

/**
 * Live platform metrics for the public Product Evolution page.
 * Falls back gracefully (null values) if RLS blocks the count.
 */
export function useLiveStatusMetrics(): LiveMetrics {
  const [state, setState] = useState<LiveMetrics>({
    events: null,
    companies: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchMetrics = async () => {
      try {
        const [eventsRes, companiesRes] = await Promise.all([
          supabase.from("journal_entries").select("*", { count: "exact", head: true }),
          supabase.from("companies").select("*", { count: "exact", head: true }),
        ]);

        if (cancelled) return;

        setState({
          events: eventsRes.count ?? null,
          companies: companiesRes.count ?? null,
          loading: false,
        });
      } catch {
        if (cancelled) return;
        setState({ events: null, companies: null, loading: false });
      }
    };

    fetchMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
