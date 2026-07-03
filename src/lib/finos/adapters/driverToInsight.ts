/**
 * FinOS adapter — Financial Analysis driver → FinOSInsight.
 * Drivers from `computeDrivers()` become canonical insights so the same
 * insight stack renders them.
 */
import type { Driver } from "@/components/financial-analysis/types";
import type { FinOSInsight } from "../insights";
import type { FinOSAction } from "../actions";

interface Handlers {
  onSimulate: (d: Driver) => void;
  onDrilldown: (d: Driver) => void;
}

function severityFor(d: Driver): FinOSInsight["severity"] {
  const mag = Math.abs(d.impactSEK);
  if (d.direction === "positive") return mag > 100000 ? "positive" : "info";
  if (mag > 250000) return "critical";
  if (mag > 50000) return "warning";
  return "watch";
}

export function driverToInsight(d: Driver, h: Handlers): FinOSInsight {
  const actions: FinOSAction[] = [
    { verb: "simulate", onClick: () => h.onSimulate(d) },
    { verb: "open_drilldown", onClick: () => h.onDrilldown(d) },
  ];

  const sign = d.impactSEK >= 0 ? "+" : "";
  const title =
    d.direction === "positive"
      ? `${d.category} bidrar positivt (${sign}${d.impactSEK.toLocaleString("sv-SE")} kr)`
      : `${d.category} drar ned resultatet (${sign}${d.impactSEK.toLocaleString("sv-SE")} kr)`;

  return {
    id: `fa-driver-${d.accountNumber ?? d.category}`,
    module: "financial_analysis",
    category: d.direction === "positive" ? "opportunity" : "risk",
    severity: severityFor(d),
    title,
    explanation: `Avvikelse mot jämförelseperiod: ${d.variancePercent.toFixed(1)}%. ${
      d.accountNumber ? `Konto ${d.accountNumber}.` : ""
    } Simulera påverkan eller öppna underlag för att gå vidare.`,
    impact: { amount: d.impactSEK, unit: "SEK" },
    confidence: 0.85,
    actions,
    source: "financial_analysis",
  };
}
