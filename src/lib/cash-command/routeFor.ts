/**
 * Cash Command — verb/insight kind → operational deep link.
 * Mirrors src/lib/ai-ekonom/routeFor.ts but typed for ActionableInsight.
 * Keeps every priority card from dead-ending.
 */
import type { ActionableInsight, InsightKind } from "@/lib/cashflow/types";

export interface CashRoute {
  href: string;
  label: string;
}

export function routeFor(insight: Pick<ActionableInsight, "kind" | "invoiceIds">): CashRoute {
  const ids = insight.invoiceIds?.length ? `?ids=${insight.invoiceIds.slice(0, 25).join(",")}` : "";
  switch (insight.kind as InsightKind) {
    case "ar_overdue":
      return { href: `/ar-agent${ids}`, label: "Öppna AR-agent" };
    case "ap_pressure":
      return { href: `/direct-payment${ids}`, label: "Öppna betalningar" };
    case "runway_low":
      return { href: "/cashflow-forecast", label: "Öppna prognos" };
    case "concentration":
      return { href: "/financial-analysis", label: "Öppna analys" };
    default:
      return { href: "/cashflow-forecast", label: "Öppna prognos" };
  }
}

export function ctaVerb(kind: InsightKind): string {
  switch (kind) {
    case "ar_overdue":
      return "Driv in";
    case "ap_pressure":
      return "Skjut upp";
    case "runway_low":
      return "Förbättra runway";
    case "concentration":
      return "Diversifiera";
    default:
      return "Åtgärda";
  }
}
