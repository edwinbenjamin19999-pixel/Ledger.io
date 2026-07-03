/**
 * SIE Validator — runs structural and accounting integrity checks
 * over a parsed SIEDocument. Returns a ValidationReport with blockers,
 * warnings, and aggregate stats.
 */
import type { SIEDocument } from "./sieParser.ts";

export type Severity = "blocker" | "warning" | "info";

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ValidationStats {
  totalAccounts: number;
  totalVerifications: number;
  totalTransactions: number;
  unbalancedVerifications: number;
  ibTotal: number;
  ubTotal: number;
  resTotal: number;
  revenueAccountsCount: number;
  costAccountsCount: number;
  assetAccountsCount: number;
  liabilityAccountsCount: number;
  totalRevenue: number;
  totalCosts: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface ValidationReport {
  blockers: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  stats: ValidationStats;
}

const TOLERANCE = 0.01;

function classifyAccountByNumber(num: string): "asset" | "liability" | "equity" | "revenue" | "cost" | "other" {
  const n = parseInt(num.slice(0, 1), 10);
  if (n === 1) return "asset";
  if (n === 2) return "liability"; // includes equity
  if (n === 3) return "revenue";
  if (n >= 4 && n <= 7) return "cost";
  return "other";
}

export function validateSIE(
  doc: SIEDocument,
  expected: { orgNumber?: string | null } = {},
): ValidationReport {
  const blockers: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];

  // 1) Org-nr presence + match
  const fileOrg = (doc.header.orgNumber ?? "").replace(/[^0-9]/g, "");
  if (!fileOrg) {
    blockers.push({
      severity: "blocker",
      code: "missing_org_number",
      message: "Filen saknar #ORGNR — manuell verifiering krävs innan import.",
    });
  } else if (expected.orgNumber) {
    const expOrg = expected.orgNumber.replace(/[^0-9]/g, "");
    if (expOrg && expOrg !== fileOrg) {
      blockers.push({
        severity: "blocker",
        code: "org_number_mismatch",
        message: `Org-nr i filen (${fileOrg}) matchar inte valt bolag (${expOrg}).`,
        context: { fileOrg, expectedOrg: expOrg },
      });
    }
  }

  // 2) Per-verification balance: Σdebit − Σcredit ≤ 0.01
  const accountNumbers = new Set(doc.accounts.map((a) => a.number));
  let unbalanced = 0;
  const seenVerKeys = new Set<string>();
  let totalTransactions = 0;

  for (const ver of doc.verifications) {
    const sum = ver.transactions.reduce((s, t) => s + t.amount, 0);
    totalTransactions += ver.transactions.length;
    if (Math.abs(sum) > TOLERANCE) {
      unbalanced++;
      blockers.push({
        severity: "blocker",
        code: "verification_unbalanced",
        message: `Verifikation ${ver.series}${ver.number} balanserar inte (diff ${sum.toFixed(2)}).`,
        context: { series: ver.series, number: ver.number, diff: sum },
      });
    }
    if (ver.transactions.length === 0) {
      warnings.push({
        severity: "warning",
        code: "verification_empty",
        message: `Verifikation ${ver.series}${ver.number} saknar transaktioner.`,
      });
    }
    const key = `${ver.series}::${ver.number}`;
    if (seenVerKeys.has(key)) {
      warnings.push({
        severity: "warning",
        code: "verification_duplicate_number",
        message: `Dubblerat verifikationsnummer ${key}.`,
      });
    }
    seenVerKeys.add(key);

    for (const t of ver.transactions) {
      if (t.accountNumber && !accountNumbers.has(t.accountNumber)) {
        warnings.push({
          severity: "warning",
          code: "transaction_unknown_account",
          message: `Transaktion på konto ${t.accountNumber} (saknas i #KONTO-listan).`,
          context: { accountNumber: t.accountNumber, series: ver.series, number: ver.number },
        });
      }
    }
  }

  // 3) IB + Σtrans ≈ UB per account (only year 0, warning level)
  const ibByAcc = new Map<string, number>();
  const ubByAcc = new Map<string, number>();
  for (const b of doc.balances.ib) if (b.yearIndex === 0) ibByAcc.set(b.accountNumber, b.amount);
  for (const b of doc.balances.ub) if (b.yearIndex === 0) ubByAcc.set(b.accountNumber, b.amount);

  const movementByAcc = new Map<string, number>();
  for (const ver of doc.verifications) {
    for (const t of ver.transactions) {
      movementByAcc.set(t.accountNumber, (movementByAcc.get(t.accountNumber) ?? 0) + t.amount);
    }
  }
  for (const [acc, ib] of ibByAcc) {
    const move = movementByAcc.get(acc) ?? 0;
    const ub = ubByAcc.get(acc);
    if (ub === undefined) continue;
    if (Math.abs(ib + move - ub) > 1.0) {
      warnings.push({
        severity: "warning",
        code: "balance_continuity_mismatch",
        message: `Konto ${acc}: IB+rörelse (${(ib + move).toFixed(2)}) ≠ UB (${ub.toFixed(2)}).`,
        context: { accountNumber: acc, ib, movement: move, ub },
      });
    }
  }

  // 4) Aggregate stats for preview
  let revenueAccountsCount = 0,
    costAccountsCount = 0,
    assetAccountsCount = 0,
    liabilityAccountsCount = 0;
  let totalRevenue = 0,
    totalCosts = 0,
    totalAssets = 0,
    totalLiabilities = 0;

  for (const acc of doc.accounts) {
    const cls = classifyAccountByNumber(acc.number);
    if (cls === "revenue") revenueAccountsCount++;
    else if (cls === "cost") costAccountsCount++;
    else if (cls === "asset") assetAccountsCount++;
    else if (cls === "liability") liabilityAccountsCount++;
  }
  for (const b of doc.balances.res) {
    if (b.yearIndex !== 0) continue;
    const cls = classifyAccountByNumber(b.accountNumber);
    if (cls === "revenue") totalRevenue += -b.amount; // revenue is credit-positive
    else if (cls === "cost") totalCosts += b.amount;
  }
  for (const b of doc.balances.ub) {
    if (b.yearIndex !== 0) continue;
    const cls = classifyAccountByNumber(b.accountNumber);
    if (cls === "asset") totalAssets += b.amount;
    else if (cls === "liability") totalLiabilities += -b.amount;
  }

  const ibYear0 = doc.balances.ib.filter((b) => b.yearIndex === 0);
  const resYearMinus1 = doc.balances.res.filter((b) => b.yearIndex === -1);
  const ibTotal = ibYear0.reduce((s, b) => s + b.amount, 0);
  const ubTotal = doc.balances.ub.filter((b) => b.yearIndex === 0).reduce((s, b) => s + b.amount, 0);
  const resTotal = doc.balances.res.filter((b) => b.yearIndex === 0).reduce((s, b) => s + b.amount, 0);
  const resTotalPrev = resYearMinus1.reduce((s, b) => s + b.amount, 0);

  // 5) #IB-validation (new smart messaging)
  const totalIBRows = doc.balances.ib.length;
  const hasFiscalYearPrev = (doc.header.fiscalYears ?? []).some((y) => y.index === -1);
  const hasVerifications = doc.verifications.length > 0;

  if (totalIBRows === 0) {
    if (!hasFiscalYearPrev) {
      info.push({
        severity: "info",
        code: "first_fiscal_year_no_ib",
        message: "Första räkenskapsåret enligt #RAR — inga ingående balanser förväntas.",
      });
    } else if (hasVerifications) {
      blockers.push({
        severity: "blocker",
        code: "missing_ib_export",
        message: "Filen saknar #IB-poster. Exportera SIE 4E (inkluderar ingående balanser) från Visma Net / Fortnox.",
      });
    } else {
      warnings.push({
        severity: "warning",
        code: "missing_ib",
        message: "Inga #IB-poster i filen.",
      });
    }
  } else if (ibYear0.length === 0) {
    warnings.push({
      severity: "warning",
      code: "missing_ib_year0",
      message: "#IB finns men inga rader för år 0 (innevarande räkenskapsår).",
    });
  } else {
    // IB exists for year 0 — verify balance
    if (Math.abs(ibTotal) > 1.0) {
      // Compare against previous year's net result
      if (Math.abs(ibTotal + resTotalPrev) < 1.0) {
        info.push({
          severity: "info",
          code: "ib_unbalanced_prior_result_not_transferred",
          message: `IB år 0 obalanserad med ${ibTotal.toFixed(2)} kr — matchar föregående års resultat. Bokförs automatiskt mot 2099 vid import.`,
          context: { ibTotal, resTotalPrev },
        });
      } else {
        // Identify which account classes contribute
        const classBuckets: Record<string, number> = { asset: 0, liability: 0, revenue: 0, cost: 0, other: 0 };
        for (const b of ibYear0) classBuckets[classifyAccountByNumber(b.accountNumber)] += b.amount;
        const breakdown = Object.entries(classBuckets)
          .filter(([, v]) => Math.abs(v) > 0.5)
          .map(([k, v]) => `${k}: ${v.toFixed(2)}`)
          .join(", ");
        warnings.push({
          severity: "warning",
          code: "ib_unbalanced",
          message: `IB år 0 obalanserad med ${ibTotal.toFixed(2)} kr (föregående resultat ${resTotalPrev.toFixed(2)} kr matchar ej). Kontoklasser: ${breakdown}.`,
          context: { ibTotal, resTotalPrev, classBuckets },
        });
      }
    }
  }

  // Encoding warning
  if (doc.encoding === "unknown") {
    warnings.push({
      severity: "warning",
      code: "encoding_unknown",
      message: "Filens teckenkodning kunde inte bestämmas med säkerhet.",
    });
  }

  // No fiscal year
  if (!doc.header.fiscalYears || doc.header.fiscalYears.length === 0) {
    warnings.push({
      severity: "warning",
      code: "missing_fiscal_year",
      message: "Filen saknar #RAR (räkenskapsår).",
    });
  }

  return {
    blockers,
    warnings,
    info,
    stats: {
      totalAccounts: doc.accounts.length,
      totalVerifications: doc.verifications.length,
      totalTransactions,
      unbalancedVerifications: unbalanced,
      ibTotal,
      ubTotal,
      resTotal,
      revenueAccountsCount,
      costAccountsCount,
      assetAccountsCount,
      liabilityAccountsCount,
      totalRevenue,
      totalCosts,
      totalAssets,
      totalLiabilities,
    },
  };
}
