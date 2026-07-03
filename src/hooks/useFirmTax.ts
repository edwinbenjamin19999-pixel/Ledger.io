import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export type TaxStage =
  | "draft"
  | "review"
  | "awaiting_client"
  | "ready"
  | "submitted"
  | "settled"
  | "missing_data";

export type TaxRisk = "low" | "medium" | "high";

export interface FirmTaxRow {
  id: string;
  company_id: string;
  client_name: string;
  declaration_type: string; // e.g. INK2, INK4, prelim_tax
  tax_year: number;
  period: string | null;
  status: string;
  stage: TaxStage;
  ai_confidence_score: number | null;
  amount: number; // total tax (or estimated) — derived from data jsonb
  prior_amount: number | null; // previous period for delta
  delta_pct: number | null;
  submitted_at: string | null;
  due_date: string | null;
  days_to_due: number | null;
  risk: TaxRisk;
  risk_reason: string | null;
  updated_at: string;
}

/**
 * Compute Skatteverket-style preliminary INK2 / annual income tax due dates.
 * Annual INK2 deadline ≈ 6 months after fiscal year end. For preliminary monthly
 * tax we approximate the 12th of the following month. Falls back to null.
 */
function computeDueDate(declarationType: string, taxYear: number, period: string | null): string | null {
  const t = declarationType.toLowerCase();
  if (t.includes("prelim") && period) {
    // period could be "YYYY-MM"
    const m = /^(\d{4})-(\d{1,2})/.exec(period);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const next = new Date(Date.UTC(y, mo, 12)); // 12th of NEXT month
      return next.toISOString().slice(0, 10);
    }
  }
  if (t.includes("ink") || t.includes("annual") || t.includes("årsskatt")) {
    // 6 months after FY end (assume calendar year if unknown)
    return `${taxYear + 1}-07-01`;
  }
  return null;
}

function extractAmount(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const d = data as Record<string, unknown>;
  const candidates = ["tax_to_pay", "total_tax", "calculated_tax", "amount", "preliminary_tax", "ink2"];
  for (const k of candidates) {
    const v = d[k];
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}

/**
 * Cross-client tax orchestration ledger. Reads `tax_declarations` for all
 * firm client companies, normalizes status into a workflow stage and adds
 * AI risk flags (deviation vs prior, missing basis, deadline urgency).
 */
export function useFirmTax() {
  const { firmId, clients } = useAdvisorContext();

  return useQuery({
    queryKey: ["firm-tax", firmId, clients.map((c) => c.id)],
    enabled: !!firmId && clients.length > 0,
    queryFn: async (): Promise<FirmTaxRow[]> => {
      const companyIds = clients.map((c) => c.id);
      if (companyIds.length === 0) return [];

      const { data, error } = await supabase
        .from("tax_declarations")
        .select(
          "id, company_id, declaration_type, tax_year, period, status, ai_confidence_score, data, submitted_at, updated_at",
        )
        .in("company_id", companyIds)
        .order("tax_year", { ascending: false })
        .limit(800);

      if (error) throw error;

      const nameMap = new Map(clients.map((c) => [c.id, c.name]));
      const today = Date.now();
      const rows = (data ?? []).map((r) => {
        const status = String(r.status ?? "");
        const amount = extractAmount(r.data);
        const due = computeDueDate(r.declaration_type, r.tax_year, r.period);
        const daysToDue = due
          ? Math.floor((new Date(due).getTime() - today) / 86400000)
          : null;

        // Map raw status → workflow stage
        let stage: TaxStage = "draft";
        if (status === "submitted" || r.submitted_at) stage = "submitted";
        else if (status === "settled" || status === "paid") stage = "settled";
        else if (status === "ready" || status === "approved") stage = "ready";
        else if (status === "awaiting_client" || status === "pending_approval") stage = "awaiting_client";
        else if (status === "review" || status === "in_review") stage = "review";
        else if (status === "draft") stage = "draft";

        // Missing data heuristic: very stale draft with 0 SEK
        if (stage === "draft" && amount === 0) {
          const ageDays = (today - new Date(r.updated_at).getTime()) / 86400000;
          if (ageDays > 30) stage = "missing_data";
        }

        return {
          id: r.id,
          company_id: r.company_id,
          client_name: nameMap.get(r.company_id) ?? "Okänd klient",
          declaration_type: r.declaration_type,
          tax_year: r.tax_year,
          period: r.period,
          status,
          stage,
          ai_confidence_score: r.ai_confidence_score,
          amount,
          prior_amount: null as number | null,
          delta_pct: null as number | null,
          submitted_at: r.submitted_at,
          due_date: due,
          days_to_due: daysToDue,
          risk: "low" as TaxRisk,
          risk_reason: null as string | null,
          updated_at: r.updated_at,
        };
      });

      // Pair with prior year for the same company + declaration_type to detect deviations
      const byKey = new Map<string, FirmTaxRow[]>();
      for (const r of rows) {
        const k = `${r.company_id}:${r.declaration_type}`;
        const list = byKey.get(k) ?? [];
        list.push(r);
        byKey.set(k, list);
      }
      for (const list of byKey.values()) {
        list.sort((a, b) => b.tax_year - a.tax_year);
        for (let i = 0; i < list.length - 1; i++) {
          const cur = list[i];
          const prev = list[i + 1];
          if (prev.amount > 0) {
            cur.prior_amount = prev.amount;
            cur.delta_pct = ((cur.amount - prev.amount) / Math.abs(prev.amount)) * 100;
          }
        }
      }

      // Final risk pass
      for (const r of rows) {
        let risk: TaxRisk = "low";
        let reason: string | null = null;

        if (r.stage === "missing_data") {
          risk = "high";
          reason = "Saknar underlag — gammalt utkast utan belopp.";
        } else if (r.delta_pct !== null && Math.abs(r.delta_pct) > 40 && r.amount > 0) {
          risk = "high";
          reason = `Avvikelse ${r.delta_pct.toFixed(0)}% mot föregående år.`;
        } else if (r.days_to_due !== null && r.days_to_due < 0 && r.stage !== "submitted" && r.stage !== "settled") {
          risk = "high";
          reason = `Försenad deadline (${Math.abs(r.days_to_due)}d).`;
        } else if (r.days_to_due !== null && r.days_to_due >= 0 && r.days_to_due < 7 && r.stage !== "submitted" && r.stage !== "settled") {
          risk = "medium";
          reason = `Akut deadline om ${r.days_to_due}d.`;
        } else if ((r.ai_confidence_score ?? 1) < 0.6 && r.stage === "draft") {
          risk = "medium";
          reason = "Låg AI-konfidens — kräver granskning.";
        }
        r.risk = risk;
        r.risk_reason = reason;
      }

      return rows;
    },
  });
}
