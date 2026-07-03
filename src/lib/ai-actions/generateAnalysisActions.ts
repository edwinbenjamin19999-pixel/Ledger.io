import { ACTION_THRESHOLDS, deriveConfidence, type AIAction } from "./types";
import type { KPIMetric } from "@/components/financial-analysis/types";

interface GenerateInput {
  kpis: KPIMetric[];
  onNavigate: (path: string) => void;
}

export function generateAnalysisActions({
  kpis,
  onNavigate,
}: GenerateInput): AIAction[] {
  const actions: AIAction[] = [];
  const variancesPresent = kpis.some((k) => k.comparison !== 0);
  if (!variancesPresent) return [];

  // Most material unfavorable variance → action
  const worst = [...kpis]
    .filter((k) => k.comparison > 0 && !k.isFavorable)
    .sort((a, b) => Math.abs(b.varianceAmount) - Math.abs(a.varianceAmount))[0];

  if (worst && worst.variancePercent !== null && Math.abs(worst.variancePercent) >= ACTION_THRESHOLDS.COST_VARIANCE_PCT * 100) {
    actions.push({
      id: `analysis.variance.${worst.label}`,
      kind: "risk",
      module: "analysis",
      title: `${worst.label} avviker mot plan`,
      explanation: `${worst.label} ligger ${Math.abs(worst.variancePercent).toFixed(1).replace(".", ",")} % från budget. Granska underliggande konton för att förstå drivkrafterna och justera prognosen om avvikelsen är permanent.`,
      impact: { amount: Math.abs(worst.varianceAmount), label: "avvikelse" },
      confidence: deriveConfidence(kpis.length),
      primary: {
        label: "Öppna huvudbok",
        onClick: () => onNavigate("/journal-entries"),
      },
      secondary: {
        label: "Justera budget",
        onClick: () => onNavigate("/budget"),
      },
      evidence: [{ label: worst.label }, { label: `${worst.variancePercent.toFixed(1)} % avvikelse` }],
    });
  }

  // Most material favorable variance → optimization opportunity
  const best = [...kpis]
    .filter((k) => k.comparison > 0 && k.isFavorable)
    .sort((a, b) => Math.abs(b.varianceAmount) - Math.abs(a.varianceAmount))[0];

  if (best && best.variancePercent !== null && Math.abs(best.variancePercent) >= ACTION_THRESHOLDS.COST_VARIANCE_PCT * 100) {
    actions.push({
      id: `analysis.upside.${best.label}`,
      kind: "optimization",
      module: "analysis",
      title: `${best.label} överträffar plan`,
      explanation: `${best.label} ligger ${Math.abs(best.variancePercent).toFixed(1).replace(".", ",")} % bättre än budget. Överväg att uppdatera prognosen eller omfördela kapital till tillväxtinitiativ.`,
      impact: { amount: Math.abs(best.varianceAmount), label: "över plan" },
      confidence: deriveConfidence(kpis.length),
      primary: {
        label: "Uppdatera prognos",
        onClick: () => onNavigate("/budget"),
      },
      evidence: [{ label: best.label }],
    });
  }

  return actions.slice(0, 3);
}
