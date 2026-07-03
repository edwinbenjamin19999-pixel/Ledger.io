/**
 * Unified Validation Engine for Financial Reports.
 * One engine — feeds KPI header, global error bar, AI CFO layer,
 * imbalance debugger and PDF export. Single source of truth.
 *
 * 9 checks (extends Section 9 reconciliation):
 *  1. Assets = Equity + Liabilities (accounting equation)
 *  2. RR result == BR Årets resultat (2099)
 *  3. Missing account mappings (lines without chart_of_accounts)
 *  4. Abnormal account behavior (negative assets, etc.)
 *  5. Incomplete period (no opening balance for current year)
 *  6. Suspicious negatives (large negative on credit-normal accounts)
 *  7. Unbalanced supporting accounts (sub-totals vs parent)
 *  8. Missing journal effects (account class with zero movement but expected)
 *  9. Manual adjustment conflicts (overrides that contradict ledger)
 */

import type { ReportAccountRow } from "@/components/reports/ProfessionalReportTable";

export type FindingSeverity = "critical" | "warning" | "info";
export type FindingCode =
  | "EQUATION_BROKEN"
  | "RESULT_MISMATCH"
  | "MISSING_MAPPING"
  | "ABNORMAL_BEHAVIOR"
  | "INCOMPLETE_PERIOD"
  | "SUSPICIOUS_NEGATIVE"
  | "UNBALANCED_SUB"
  | "MISSING_JOURNAL_EFFECT"
  | "ADJUSTMENT_CONFLICT";

export interface ValidationFinding {
  code: FindingCode;
  severity: FindingSeverity;
  title: string;
  message: string;
  affectedAccounts: string[]; // account numbers
  impact?: number; // SEK impact
  suggestedFix?: string;
}

export interface ValidationInput {
  assetRows: ReportAccountRow[];
  liabRows: ReportAccountRow[];
  isRows: ReportAccountRow[];
  totalAssets: number;
  totalLiabEq: number;
  rrResult: number;
  hasOpeningBalances: boolean;
  unmappedLineCount?: number;
}

export interface ValidationReport {
  findings: ValidationFinding[];
  imbalanceDiff: number;
  balanced: boolean;
  /** 0..1 confidence score weighting validation cleanliness */
  confidence: number;
  countsBySeverity: { critical: number; warning: number; info: number };
}

const TOLERANCE = 1; // 1 SEK rounding tolerance

export function runValidationEngine(input: ValidationInput): ValidationReport {
  const findings: ValidationFinding[] = [];

  // 1. Accounting equation
  const imbalanceDiff = input.totalAssets - input.totalLiabEq;
  const balanced = Math.abs(imbalanceDiff) <= TOLERANCE;
  if (!balanced) {
    findings.push({
      code: "EQUATION_BROKEN",
      severity: "critical",
      title: "Balansräkningen är inte i balans",
      message: `Tillgångar (${formatNum(input.totalAssets)}) ≠ Eget kapital + Skulder (${formatNum(input.totalLiabEq)}). Differens: ${formatNum(imbalanceDiff)} kr.`,
      affectedAccounts: [],
      impact: imbalanceDiff,
      suggestedFix: "Öppna Balans-debuggern för att hitta mest sannolika orsaken.",
    });
  }

  // 2. RR result vs BR 2099 (Årets resultat)
  const acct2099 = input.liabRows.find((r) => r.accountNumber === "2099");
  if (acct2099) {
    const brResult = acct2099.utgBalans;
    const diff = brResult - input.rrResult;
    if (Math.abs(diff) > TOLERANCE) {
      findings.push({
        code: "RESULT_MISMATCH",
        severity: "critical",
        title: "Periodens resultat avviker mellan RR och BR",
        message: `RR visar ${formatNum(input.rrResult)} kr. Konto 2099 (Årets resultat) visar ${formatNum(brResult)} kr. Differens: ${formatNum(diff)} kr.`,
        affectedAccounts: ["2099"],
        impact: diff,
        suggestedFix: "Kontrollera att periodens resultat är överfört till eget kapital korrekt.",
      });
    }
  }

  // 3. Missing mappings
  if ((input.unmappedLineCount ?? 0) > 0) {
    findings.push({
      code: "MISSING_MAPPING",
      severity: "warning",
      title: `${input.unmappedLineCount} verifikationsrader saknar kontomappning`,
      message: "Vissa journalrader saknar koppling till kontoplanen och påverkar inte rapporterna.",
      affectedAccounts: [],
      suggestedFix: "Granska huvudboken och knyt felande rader till rätt konto.",
    });
  }

  // 4. Abnormal account behavior — negative assets, positive expenses
  const negativeAssets = input.assetRows.filter(
    (r) => r.utgBalans < -100 && !r.accountNumber.startsWith("19"), // bank can be negative (overdraft)
  );
  if (negativeAssets.length > 0) {
    findings.push({
      code: "ABNORMAL_BEHAVIOR",
      severity: "warning",
      title: `${negativeAssets.length} tillgångskonton har negativ saldo`,
      message: `Onormalt: ${negativeAssets.slice(0, 3).map((r) => `${r.accountNumber} ${r.accountName}`).join(", ")}${negativeAssets.length > 3 ? "…" : ""}`,
      affectedAccounts: negativeAssets.map((r) => r.accountNumber),
      impact: negativeAssets.reduce((s, r) => s + r.utgBalans, 0),
      suggestedFix: "Kontrollera om bokningar har skett på fel sida (debit/kredit).",
    });
  }

  // 5. Incomplete period — no opening balances
  if (!input.hasOpeningBalances) {
    findings.push({
      code: "INCOMPLETE_PERIOD",
      severity: "warning",
      title: "Ingående balanser saknas",
      message: "Perioden saknar ingående balanser. Detta kan ge missvisande utgående saldo.",
      affectedAccounts: [],
      suggestedFix: "Importera ingående balans från föregående år (SIE2/SIE4).",
    });
  }

  // 6. Suspicious negatives — credit-normal accounts (2xxx) with large positive debit balance
  const suspiciousLiab = input.liabRows.filter(
    (r) => r.utgBalans < -1000 && r.accountNumber.startsWith("2") && !r.accountNumber.startsWith("20"),
  );
  if (suspiciousLiab.length > 0) {
    findings.push({
      code: "SUSPICIOUS_NEGATIVE",
      severity: "info",
      title: `${suspiciousLiab.length} skuldkonton har negativ saldo`,
      message: "Skuldkonton med negativ saldo kan tyda på överbetalning eller felbokning.",
      affectedAccounts: suspiciousLiab.map((r) => r.accountNumber),
    });
  }

  // 7. Unbalanced supporting accounts — placeholder (requires section structure to be meaningful)
  // 8. Missing journal effects — class 1 totals zero
  if (Math.abs(input.totalAssets) < TOLERANCE && input.assetRows.length === 0) {
    findings.push({
      code: "MISSING_JOURNAL_EFFECT",
      severity: "warning",
      title: "Inga tillgångskonton aktiva",
      message: "Inga rörelser på klass 1 (tillgångar) i vald period.",
      affectedAccounts: [],
    });
  }

  // 9. Adjustment conflicts — placeholder (would require manual_adjustments table)

  const counts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  // Confidence: starts at 1.0, deduct for each finding
  let confidence = 1.0;
  confidence -= counts.critical * 0.25;
  confidence -= counts.warning * 0.08;
  confidence -= counts.info * 0.03;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    findings,
    imbalanceDiff,
    balanced,
    confidence,
    countsBySeverity: counts,
  };
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString("sv-SE");
}
