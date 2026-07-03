import type { NavigateFunction } from "react-router-dom";
import { encodeCFOContext, type CFOContextPayload } from "@/hooks/useCFOContext";

export type DrilldownTarget =
  | { kind: "kpi"; key: string; label?: string; value?: number }
  | { kind: "action"; actionType: string }
  | { kind: "alert"; severity: string }
  | { kind: "summary" }
  | { kind: "cash" }
  | { kind: "priority"; insightId: string; title?: string };

const ACTION_ROUTES: Record<string, string> = {
  create_accrual: "/periodisering",
  send_reminder: "/finance",
  reclassify: "/verifikationer",
  apply_deferral: "/tax-calculation",
  generate_report: "/reports",
};

const KPI_ROUTES: Record<string, string> = {
  revenue: "/financial-analysis",
  ebitda: "/financial-analysis",
  margin: "/benchmarking",
  cash: "/cashflow-forecast",
  runway: "/cashflow-forecast",
  ar: "/finance",
  ap: "/direct-payment",
  cost_ratio: "/financial-analysis",
  growth: "/benchmarking",
};

export function drilldown(navigate: NavigateFunction, target: DrilldownTarget) {
  switch (target.kind) {
    case "kpi": {
      const route = KPI_ROUTES[target.key] || "/financial-analysis";
      navigate(`${route}?kpi=${encodeURIComponent(target.key)}`);
      return;
    }
    case "action": {
      const route = ACTION_ROUTES[target.actionType] || "/cfo/workspace";
      navigate(route);
      return;
    }
    case "alert":
      navigate(target.severity === "critical" ? "/anomalies" : "/closing");
      return;
    case "cash":
      navigate("/cashflow-forecast");
      return;
    case "summary": {
      const ctx: CFOContextPayload = { type: "general", source: "executive_summary" };
      navigate(`/cfo/workspace?context=${encodeCFOContext(ctx)}`);
      return;
    }
    case "priority": {
      const ctx: CFOContextPayload = { type: "action", insight_id: target.insightId, label: target.title };
      navigate(`/cfo/workspace?context=${encodeCFOContext(ctx)}`);
      return;
    }
  }
}
