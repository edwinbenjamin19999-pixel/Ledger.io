/**
 * FinOS — Deterministic ranking of insights.
 * Sort order, top-to-bottom:
 *   1. severity weight (critical first)
 *   2. deadline proximity (sooner first; missing = far future)
 *   3. impact magnitude (|amount| descending)
 *   4. confidence (higher first)
 *
 * Used everywhere a FinOSInsight[] is rendered, so users see the same priority
 * order whether they're on Dashboard, AI Ekonom, VAT, or any other module.
 */
import type { FinOSInsight } from "./insights";
import { severityWeight } from "./severity";

const FAR_FUTURE = Number.POSITIVE_INFINITY;

function deadlineMs(i: FinOSInsight): number {
  if (!i.deadline) return FAR_FUTURE;
  const t = Date.parse(i.deadline);
  return Number.isFinite(t) ? t : FAR_FUTURE;
}

function impactMag(i: FinOSInsight): number {
  return Math.abs(i.impact?.amount ?? 0);
}

export function rankInsights(insights: FinOSInsight[]): FinOSInsight[] {
  return [...insights].sort((a, b) => {
    const sev = severityWeight(a.severity) - severityWeight(b.severity);
    if (sev !== 0) return sev;
    const dl = deadlineMs(a) - deadlineMs(b);
    if (dl !== 0) return dl;
    const imp = impactMag(b) - impactMag(a);
    if (imp !== 0) return imp;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
}

export function topN(insights: FinOSInsight[], n: number): FinOSInsight[] {
  return rankInsights(insights).slice(0, n);
}
