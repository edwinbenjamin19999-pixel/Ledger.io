import type { VarianceRow, Driver } from "@/components/financial-analysis/types";

/**
 * Extract top positive and negative drivers from variance rows.
 * Looks at section level (level 1) AND children (level 3 accounts).
 */
export function computeDrivers(rows: VarianceRow[], topN = 3): { positive: Driver[]; negative: Driver[] } {
  const candidates: Driver[] = [];

  for (const section of rows) {
    if (section.id === 'ebit') continue;
    // Section level
    if (Math.abs(section.varianceAmount) > 0) {
      candidates.push({
        category: section.label,
        impactSEK: section.varianceAmount,
        variancePercent: section.variancePercent ?? 0,
        direction: section.isFavorable ? 'positive' : 'negative',
        rowRef: section,
      });
    }
    // Account-level (children)
    if (section.children) {
      for (const child of section.children) {
        if (Math.abs(child.varianceAmount) < 1000) continue;
        candidates.push({
          category: child.label,
          accountNumber: child.accountNumber,
          impactSEK: child.varianceAmount,
          variancePercent: child.variancePercent ?? 0,
          direction: child.isFavorable ? 'positive' : 'negative',
          rowRef: child,
        });
      }
    }
  }

  const positive = candidates
    .filter(d => d.direction === 'positive')
    .sort((a, b) => Math.abs(b.impactSEK) - Math.abs(a.impactSEK))
    .slice(0, topN);

  const negative = candidates
    .filter(d => d.direction === 'negative')
    .sort((a, b) => Math.abs(b.impactSEK) - Math.abs(a.impactSEK))
    .slice(0, topN);

  return { positive, negative };
}
