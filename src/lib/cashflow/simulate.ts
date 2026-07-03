// Pure simulation overlay: given base periods + a list of pending simulated actions,
// return adjusted KPIs, periods, and runway. No I/O.
import type { CashFlowKPI, CashFlowPeriod } from "@/hooks/useCashFlow";

export type SimulatedActionKind =
  | "collect_ar"
  | "delay_ap"
  | "send_reminders"
  | "negotiate_terms";

export interface SimulatedAction {
  id: string;
  kind: SimulatedActionKind;
  label: string;
  // Cash impact, positive = inflow gained (or outflow avoided)
  expectedImpactSek: number;
  // Days from today the impact realises
  daysToImpact: number;
  // Confidence 0..1
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  // Source — which insight produced this
  insightId?: string;
}

export interface SimulationOverlay {
  pendingActions: SimulatedAction[];
}

export interface SimulationResult {
  adjustedKpi: CashFlowKPI | null;
  adjustedPeriods: CashFlowPeriod[];
  totalImpact: number;
  weightedImpact: number; // impact × confidence
  newRunwayDays: number;
}

export function simulate(
  baseKpi: CashFlowKPI | null,
  basePeriods: CashFlowPeriod[],
  overlay: SimulationOverlay,
): SimulationResult {
  if (!baseKpi || overlay.pendingActions.length === 0) {
    return {
      adjustedKpi: baseKpi,
      adjustedPeriods: basePeriods,
      totalImpact: 0,
      weightedImpact: 0,
      newRunwayDays: baseKpi?.runwayDays ?? 0,
    };
  }

  const totalImpact = overlay.pendingActions.reduce((s, a) => s + a.expectedImpactSek, 0);
  const weightedImpact = overlay.pendingActions.reduce(
    (s, a) => s + a.expectedImpactSek * a.confidence,
    0,
  );

  // Apply impact to current month and forward
  const today = new Date();
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const idx = basePeriods.findIndex((p) => p.period === currentKey);
  const adjusted = basePeriods.map((p) => ({ ...p }));
  if (idx >= 0) {
    const target = adjusted[idx];
    if (weightedImpact >= 0) target.inflows += weightedImpact;
    else target.outflows += Math.abs(weightedImpact);
    target.net = target.inflows - target.outflows;
    // recompute running balances forward
    let bal = idx === 0 ? target.openingBalance : adjusted[idx - 1].closingBalance;
    for (let i = idx; i < adjusted.length; i++) {
      adjusted[i].openingBalance = bal;
      adjusted[i].net = adjusted[i].inflows - adjusted[i].outflows;
      bal += adjusted[i].net;
      adjusted[i].closingBalance = bal;
    }
  }

  const newBalance = baseKpi.cashBalance + weightedImpact;
  const newRunwayDays =
    baseKpi.avgDailyOutflow > 0
      ? Math.max(0, Math.floor(newBalance / baseKpi.avgDailyOutflow))
      : 999;

  const adjustedKpi: CashFlowKPI = {
    ...baseKpi,
    cashBalance: newBalance,
    runwayDays: Math.min(newRunwayDays, 999),
    netCashFlowMTD: idx >= 0 ? adjusted[idx].net : baseKpi.netCashFlowMTD,
  };

  return {
    adjustedKpi,
    adjustedPeriods: adjusted,
    totalImpact,
    weightedImpact,
    newRunwayDays: Math.min(newRunwayDays, 999),
  };
}
