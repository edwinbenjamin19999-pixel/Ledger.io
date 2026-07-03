/**
 * Dashboard default layout — single source of truth for the standard layout
 * shown to new users and restored by "Återställ till standard".
 *
 * The `id` field maps to either:
 *   - "kpi-strip" → the LOCKED KPI overview row (always rendered first)
 *   - widget IDs that match `ALL_WIDGETS` in `src/components/dashboard/kpi-definitions.ts`
 *     via the `WIDGET_ID_ALIAS` map below.
 */

export type DashboardWidgetSize = "S" | "M" | "L";
export type DashboardItemType = "KPI" | "Widget";

export interface DashboardLayoutEntry {
  id: string;
  label: string;
  type: DashboardItemType;
  size: DashboardWidgetSize;
  visible: boolean;
  locked: boolean;
  /** When true and the widget reports no data, it is removed from the grid. */
  hideWhenEmpty?: boolean;
  order: number;
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutEntry[] = [
  // ── LOCKED — always first, cannot be moved or hidden ──
  { id: "kpi-strip", label: "KPI-översikt", type: "KPI", size: "L", visible: true, locked: true, order: 0 },

  // ── DEFAULT VISIBLE (8 essentials) ──
  { id: "ai-signal-bar", label: "AI-signaler", type: "Widget", size: "L", visible: true, locked: false, order: 1 },
  { id: "riskradar", label: "Riskradar", type: "Widget", size: "M", visible: true, locked: false, order: 2 },
  { id: "forfallna-fakturor", label: "Förfallna fakturor", type: "Widget", size: "M", visible: true, locked: false, order: 3 },
  { id: "kassaflode", label: "Kassaflöde – 3 mån", type: "Widget", size: "M", visible: true, locked: false, order: 4 },
  { id: "kommande-deadlines", label: "Kommande deadlines", type: "Widget", size: "M", visible: true, locked: false, order: 5 },
  { id: "manadsresultat", label: "Månadsresultat – 12 mån", type: "Widget", size: "L", visible: true, locked: false, order: 6 },
  { id: "snabbatgarder", label: "Snabbåtgärder", type: "Widget", size: "L", visible: true, locked: false, order: 7 },

  // ── DEFAULT HIDDEN — available but off by default ──
  { id: "ai-insikter", label: "AI-insikter & prognoser", type: "Widget", size: "L", visible: false, locked: false, order: 8 },
  { id: "top5-kunder", label: "Top 5 kunder", type: "Widget", size: "M", visible: false, locked: false, hideWhenEmpty: true, order: 9 },
  { id: "top5-leverantorer", label: "Top 5 leverantörer", type: "Widget", size: "M", visible: false, locked: false, hideWhenEmpty: true, order: 10 },
  { id: "avstamningslogg", label: "Automatisk avstämningslogg", type: "Widget", size: "M", visible: false, locked: false, hideWhenEmpty: true, order: 11 },
  { id: "kostnadsavvikelser", label: "Kostnadsavvikelser", type: "Widget", size: "M", visible: false, locked: false, hideWhenEmpty: true, order: 12 },
  { id: "operativ-halsa", label: "Operativ hälsa", type: "Widget", size: "L", visible: false, locked: false, order: 13 },
  { id: "kundkoncentration", label: "Top kunder & koncentration", type: "Widget", size: "L", visible: false, locked: false, order: 14 },
  { id: "automatiseringsgrad", label: "Automatiseringsgrad", type: "Widget", size: "M", visible: false, locked: false, order: 15 },
  { id: "aktivitet", label: "Senaste aktivitet", type: "Widget", size: "M", visible: false, locked: false, order: 16 },
];

/** Deep-clone the default layout so callers can mutate it freely. */
export const getDefaultLayout = (): DashboardLayoutEntry[] =>
  JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));

/**
 * Map the user-facing layout IDs (above) onto the internal widget IDs used by
 * `DashboardCockpit.renderWidgetById` / `ALL_WIDGETS`. Keep this in one place
 * so the modal and renderer agree.
 */
export const WIDGET_ID_ALIAS: Record<string, string> = {
  "ai-signal-bar": "business_pulse",
  "forfallna-fakturor": "overdue_invoices",
  "riskradar": "business_pulse",
  "kassaflode": "cashflow_chart",
  "kommande-deadlines": "upcoming_deadlines",
  "ai-insikter": "ai_insights",
  "manadsresultat": "monthly_result",
  "snabbatgarder": "quick_actions",
  "top5-kunder": "top_customers",
  "top5-leverantorer": "top_suppliers",
  "avstamningslogg": "reconciliation_log",
  "kostnadsavvikelser": "expense_anomalies",
  "aktivitet": "activity_feed",
  // The following have no 1:1 widget yet — reserved for future widgets:
  "operativ-halsa": "operations_health",
  "kundkoncentration": "customer_concentration",
  "automatiseringsgrad": "automation_pct",
};

/** Set of internal widget IDs that should be removed from the grid when their data is empty. */
export const HIDE_WHEN_EMPTY_WIDGETS = new Set<string>(
  DEFAULT_DASHBOARD_LAYOUT
    .filter((e) => e.hideWhenEmpty)
    .map((e) => WIDGET_ID_ALIAS[e.id] ?? e.id),
);
