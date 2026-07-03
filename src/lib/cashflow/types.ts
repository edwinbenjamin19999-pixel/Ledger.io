export type InsightKind = "ar_overdue" | "ap_pressure" | "runway_low" | "concentration";
export type InsightActionType =
  | "send_reminders"
  | "send_collection"
  | "propose_plan"
  | "defer_payments"
  | "reschedule_payments"
  | "negotiate"
  | "rank_priority"
  | "tag_risk"
  | "view_breakdown";

export interface InsightAction {
  type: InsightActionType;
  label: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
  payload?: Record<string, unknown>;
}

export interface ARInvoiceLite {
  id: string;
  counterparty_name: string | null;
  total_amount: number;
  due_date: string | null;
  status: string;
  reminder_count?: number | null;
  invoice_number?: string | null;
}

export interface APInvoiceLite {
  id: string;
  counterparty_name: string | null;
  total_amount: number;
  due_date: string | null;
  status: string;
  invoice_number?: string | null;
}

export interface ActionableInsight {
  id: string;
  kind: InsightKind;
  priority: number; // higher = more important
  title: string;
  description: string;
  impactSek: number;
  confidence: number; // 0-1
  riskLevel: "low" | "medium" | "high";
  invoiceIds: string[];
  customerNames?: string[];
  supplierNames?: string[];
  actions: InsightAction[];
}
