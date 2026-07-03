import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export type VATStage =
  | "draft"
  | "review"
  | "awaiting_client"
  | "ready"
  | "submitted"
  | "settled"
  | "missing_data";

export interface FirmVATRow {
  id: string;
  company_id: string;
  client_name: string;
  period_label: string;
  period_start: string;
  period_end: string;
  period_type: string;
  status: string;
  stage: VATStage;
  net_amount: number;
  due_date: string | null;
  days_to_due: number | null;
  submitted_at: string | null;
  risk: "low" | "medium" | "high";
  risk_reason: string | null;
  updated_at: string;
}

const STATUS_TO_STAGE: Record<string, VATStage> = {
  draft: "draft",
  review: "review",
  in_review: "review",
  awaiting_client: "awaiting_client",
  pending_approval: "awaiting_client",
  ready: "ready",
  approved: "ready",
  submitted: "submitted",
  settled: "settled",
  paid: "settled",
};

/** Compute Skatteverket VAT due date — 26 days after period end (typical monthly). */
function computeDueDate(periodEnd: string): string | null {
  if (!periodEnd) return null;
  const d = new Date(periodEnd);
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + 26);
  return d.toISOString().slice(0, 10);
}

function extractNet(ruta: unknown): number {
  if (!ruta || typeof ruta !== "object") return 0;
  const r = ruta as Record<string, unknown>;
  for (const k of ["49", "ruta_49", "net", "net_amount", "to_pay"]) {
    const v = r[k];
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}

/**
 * Cross-client VAT orchestration ledger. Reuses `vat_periods` for all firm
 * clients and adds risk + deadline urgency, mirroring useFirmTax.
 */
export function useFirmVAT() {
  const { firmId, clients } = useAdvisorContext();

  return useQuery({
    queryKey: ["firm-vat", firmId, clients.map((c) => c.id)],
    enabled: !!firmId && clients.length > 0,
    queryFn: async (): Promise<FirmVATRow[]> => {
      const ids = clients.map((c) => c.id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("vat_periods")
        .select(
          "id, company_id, period_start, period_end, period_type, status, ruta_values, submitted_at, updated_at",
        )
        .in("company_id", ids)
        .order("period_end", { ascending: false })
        .limit(800);

      if (error) throw error;

      const nameMap = new Map(clients.map((c) => [c.id, c.name]));
      const today = Date.now();

      return (data ?? []).map((r): FirmVATRow => {
        const status = String(r.status ?? "draft");
        let stage: VATStage = STATUS_TO_STAGE[status] ?? "draft";
        if (r.submitted_at && stage !== "settled") stage = "submitted";

        const due = computeDueDate(r.period_end);
        const daysToDue = due ? Math.floor((new Date(due).getTime() - today) / 86400000) : null;
        const net = extractNet(r.ruta_values);

        if (stage === "draft" && net === 0) {
          const ageDays = (today - new Date(r.updated_at ?? r.period_end).getTime()) / 86400000;
          if (ageDays > 30) stage = "missing_data";
        }

        let risk: FirmVATRow["risk"] = "low";
        let reason: string | null = null;
        if (stage === "missing_data") {
          risk = "high";
          reason = "Saknar underlag — gammal period utan belopp.";
        } else if (
          daysToDue !== null &&
          daysToDue < 0 &&
          stage !== "submitted" &&
          stage !== "settled"
        ) {
          risk = "high";
          reason = `Försenad inlämning (${Math.abs(daysToDue)}d).`;
        } else if (
          daysToDue !== null &&
          daysToDue >= 0 &&
          daysToDue < 7 &&
          stage !== "submitted" &&
          stage !== "settled"
        ) {
          risk = "medium";
          reason = `Akut deadline om ${daysToDue}d.`;
        }

        return {
          id: r.id,
          company_id: r.company_id,
          client_name: nameMap.get(r.company_id) ?? "Okänd klient",
          period_label: `${r.period_start} → ${r.period_end}`,
          period_start: r.period_start,
          period_end: r.period_end,
          period_type: r.period_type,
          status,
          stage,
          net_amount: net,
          due_date: due,
          days_to_due: daysToDue,
          submitted_at: r.submitted_at,
          risk,
          risk_reason: reason,
          updated_at: r.updated_at ?? r.period_end,
        };
      });
    },
  });
}
