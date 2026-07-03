/**
 * useFollowUpExplanations — fetches AI rationale (summary + per-driver root cause)
 * via the `follow-up-explain` edge function. Cached client-side per
 * (companyId, year, mode, monthIdx, driverHash) to avoid duplicate calls.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VarianceDriver, FollowUpMode } from "@/lib/follow-up/varianceEngine";
import { hashDrivers } from "@/lib/follow-up/varianceEngine";
import type { PerformanceStatus } from "@/lib/follow-up/statusEngine";

export interface ExplanationOutput {
  summary: string;
  perDriverRootCause: Record<string, string>;
}

interface Args {
  companyId: string | null;
  fiscalYear: number;
  mode: FollowUpMode;
  monthIndex?: number;
  status: PerformanceStatus;
  topDrivers: VarianceDriver[];
  enabled?: boolean;
}

const cache = new Map<string, ExplanationOutput>();

export function useFollowUpExplanations(args: Args) {
  const { companyId, fiscalYear, mode, monthIndex, status, topDrivers, enabled = true } = args;
  const [data, setData] = useState<ExplanationOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key =
    companyId && topDrivers.length > 0
      ? `${companyId}|${fiscalYear}|${mode}|${monthIndex ?? -1}|${status}|${hashDrivers(topDrivers)}`
      : null;

  useEffect(() => {
    if (!enabled || !key || !companyId || topDrivers.length === 0) {
      setData(null);
      return;
    }
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: resp, error: fnErr } = await supabase.functions.invoke("follow-up-explain", {
          body: {
            mode,
            monthIndex,
            status,
            topDrivers: topDrivers.map((d) => ({
              account_number: d.account_number,
              account_name: d.account_name,
              kind: d.kind,
              actual: d.actual,
              budget: d.budget,
              variance: d.variance,
              variancePct: d.variancePct,
              ebitImpact: d.ebitImpact,
              direction: d.direction,
            })),
          },
        });
        if (cancelled) return;
        if (fnErr) {
          setError(fnErr.message);
          setLoading(false);
          return;
        }
        const out: ExplanationOutput = {
          summary: resp?.summary ?? "",
          perDriverRootCause: resp?.perDriverRootCause ?? {},
        };
        cache.set(key, out);
        setData(out);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "AI-fel");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, enabled, companyId, mode, monthIndex, status]);

  return { data, loading, error };
}
