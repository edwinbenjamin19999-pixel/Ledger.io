/**
 * Persists validation findings from `runValidationEngine` into the
 * `validation_results` table. Idempotent via UPSERT on
 * (company_id, period_id, validation_type, row_id).
 *
 * In Phase 3 this is a thin wrapper invoked optionally by callers — Phase 4
 * will call it from the materializer edge function.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ValidationReport } from "./validationEngine";

export interface PersistValidationInput {
  companyId: string;
  periodId: string | null;
  report: ValidationReport;
}

export async function persistValidationFindings(input: PersistValidationInput): Promise<void> {
  const { companyId, periodId, report } = input;
  if (!report.findings.length) return;

  const rows = report.findings.map((f) => ({
    company_id: companyId,
    period_id: periodId,
    validation_type: f.code,
    severity: f.severity,
    row_id: null as string | null,
    title: f.title,
    message: f.message,
    affected_accounts: f.affectedAccounts,
    impact: f.impact ?? null,
    suggested_fix: f.suggestedFix ?? null,
  }));

  // Cast to any: validation_results table is typed-but-Phase-1; insert shape is stable.
  const { error } = await (supabase.from("validation_results") as any).upsert(rows, {
    onConflict: "company_id,period_id,validation_type,row_id",
  });
  if (error) throw error;
}
