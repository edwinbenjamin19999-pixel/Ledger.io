import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RecalcStatus = "idle" | "processing" | "ready" | "error";

interface RecalcResult {
  data: any;
  cached: boolean;
  calculated_at: string;
  data_version: number;
}

export function useRecalculationStatus() {
  const [status, setStatus] = useState<RecalcStatus>("idle");
  const [lastResult, setLastResult] = useState<RecalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const recalculate = useCallback(
    async (companyId: string, type: "pnl" | "bs" | "cf", scenario: string, year: number) => {
      // Abort previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("processing");
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "calculate-financials",
          {
            body: { company_id: companyId, type, scenario, year },
          }
        );

        if (controller.signal.aborted) return null;

        if (fnError) throw fnError;

        setLastResult(data);
        setStatus("ready");
        return data;
      } catch (err: any) {
        if (controller.signal.aborted) return null;
        const msg = err?.message || "Beräkningsfel";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setLastResult(null);
    setError(null);
  }, []);

  return { status, lastResult, error, recalculate, reset };
}
