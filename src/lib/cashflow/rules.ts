// Auto-mode rule definitions and helpers. Persisted in
// automation_settings.system_priorities (jsonb) — no schema change needed.

export type AutoRuleKey =
  | "ar_overdue_threshold"
  | "liquidity_floor"
  | "escalation_days";

export interface AutoRule {
  key: AutoRuleKey;
  enabled: boolean;
  threshold: number; // SEK or days, depending on rule
  // Last time the rule fired, ISO; used to throttle.
  lastFiredAt?: string | null;
  // Mapping to execute-cfo-action action_type
  actionType: "send_reminder" | "apply_deferral" | "reclassify";
}

export const DEFAULT_AUTO_RULES: AutoRule[] = [
  {
    key: "ar_overdue_threshold",
    enabled: false,
    threshold: 50000,
    actionType: "send_reminder",
  },
  {
    key: "liquidity_floor",
    enabled: false,
    threshold: 100000,
    actionType: "apply_deferral",
  },
  {
    key: "escalation_days",
    enabled: false,
    threshold: 14,
    actionType: "send_reminder",
  },
];

export interface AutoRulesState {
  rules: AutoRule[];
}

export function loadFromJson(json: unknown): AutoRulesState {
  if (!json || typeof json !== "object") return { rules: DEFAULT_AUTO_RULES };
  const obj = json as { cashflow_auto_rules?: AutoRule[] };
  if (!Array.isArray(obj.cashflow_auto_rules)) return { rules: DEFAULT_AUTO_RULES };
  // Merge with defaults so newly added rules appear
  const map = new Map(obj.cashflow_auto_rules.map((r) => [r.key, r]));
  return {
    rules: DEFAULT_AUTO_RULES.map((d) => ({ ...d, ...(map.get(d.key) ?? {}) })),
  };
}

export function toJson(state: AutoRulesState, existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" ? (existing as Record<string, unknown>) : {};
  return { ...base, cashflow_auto_rules: state.rules };
}

export function ruleLabel(key: AutoRuleKey): string {
  switch (key) {
    case "ar_overdue_threshold":
      return "Auto-påminnelser vid hög förfallen AR";
    case "liquidity_floor":
      return "Skjut leverantörsbetalningar vid låg likviditet";
    case "escalation_days":
      return "Eskalera obetalda fakturor efter X dagar";
  }
}

export function ruleUnit(key: AutoRuleKey): "sek" | "days" {
  return key === "escalation_days" ? "days" : "sek";
}

export interface RuleFireContext {
  arOverdueTotal: number;
  cashBalance: number;
  oldestOverdueDays: number;
}

export function shouldRuleFire(rule: AutoRule, ctx: RuleFireContext): boolean {
  if (!rule.enabled) return false;
  // Throttle: don't fire same rule more than once per hour
  if (rule.lastFiredAt) {
    const since = Date.now() - new Date(rule.lastFiredAt).getTime();
    if (since < 60 * 60 * 1000) return false;
  }
  switch (rule.key) {
    case "ar_overdue_threshold":
      return ctx.arOverdueTotal >= rule.threshold;
    case "liquidity_floor":
      return ctx.cashBalance <= rule.threshold;
    case "escalation_days":
      return ctx.oldestOverdueDays >= rule.threshold;
  }
}
