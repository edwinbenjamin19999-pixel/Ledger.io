/**
 * Imbalance Diagnostics — ranks accounts AND specific verifications by
 * likelihood of causing imbalance. Used by ImbalanceInvestigator.
 */

import type { ReportAccountRow } from "@/components/reports/ProfessionalReportTable";
import type { RawJournalLine } from "@/components/reports/reportDataBuilder";

export type AnomalyType =
  | "result_carry_mismatch"
  | "missing_counterpart"
  | "unbalanced_journal"
  | "negative_asset"
  | "negative_liability"
  | "opening_balance_drift";

export interface SuspectedAccount {
  accountNumber: string;
  accountName: string;
  anomalyType: AnomalyType;
  description: string;
  impact: number; // signed SEK
  confidence: number; // 0..1
}

/** Specific verification (or opening balance row) that creates a discrepancy. */
export interface SuspectedEntry {
  entryId: string;
  entryDate: string;
  description: string;
  /** sum(debit) - sum(credit) across the entry's lines. ≠ 0 ⇒ unbalanced. */
  netDelta: number;
  /** Per-line breakdown for the UI ("konkret rad och konto"). */
  lines: Array<{
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
  /** "exact" when netDelta ≈ overall imbalance, otherwise "candidate". */
  match: "exact" | "candidate";
}

export interface SuggestedFix {
  id: string;
  title: string;
  explanation: string;
  expectedImpact: number;
  confidence: number;
  ctaLabel: string;
  ctaTarget: "review_account" | "open_vouchers" | "create_adjustment" | "send_to_accountant" | "open_entry";
  accountNumber?: string;
  entryId?: string;
}

export interface DifferenceTreeNode {
  label: string;
  value: number;
  children?: DifferenceTreeNode[];
  highlight?: boolean;
}

export interface DiagnosticsInput {
  assetRows: ReportAccountRow[];
  liabRows: ReportAccountRow[];
  isRows: ReportAccountRow[];
  rrResult: number;
  totalAssets: number;
  totalLiabEq: number;
  /** Optional — when provided, diagnostics walks the verifications and pinpoints
   *  which one carries the imbalance. */
  rawLines?: RawJournalLine[];
}

export interface DiagnosticsReport {
  imbalanceDiff: number;
  likelyCategory: "equity" | "liability" | "asset" | "result_carry" | "unknown";
  overallConfidence: number;
  suspectedAccounts: SuspectedAccount[];
  /** Specific verifications (sum debit ≠ sum credit) that likely cause the diff. */
  suspectedEntries: SuspectedEntry[];
  fixes: SuggestedFix[];
  tree: DifferenceTreeNode;
}

export function diagnoseImbalance(input: DiagnosticsInput): DiagnosticsReport {
  const diff = input.totalAssets - input.totalLiabEq;
  const suspects: SuspectedAccount[] = [];

  // Check 2099 result carry-over
  const acct2099 = input.liabRows.find((r) => r.accountNumber === "2099");
  if (acct2099) {
    const carryDiff = acct2099.utgBalans - input.rrResult;
    if (Math.abs(carryDiff) > 1) {
      suspects.push({
        accountNumber: "2099",
        accountName: "Årets resultat",
        anomalyType: "result_carry_mismatch",
        description: `Periodens resultat (${fmt(input.rrResult)} kr) är inte fullt överfört till eget kapital. Avvikelse: ${fmt(carryDiff)} kr.`,
        impact: carryDiff,
        confidence: 0.92,
      });
    }
  }

  // Negative assets
  input.assetRows
    .filter((r) => r.utgBalans < -100 && !r.accountNumber.startsWith("19"))
    .slice(0, 3)
    .forEach((r) => {
      suspects.push({
        accountNumber: r.accountNumber,
        accountName: r.accountName,
        anomalyType: "negative_asset",
        description: `${r.accountName} har negativ utgående balans (${fmt(r.utgBalans)} kr) — onormalt för tillgångskonto.`,
        impact: r.utgBalans,
        confidence: 0.7,
      });
    });

  // Large outliers in liability/equity
  input.liabRows
    .filter((r) => Math.abs(r.utgBalans) > Math.abs(diff) * 0.5 && Math.abs(r.utgBalans) > 1000)
    .slice(0, 3)
    .forEach((r) => {
      if (suspects.find((s) => s.accountNumber === r.accountNumber)) return;
      suspects.push({
        accountNumber: r.accountNumber,
        accountName: r.accountName,
        anomalyType: "missing_counterpart",
        description: `${r.accountName} (${fmt(r.utgBalans)} kr) ligger nära obalansens storlek — kan sakna motkonto.`,
        impact: r.utgBalans,
        confidence: 0.55,
      });
    });

  // Specific verifications: sum debit ≠ sum credit per entry.
  // En enda obalanserad verifikation förklarar typiskt obalansen i BR.
  const suspectedEntries: SuspectedEntry[] = [];
  if (input.rawLines && input.rawLines.length > 0) {
    const byEntry = new Map<string, {
      entryId: string;
      entryDate: string;
      description: string;
      debit: number;
      credit: number;
      lines: SuspectedEntry["lines"];
    }>();
    for (const l of input.rawLines) {
      const id = l._entryId;
      if (!id) continue;
      const existing = byEntry.get(id) ?? {
        entryId: id,
        entryDate: l._entryDate ?? "",
        description: l._entryDescription ?? "",
        debit: 0,
        credit: 0,
        lines: [],
      };
      existing.debit += Number(l.debit) || 0;
      existing.credit += Number(l.credit) || 0;
      existing.lines.push({
        accountNumber: l.chart_of_accounts?.account_number ?? "",
        accountName: l.chart_of_accounts?.account_name ?? "",
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      });
      byEntry.set(id, existing);
    }
    const unbalanced = [...byEntry.values()]
      .map((e) => ({ ...e, netDelta: e.debit - e.credit }))
      .filter((e) => Math.abs(e.netDelta) > 0.5);

    // Rank: matches the imbalance first, then by size.
    unbalanced.sort((a, b) => {
      const aMatch = Math.abs(Math.abs(a.netDelta) - Math.abs(diff));
      const bMatch = Math.abs(Math.abs(b.netDelta) - Math.abs(diff));
      if (aMatch !== bMatch) return aMatch - bMatch;
      return Math.abs(b.netDelta) - Math.abs(a.netDelta);
    });

    for (const e of unbalanced.slice(0, 8)) {
      suspectedEntries.push({
        entryId: e.entryId,
        entryDate: e.entryDate,
        description: e.description || e.entryId.slice(0, 8),
        netDelta: e.netDelta,
        lines: e.lines,
        match: Math.abs(Math.abs(e.netDelta) - Math.abs(diff)) < 1 ? "exact" : "candidate",
      });
    }
  }

  // Fixes
  const fixes: SuggestedFix[] = [];
  const carrySuspect = suspects.find((s) => s.anomalyType === "result_carry_mismatch");
  if (carrySuspect) {
    fixes.push({
      id: "fix-result-carry",
      title: "Korrigera årets resultat (2099)",
      explanation: "Skapa en justering som synkar 2099 mot RR-resultatet för perioden.",
      expectedImpact: -carrySuspect.impact,
      confidence: 0.9,
      ctaLabel: "Skapa justering",
      ctaTarget: "create_adjustment",
      accountNumber: "2099",
    });
  }
  const exactEntry = suspectedEntries.find((e) => e.match === "exact");
  if (exactEntry) {
    fixes.push({
      id: `fix-entry-${exactEntry.entryId}`,
      title: `Öppna verifikation ${exactEntry.description}`,
      explanation: `Verifikationens debet och kredit skiljer sig med ${fmt(exactEntry.netDelta)} kr — exakt obalansen i BR.`,
      expectedImpact: -exactEntry.netDelta,
      confidence: 0.95,
      ctaLabel: "Öppna verifikation",
      ctaTarget: "open_entry",
      entryId: exactEntry.entryId,
    });
  }
  suspects
    .filter((s) => s.anomalyType === "negative_asset")
    .forEach((s) =>
      fixes.push({
        id: `fix-${s.accountNumber}`,
        title: `Granska ${s.accountNumber} ${s.accountName}`,
        explanation: "Negativa tillgångar är onormalt — granska bokningar för felaktig debit/kredit.",
        expectedImpact: -s.impact,
        confidence: 0.6,
        ctaLabel: "Öppna verifikationer",
        ctaTarget: "open_vouchers",
        accountNumber: s.accountNumber,
      }),
    );
  if (fixes.length === 0 && Math.abs(diff) > 1) {
    fixes.push({
      id: "fix-escalate",
      title: "Skicka till revisor / AI CFO",
      explanation: "Ingen tydlig orsak hittad. Eskalera för manuell granskning.",
      expectedImpact: 0,
      confidence: 0.4,
      ctaLabel: "Skicka till AI CFO",
      ctaTarget: "send_to_accountant",
    });
  }

  // Tree: Assets vs Equity+Liab
  const equityRows = input.liabRows.filter((r) => /^20[1-9]/.test(r.accountNumber));
  const longTermLiab = input.liabRows.filter((r) => /^23/.test(r.accountNumber));
  const shortTermLiab = input.liabRows.filter((r) => /^2[4-9]/.test(r.accountNumber));
  const fixedAssets = input.assetRows.filter((r) => /^1[0-2]/.test(r.accountNumber));
  const currentAssets = input.assetRows.filter((r) => /^1[3-9]/.test(r.accountNumber));

  const sumUtg = (rows: ReportAccountRow[]) => rows.reduce((s, r) => s + r.utgBalans, 0);

  const tree: DifferenceTreeNode = {
    label: "Balansräkning",
    value: diff,
    highlight: Math.abs(diff) > 1,
    children: [
      {
        label: "Tillgångar",
        value: input.totalAssets,
        children: [
          { label: "Anläggningstillgångar", value: sumUtg(fixedAssets) },
          { label: "Omsättningstillgångar", value: sumUtg(currentAssets) },
        ],
      },
      {
        label: "Eget kapital + Skulder",
        value: input.totalLiabEq,
        children: [
          { label: "Eget kapital", value: sumUtg(equityRows), highlight: !!carrySuspect },
          { label: "Långfristiga skulder", value: sumUtg(longTermLiab) },
          { label: "Kortfristiga skulder", value: sumUtg(shortTermLiab) },
        ],
      },
    ],
  };

  let likelyCategory: DiagnosticsReport["likelyCategory"] = "unknown";
  if (carrySuspect) likelyCategory = "result_carry";
  else if (suspects.some((s) => s.anomalyType === "negative_asset")) likelyCategory = "asset";
  else if (suspects.some((s) => /^20/.test(s.accountNumber))) likelyCategory = "equity";
  else if (suspects.some((s) => /^2[3-9]/.test(s.accountNumber))) likelyCategory = "liability";

  const overallConfidence =
    suspects.length > 0
      ? Math.min(0.95, suspects[0].confidence * 0.9 + 0.1)
      : 0.3;

  return {
    imbalanceDiff: diff,
    likelyCategory,
    overallConfidence,
    suspectedAccounts: suspects,
    suspectedEntries,
    fixes,
    tree,
  };
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("sv-SE");
}
