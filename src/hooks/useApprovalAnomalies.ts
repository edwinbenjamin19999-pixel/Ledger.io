import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FirmApprovalItem } from "./useFirmApprovalQueue";

export interface ApprovalAnomaly {
  requestId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  delta?: number;
}

/**
 * Lightweight anomaly heuristic for pending approvals: compares the current
 * VAT/payroll/journal request amount metadata against the prior period for the
 * same company + entity_type. Pure client-side comparison — no extra RPC.
 */
export function useApprovalAnomalies(items: FirmApprovalItem[]) {
  const companyIds = useMemo(
    () => Array.from(new Set(items.map((i) => i.company_id))),
    [items],
  );

  const { data: priorByCompany = {} } = useQuery({
    queryKey: ["approval-priors", companyIds.sort().join(",")],
    enabled: companyIds.length > 0,
    queryFn: async (): Promise<Record<string, Array<{ entity_type: string; metadata: Record<string, unknown> }>>> => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("company_id, entity_type, metadata, completed_at")
        .in("company_id", companyIds)
        .in("status", ["approved", "signed"])
        .order("completed_at", { ascending: false })
        .limit(200);
      if (error) return {};
      const map: Record<string, Array<{ entity_type: string; metadata: Record<string, unknown> }>> = {};
      for (const row of data ?? []) {
        const list = (map[row.company_id] ??= []);
        list.push({ entity_type: row.entity_type, metadata: (row.metadata as Record<string, unknown>) ?? {} });
      }
      return map;
    },
  });

  return useMemo<ApprovalAnomaly[]>(() => {
    const out: ApprovalAnomaly[] = [];
    for (const item of items) {
      const amount = pickAmount(item.metadata);
      if (amount == null) continue;
      const priors = priorByCompany[item.company_id] ?? [];
      const prior = priors.find((p) => p.entity_type === item.entity_type);
      if (!prior) continue;
      const priorAmount = pickAmount(prior.metadata);
      if (priorAmount == null || priorAmount === 0) continue;
      const delta = (amount - priorAmount) / Math.abs(priorAmount);
      const absPct = Math.abs(delta) * 100;
      if (absPct >= 50) {
        out.push({
          requestId: item.id,
          severity: absPct >= 100 ? "critical" : "warning",
          title: `${item.company_name}: ovanligt belopp`,
          detail: `${formatPct(delta)} mot föregående period (${formatSEK(amount)} vs ${formatSEK(priorAmount)})`,
          delta,
        });
      }
    }
    return out;
  }, [items, priorByCompany]);
}

function pickAmount(meta: Record<string, unknown> | null | undefined): number | null {
  if (!meta) return null;
  const candidates = ["amount", "vat_to_pay", "total", "gross_amount", "net_amount"];
  for (const key of candidates) {
    const v = meta[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function formatSEK(n: number): string {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
}
function formatPct(d: number): string {
  const sign = d >= 0 ? "+" : "";
  return `${sign}${(d * 100).toFixed(0)}%`;
}
