import type { Tier } from "../cfo-scoring.ts";

export type InsightKind =
  | "liquidity" | "cost" | "revenue" | "margin"
  | "concentration" | "personnel" | "cashflow_stability"
  | "profit_trend" | "anomaly" | "pricing"
  | "overdue_ar" | "annual_report";

export type CFOActionType =
  | "create_accrual" | "send_reminder" | "reclassify"
  | "apply_deferral" | "generate_report" | "none";

export type SimulationKind =
  | "price_increase" | "hire" | "cost_cut"
  | "new_loan" | "capex" | "collect_ar" | "none";

export interface Insight {
  id: string;
  kind: InsightKind;
  tier: Tier;
  title: string;
  explanation: string;
  impact_sek: number;
  confidence: number;
  action_type: CFOActionType;
  source: string;
  cta_label: string;
  priority_score: number;
  // New (Q5)
  recommended_action?: { label: string; type: CFOActionType; payload?: Record<string, unknown> };
  simulation?: { kind: SimulationKind; default_params: Record<string, unknown> };
  // Internals (used by orchestrator)
  _risk?: 0 | 0.5 | 1;
  _trend?: -1 | 0 | 1;
  _days_to_deadline?: number | null;
}

export interface GeneratorContext {
  supabase: any;
  companyId: string;
  personaMode: "business_owner" | "accountant";
  tone: "soft" | "direct";
  now: Date;
  accountsByNumber: Map<string, string>; // accNum -> id
  accountsById: Map<string, string>;     // id -> accNum
  totals: { revenue: number; costs: number; cash: number; monthlyBurn: number };
}

export type Generator = (ctx: GeneratorContext) => Promise<Insight[]>;
