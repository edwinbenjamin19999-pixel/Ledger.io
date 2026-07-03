import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export type AGIStage = "draft" | "ready" | "submitted" | "settled" | "missing_data";

export interface FirmAGIRow {
  id: string;
  company_id: string;
  client_name: string;
  period_year: number;
  period_month: number;
  period_label: string;
  status: string;
  stage: AGIStage;
  due_date: string | null;
  days_to_due: number | null;
  risk: "low" | "medium" | "high";
  risk_reason: string | null;
  updated_at: string;
}

const STATUS_TO_STAGE: Record<string, AGIStage> = {
  draft: "draft",
  ready: "ready",
  approved: "ready",
  submitted: "submitted",
  settled: "settled",
  paid: "settled",
};

/** AGI deadline — typically 12th of the month following the wage period. */
function computeDueDate(year: number, month: number): string {
  // month is 1-12 → next month, 12th
  const d = new Date(Date.UTC(year, month, 12));
  return d.toISOString().slice(0, 10);
}

/**
 * Cross-client AGI / payroll-tax orchestration ledger across all firm clients.
 */
export function useFirmAGI() {
  const { firmId, clients } = useAdvisorContext();

  return useQuery({
    queryKey: ["firm-agi", firmId, clients.map((c) => c.id)],
    enabled: !!firmId && clients.length > 0,
    queryFn: async (): Promise<FirmAGIRow[]> => {
      const ids = clients.map((c) => c.id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("agi_periods")
        .select(
          "id, company_id, period_year, period_month, period_type, status, updated_at",
        )
        .in("company_id", ids)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(800);

      if (error) throw error;

      const nameMap = new Map(clients.map((c) => [c.id, c.name]));
      const today = Date.now();

      return (data ?? []).map((r): FirmAGIRow => {
        const status = String(r.status ?? "draft");
        let stage: AGIStage = STATUS_TO_STAGE[status] ?? "draft";
        const due = computeDueDate(r.period_year, r.period_month);
        const daysToDue = Math.floor((new Date(due).getTime() - today) / 86400000);

        if (stage === "draft" && daysToDue < -7) stage = "missing_data";

        let risk: FirmAGIRow["risk"] = "low";
        let reason: string | null = null;
        if (stage === "missing_data") {
          risk = "high";
          reason = "Inte inlämnad — försenat AGI-utkast.";
        } else if (daysToDue < 0 && stage !== "submitted" && stage !== "settled") {
          risk = "high";
          reason = `Försenad AGI (${Math.abs(daysToDue)}d).`;
        } else if (daysToDue >= 0 && daysToDue < 5 && stage !== "submitted" && stage !== "settled") {
          risk = "medium";
          reason = `Akut deadline om ${daysToDue}d.`;
        }

        return {
          id: r.id,
          company_id: r.company_id,
          client_name: nameMap.get(r.company_id) ?? "Okänd klient",
          period_year: r.period_year,
          period_month: r.period_month,
          period_label: `${r.period_year}-${String(r.period_month).padStart(2, "0")}`,
          status,
          stage,
          due_date: due,
          days_to_due: daysToDue,
          risk,
          risk_reason: reason,
          updated_at: r.updated_at,
        };
      });
    },
  });
}
