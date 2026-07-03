/**
 * DB-schema types for the unified report engine (Phase 3).
 * Mirrors the 12 tables seeded in Phase 2 — derived from the auto-generated
 * Supabase Database type so they stay in sync automatically.
 */
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type ReportTemplateRow = Tables["report_templates"]["Row"];
export type ReportSectionRow = Tables["report_sections"]["Row"];
export type ReportRowRow = Tables["report_rows"]["Row"];
export type AccountMappingRow = Tables["account_mappings"]["Row"];
export type ReportViewRow = Tables["report_views"]["Row"];

export type ValueLayerKind = "actual" | "budget" | "forecast" | "scenario";
export type SignBehavior = "natural" | "invert";
export type RowCalcType = "account" | "formula" | "manual";

/** Normalized template payload returned by templateLoader. */
export interface LoadedTemplate {
  template: ReportTemplateRow;
  sections: ReportSectionRow[];
  rows: ReportRowRow[];
  mappings: AccountMappingRow[];
  views: ReportViewRow[];
}
