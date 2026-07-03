import { useEffect, useState } from "react";
import {
  buildCashflowStatement,
  type CashflowStatementResult,
} from "@/lib/cashflow/buildCashflowStatement";
import { buildCashflowIndirect } from "@/lib/cashflow/buildCashflowIndirect";

export type CashflowPeriodMode = "month" | "quarter" | "year";
export type CashflowMethod = "direct" | "indirect";

export interface UseCashflowStatementOptions {
  companyId: string | null;
  companyName: string;
  mode: CashflowPeriodMode;
  /** Anchor date (defaults to today). The selected period is computed from this. */
  anchorDate?: Date;
  /** Computation method — defaults to "indirect" (Swedish K2/K3 standard). */
  method?: CashflowMethod;
}

export function periodRangeFor(mode: CashflowPeriodMode, anchor: Date): { from: Date; to: Date } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  if (mode === "month") {
    return {
      from: new Date(y, m, 1),
      to: new Date(y, m + 1, 0),
    };
  }
  if (mode === "quarter") {
    const q = Math.floor(m / 3);
    return {
      from: new Date(y, q * 3, 1),
      to: new Date(y, q * 3 + 3, 0),
    };
  }
  return {
    from: new Date(y, 0, 1),
    to: new Date(y, 11, 31),
  };
}

export function useCashflowStatement({
  companyId,
  companyName,
  mode,
  anchorDate,
  method = "indirect",
}: UseCashflowStatementOptions) {
  const [data, setData] = useState<CashflowStatementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setData(null);
      return;
    }
    const anchor = anchorDate ?? new Date();
    const { from, to } = periodRangeFor(mode, anchor);
    setLoading(true);
    setError(null);
    const builder = method === "indirect" ? buildCashflowIndirect : buildCashflowStatement;
    builder({
      companyId,
      companyName,
      fromDate: from,
      toDate: to,
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        console.error("[useCashflowStatement]", e);
        if (!cancelled) setError(e?.message || "Kunde inte ladda kassaflöde");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, companyName, mode, method, anchorDate?.getTime()]);

  return { data, loading, error };
}
