import { useMemo } from "react";
import { differenceInDays, subDays } from "date-fns";
import type {
  AgeingBucket,
  CounterpartySummary,
  InvoiceRow,
} from "./ageingUtils";
import { fmtSEK, getBucketIdx } from "./ageingUtils";

export type RiskLevel = "neutral" | "warning" | "critical";
export type InsightId = "risk" | "concentration" | "trend" | "action";
export type ActionType = "remind" | "followup" | "view";

export interface AgeingInsight {
  id: InsightId;
  riskLevel: RiskLevel;
  headline: string;
  detail?: string;
  metric?: string;
  actionLabel?: string;
  actionType?: ActionType;
  targetCounterparties?: string[];
  // legacy fields used by chart highlight
  highestRiskIdx?: number;
  pctOver60?: number;
}

export interface AgeingInsightsBundle {
  primary: AgeingInsight;
  secondary: AgeingInsight[];
  rowFlags: Map<string, "critical" | "warning">;
  highestRiskIdx: number;
  pctOver60: number;
}

export const useAgeingInsights = (
  buckets: AgeingBucket[],
  grouped: CounterpartySummary[],
  type: "AR" | "AP",
  allInvoices: InvoiceRow[] = [],
): AgeingInsightsBundle => {
  return useMemo(() => {
    const total = buckets.reduce((s, b) => s + b.total, 0);
    const over60 = buckets[3].total + buckets[4].total;
    const overdue = buckets.slice(1).reduce((s, b) => s + b.total, 0);
    const pctOver60 = total > 0 ? (over60 / total) * 100 : 0;

    let highestRiskIdx = 0;
    for (let i = 4; i >= 1; i--) {
      if (buckets[i].total > 0) {
        highestRiskIdx = i;
        break;
      }
    }

    // Row flags per counterparty
    const rowFlags = new Map<string, "critical" | "warning">();
    grouped.forEach((g) => {
      if (g.buckets[4] > 0) rowFlags.set(g.name, "critical");
      else if (g.buckets[3] > 0) rowFlags.set(g.name, "warning");
    });

    const isAR = type === "AR";
    const partyWord = isAR ? "kunder" : "leverantörer";
    const partyWordSing = isAR ? "kund" : "leverantör";
    const claimWord = isAR ? "fordringar" : "skulder";
    const actionLabelBase = isAR ? "Skicka påminnelse" : "Markera för betalning";
    const actionType: ActionType = isAR ? "remind" : "followup";

    // ============= PRIMARY =============
    let primary: AgeingInsight;
    if (total === 0) {
      primary = {
        id: "risk",
        riskLevel: "neutral",
        headline: isAR
          ? "Inga öppna fordringar — bra jobbat"
          : "Inga öppna leverantörsskulder",
        highestRiskIdx: 0,
        pctOver60: 0,
      };
    } else if (overdue === 0) {
      primary = {
        id: "risk",
        riskLevel: "neutral",
        headline: isAR
          ? "Alla fordringar inom betalningsvillkor"
          : "Alla skulder inom betalningsvillkor",
        highestRiskIdx,
        pctOver60: 0,
      };
    } else {
      const largest = grouped[0];
      const largestPct =
        largest && overdue > 0 ? (largest.overdue / overdue) * 100 : 0;
      let riskLevel: RiskLevel = "neutral";
      let headline = "";

      if (pctOver60 >= 25) {
        riskLevel = "critical";
        headline = isAR
          ? `${pctOver60.toFixed(0)}% över 60 dagar — ökad kreditrisk`
          : `${pctOver60.toFixed(0)}% över 60 dagar — risk för påminnelseavgifter`;
      } else if (pctOver60 >= 10) {
        riskLevel = "warning";
        headline = isAR
          ? `${pctOver60.toFixed(0)}% av ${claimWord} över 60 dagar`
          : `${pctOver60.toFixed(0)}% av ${claimWord} över 60 dagar`;
      } else {
        const overduePct = (overdue / total) * 100;
        riskLevel = "neutral";
        headline = isAR
          ? `${overduePct.toFixed(0)}% förfallet — låg kreditrisk`
          : `${overduePct.toFixed(0)}% förfallet — god betalningsdisciplin`;
      }

      const targets = grouped
        .filter((g) => g.buckets[3] > 0 || g.buckets[4] > 0)
        .map((g) => g.name);

      primary = {
        id: "risk",
        riskLevel,
        headline,
        detail: largest
          ? `Största: ${largest.name} (${fmtSEK(largest.overdue)} kr, ${largestPct.toFixed(0)}%)`
          : undefined,
        actionLabel:
          targets.length > 0
            ? targets.length > 10
              ? `${actionLabelBase} till ${targets.length} ${partyWord}`
              : actionLabelBase
            : undefined,
        actionType,
        targetCounterparties: targets,
        highestRiskIdx,
        pctOver60,
      };
    }

    // ============= SECONDARY =============
    const secondary: AgeingInsight[] = [];

    if (total > 0 && overdue > 0) {
      // Concentration
      const overdueParties = grouped.filter((g) => g.overdue > 0);
      const topN = Math.min(3, overdueParties.length);
      const topSum = overdueParties
        .slice(0, topN)
        .reduce((s, g) => s + g.overdue, 0);
      const concPct = overdue > 0 ? (topSum / overdue) * 100 : 0;
      secondary.push({
        id: "concentration",
        riskLevel: concPct >= 60 ? "warning" : "neutral",
        headline: `Top ${topN} ${topN === 1 ? partyWordSing : partyWord} = ${concPct.toFixed(0)}%`,
        detail: "av förfallet belopp",
        metric: `${concPct.toFixed(0)}%`,
      });

      // Trend (compare overdue 30d ago vs now using all invoices)
      const todayDate = new Date();
      const refDate = subDays(todayDate, 30);
      let pastOverdue = 0;
      allInvoices.forEach((inv) => {
        // only invoices that existed 30 days ago and were unpaid at that time
        const issued = new Date(inv.invoice_date);
        if (issued > refDate) return;
        if (inv.paid_at && new Date(inv.paid_at) <= refDate) return;
        const daysPast = differenceInDays(refDate, new Date(inv.due_date));
        if (daysPast > 0) pastOverdue += inv.total_amount;
      });
      const hasHistory = allInvoices.some(
        (i) => new Date(i.invoice_date) <= refDate,
      );
      if (!hasHistory) {
        secondary.push({
          id: "trend",
          riskLevel: "neutral",
          headline: "Ej tillräcklig historik",
          detail: "Trend visas efter 30 dagar",
          metric: "–",
        });
      } else {
        const delta =
          pastOverdue > 0
            ? ((overdue - pastOverdue) / pastOverdue) * 100
            : overdue > 0
              ? 100
              : 0;
        const sign = delta >= 0 ? "+" : "";
        secondary.push({
          id: "trend",
          riskLevel: delta >= 20 ? "warning" : "neutral",
          headline: `${sign}${delta.toFixed(0)}% senaste 30 dagarna`,
          detail: `Förfallet ${delta >= 0 ? "ökat" : "minskat"}`,
          metric: `${sign}${delta.toFixed(0)}%`,
        });
      }

      // Action
      const targets = grouped
        .filter((g) => g.buckets[3] > 0 || g.buckets[4] > 0)
        .map((g) => g.name);
      if (targets.length > 0) {
        secondary.push({
          id: "action",
          riskLevel: "warning",
          headline: isAR
            ? `${targets.length} ${targets.length === 1 ? partyWordSing : partyWord} behöver påminnelse`
            : `${targets.length} ${targets.length === 1 ? partyWordSing : partyWord} att bevaka`,
          detail: targets.slice(0, 3).join(", ") + (targets.length > 3 ? "…" : ""),
          metric: `${targets.length}`,
          actionLabel: actionLabelBase,
          actionType,
          targetCounterparties: targets,
        });
      }
    }

    return {
      primary,
      secondary,
      rowFlags,
      highestRiskIdx,
      pctOver60,
    };
  }, [buckets, grouped, type, allInvoices]);
};
