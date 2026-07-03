import { useCallback, useEffect, useMemo, useState } from "react";

export type DashboardWidgetId =
  | "daily_briefing"
  | "ai_status_bar"
  | "live_activity_feed"
  | "dashboard_cockpit"
  | "liquidity_runway"
  | "risk_alerts"
  | "monthly_capital"
  | "ai_cfo_insights"
  | "customer_concentration"
  | "operations_health"
  | "action_queue"
  | "action_center"
  | "quick_actions"
  | "deadlines_automation_row"
  | "pending_approvals";

export type PriorityTier = 1 | 2 | 3;

export interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  label: string;
  category: "KPI" | "Widget" | "AI";
  intelGroup: "liquidity" | "risk" | "growth" | "operations";
  priorityTier: PriorityTier;
  defaultVisible: boolean;
  defaultOrder: number;
  pinned?: boolean;
}

export const DASHBOARD_WIDGET_REGISTRY: DashboardWidgetMeta[] = [
  // TIER 1 — KRITISK
  { id: "daily_briefing",         label: "Daglig AI-briefing",          category: "AI",     intelGroup: "operations", priorityTier: 1, defaultVisible: true, defaultOrder: 1 },
  { id: "dashboard_cockpit",      label: "Finansiell översikt",         category: "KPI",    intelGroup: "liquidity",  priorityTier: 1, defaultVisible: true, defaultOrder: 2 },
  { id: "liquidity_runway",       label: "Burn rate & Runway",          category: "Widget", intelGroup: "liquidity",  priorityTier: 1, defaultVisible: true, defaultOrder: 3 },
  { id: "risk_alerts",            label: "Risk & varningar",            category: "Widget", intelGroup: "risk",       priorityTier: 1, defaultVisible: true, defaultOrder: 4 },

  // TIER 2 — VIKTIG
  { id: "ai_cfo_insights",        label: "AI CFO-insikter",             category: "AI",     intelGroup: "growth",     priorityTier: 2, defaultVisible: true, defaultOrder: 5 },
  { id: "customer_concentration", label: "Top kunder & koncentration",  category: "Widget", intelGroup: "growth",     priorityTier: 2, defaultVisible: true, defaultOrder: 6 },
  { id: "operations_health",      label: "Operativ hälsa",              category: "Widget", intelGroup: "operations", priorityTier: 2, defaultVisible: true, defaultOrder: 7 },
  { id: "monthly_capital",        label: "Månatligt kapitalbehov",      category: "Widget", intelGroup: "liquidity",  priorityTier: 2, defaultVisible: false, defaultOrder: 8 },
  { id: "action_center",          label: "Action Center",               category: "Widget", intelGroup: "operations", priorityTier: 2, defaultVisible: true, defaultOrder: 9 },

  // TIER 3 — KONTEXT
  { id: "deadlines_automation_row", label: "Deadlines & Automation",    category: "Widget", intelGroup: "risk",       priorityTier: 3, defaultVisible: true, defaultOrder: 10 },
  { id: "live_activity_feed",     label: "Live-aktivitet",              category: "AI",     intelGroup: "operations", priorityTier: 3, defaultVisible: true, defaultOrder: 11 },
  { id: "ai_status_bar",          label: "AI-statusrad",                category: "AI",     intelGroup: "operations", priorityTier: 3, defaultVisible: false, defaultOrder: 12 },
  { id: "action_queue",           label: "Åtgärdskö",                   category: "Widget", intelGroup: "risk",       priorityTier: 3, defaultVisible: false, defaultOrder: 13 },
  { id: "quick_actions",          label: "Snabbåtgärder",               category: "Widget", intelGroup: "operations", priorityTier: 3, defaultVisible: true, defaultOrder: 14 },
  { id: "pending_approvals",      label: "Väntande godkännanden",       category: "Widget", intelGroup: "risk",       priorityTier: 3, defaultVisible: true, defaultOrder: 15 },
];

export interface DashboardWidgetState {
  id: DashboardWidgetId;
  visible: boolean;
  order: number;
}

const STORAGE_KEY = "dashboard:layout:v3";
const AI_MODE_KEY = "dashboard:layout:ai-mode";

function buildDefault(): DashboardWidgetState[] {
  return DASHBOARD_WIDGET_REGISTRY
    .map(w => ({ id: w.id, visible: w.defaultVisible, order: w.defaultOrder }));
}

function loadFromStorage(): DashboardWidgetState[] {
  if (typeof window === "undefined") return buildDefault();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefault();
    const parsed = JSON.parse(raw) as DashboardWidgetState[];
    const known = new Set(parsed.map(p => p.id));
    const merged = [...parsed];
    let nextOrder = Math.max(0, ...parsed.map(p => p.order)) + 1;
    for (const w of DASHBOARD_WIDGET_REGISTRY) {
      if (!known.has(w.id)) {
        merged.push({ id: w.id, visible: w.defaultVisible, order: nextOrder++ });
      }
    }
    const validIds = new Set(DASHBOARD_WIDGET_REGISTRY.map(w => w.id));
    return merged.filter(m => validIds.has(m.id));
  } catch {
    return buildDefault();
  }
}

const tierOf = (id: DashboardWidgetId): PriorityTier =>
  DASHBOARD_WIDGET_REGISTRY.find(w => w.id === id)?.priorityTier ?? 3;

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<DashboardWidgetState[]>(() => loadFromStorage());
  const [aiOptimized, setAiOptimized] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AI_MODE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AI_MODE_KEY, aiOptimized ? "1" : "0");
  }, [aiOptimized]);

  // Sort visible widgets by tier first, then by user-defined order
  const orderedVisible = useMemo(
    () =>
      [...widgets]
        .filter(w => w.visible)
        .sort((a, b) => {
          const ta = tierOf(a.id);
          const tb = tierOf(b.id);
          if (ta !== tb) return ta - tb;
          return a.order - b.order;
        }),
    [widgets]
  );

  const reorder = useCallback((fromId: DashboardWidgetId, toId: DashboardWidgetId) => {
    // Only allow reorder within the same tier
    if (tierOf(fromId) !== tierOf(toId)) return;
    setWidgets(prev => {
      const visible = [...prev].filter(w => w.visible).sort((a, b) => {
        const ta = tierOf(a.id);
        const tb = tierOf(b.id);
        if (ta !== tb) return ta - tb;
        return a.order - b.order;
      });
      const fromIdx = visible.findIndex(w => w.id === fromId);
      const toIdx = visible.findIndex(w => w.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = visible.splice(fromIdx, 1);
      visible.splice(toIdx, 0, moved);
      const orderMap = new Map<string, number>();
      visible.forEach((w, i) => orderMap.set(w.id, i + 1));
      let next = visible.length + 1;
      for (const w of prev) if (!w.visible) orderMap.set(w.id, next++);
      return prev.map(w => ({ ...w, order: orderMap.get(w.id) ?? w.order }));
    });
  }, []);

  const setVisible = useCallback((id: DashboardWidgetId, visible: boolean) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible } : w));
  }, []);

  const reset = useCallback(() => setWidgets(buildDefault()), []);

  return {
    widgets,
    orderedVisible,
    reorder,
    setVisible,
    reset,
    aiOptimized,
    setAiOptimized,
  };
}
