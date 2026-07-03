import type { Generator, Insight } from "./types.ts";

export const annualReport: Generator = async (ctx) => {
  const { supabase, companyId } = ctx;
  const { data } = await supabase
    .from("annual_report_ai_suggestions")
    .select("id, title, explanation, impact_amount, confidence, severity, suggestion_type")
    .eq("company_id", companyId)
    .eq("status", "open")
    .order("severity", { ascending: true })
    .limit(10);
  return (data || []).map((s: any) => ({
    id: `ar-${s.id}`,
    kind: "annual_report" as const,
    tier: s.severity === "critical" ? "critical" : s.severity === "warning" ? "high" : "medium",
    title: s.title,
    explanation: s.explanation,
    impact_sek: Number(s.impact_amount || 0),
    confidence: Number(s.confidence),
    action_type: s.suggestion_type === "accrual" ? "create_accrual"
      : s.suggestion_type === "reclassify" ? "reclassify" : "create_accrual",
    source: "annual_report_ai_suggestions",
    cta_label: "Tillämpa förslag",
    priority_score: 0,
    recommended_action: { label: "Tillämpa", type: s.suggestion_type === "reclassify" ? "reclassify" : "create_accrual" },
    _risk: s.severity === "critical" ? 1 : 0.5,
    _trend: 0,
    _days_to_deadline: 30,
  }));
};
