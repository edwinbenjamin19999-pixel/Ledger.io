/**
 * Financial Guard — unified double-check layer för all financial operations.
 * Ensures correctness before any data is finalized (bookkeeping, AGI, payroll, annual report).
 */

import { EMPLOYER_SOCIAL_FEES_RATE, VALID_VAT_RATES } from "./tax-calculations";
import { BookkeepingValidator, VAT_CODES } from "./bookkeeping";

// ─── Types ────────────────────────────────────────────────────────────

export interface GuardResult {
  passed: boolean;
  checks: GuardCheck[];
  summary: string;
}

export interface GuardCheck {
  name: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
}

// ─── Journal Entry Guard ──────────────────────────────────────────────

export interface JournalEntryForGuard {
  description: string;
  entry_date: string;
  lines: {
    account_number: string;
    debit: number;
    credit: number;
    vat_code?: string | null;
    vat_amount?: number;
  }[];
}

export function guardJournalEntry(entry: JournalEntryForGuard): GuardResult {
  const checks: GuardCheck[] = [];

  // 1. Balance check
  const totalDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  checks.push({
    name: "Balans debet/kredit",
    passed: diff <= 0.01,
    severity: "error",
    message: diff <= 0.01
      ? `Balanserat: ${totalDebit.toFixed(2)} kr`
      : `Obalanserat: debet ${totalDebit.toFixed(2)} ≠ kredit ${totalCredit.toFixed(2)} (diff ${diff.toFixed(2)})`,
  });

  // 2. Minimum 2 lines
  checks.push({
    name: "Minst 2 rader",
    passed: entry.lines.length >= 2,
    severity: "error",
    message: entry.lines.length >= 2 ? `${entry.lines.length} rader` : "Mindre än 2 rader",
  });

  // 3. No zero-amount lines
  const zeroLines = entry.lines.filter(l => (l.debit || 0) === 0 && (l.credit || 0) === 0);
  checks.push({
    name: "Inga tomma rader",
    passed: zeroLines.length === 0,
    severity: "error",
    message: zeroLines.length === 0 ? "OK" : `${zeroLines.length} rad(er) saknar belopp`,
  });

  // 4. Valid account numbers (1000-8999)
  const invalidAccounts = entry.lines.filter(l => {
    const n = parseInt(l.account_number);
    return isNaN(n) || n < 1000 || n > 8999;
  });
  checks.push({
    name: "Giltiga kontonummer",
    passed: invalidAccounts.length === 0,
    severity: "error",
    message: invalidAccounts.length === 0
      ? "Alla konton inom 1000–8999"
      : `Ogiltiga konton: ${invalidAccounts.map(l => l.account_number).join(", ")}`,
  });

  // 5. VAT consistency
  const vatLines = entry.lines.filter(l => l.vat_code && l.vat_code !== "0" && l.vat_code !== "none");
  for (const line of vatLines) {
    const rate = parseFloat(line.vat_code!);
    if (![6, 12, 25].includes(rate)) {
      checks.push({
        name: `Momssats rad ${line.account_number}`,
        passed: false,
        severity: "error",
        message: `Ogiltig momssats: ${rate}%`,
      });
      continue;
    }
    const amount = line.debit || line.credit || 0;
    // Determine if net or gross basis based on account class
    // Class 4-8 (costs/expenses) typically use net basis, class 1-3 use gross basis
    const acctClass = line.account_number.charAt(0);
    const isNetBasis = ['4', '5', '6', '7', '8'].includes(acctClass);
    const expectedVatGross = Math.round((amount * rate) / (100 + rate));
    const expectedVatNet = Math.round((amount * rate) / 100);
    const expectedVat = isNetBasis ? expectedVatNet : expectedVatGross;
    const actualVat = line.vat_amount || 0;
    // Accept either calculation method for flexibility
    const vatOk = Math.abs(expectedVatGross - actualVat) <= 1 || Math.abs(expectedVatNet - actualVat) <= 1;
    checks.push({
      name: `Moms ${rate}% konto ${line.account_number}`,
      passed: vatOk,
      severity: vatOk ? "info" : "error",
      message: vatOk
        ? `Moms ${actualVat} kr korrekt`
        : `Förväntat ${expectedVat} kr, angivet ${actualVat} kr`,
    });
  }

  // 6. VAT account present when VAT lines exist
  if (vatLines.length > 0) {
    const hasVatAccount = entry.lines.some(l => l.account_number.startsWith("26"));
    checks.push({
      name: "Momskonto (26xx) finns",
      passed: hasVatAccount,
      severity: hasVatAccount ? "info" : "warning",
      message: hasVatAccount ? "Momskonto inkluderat" : "Momskonto (26xx) saknas — kontrollera",
    });
  }

  // 7. No negative amounts
  const negLines = entry.lines.filter(l => (l.debit || 0) < 0 || (l.credit || 0) < 0);
  checks.push({
    name: "Inga negativa belopp",
    passed: negLines.length === 0,
    severity: "error",
    message: negLines.length === 0 ? "OK" : `${negLines.length} rad(er) med negativt belopp`,
  });

  // 8. Date sanity
  const d = new Date(entry.entry_date);
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
  const dateOk = d >= twoYearsAgo && d <= now;
  checks.push({
    name: "Rimligt datum",
    passed: dateOk,
    severity: dateOk ? "info" : "warning",
    message: dateOk ? `Datum ${entry.entry_date}` : `Datum ${entry.entry_date} verkar ovanligt`,
  });

  const errors = checks.filter(c => !c.passed && c.severity === "error");
  const warnings = checks.filter(c => !c.passed && c.severity === "warning");

  return {
    passed: errors.length === 0,
    checks,
    summary: errors.length === 0
      ? warnings.length > 0
        ? `✅ Godkänd med ${warnings.length} varning(ar)`
        : "✅ Alla kontroller godkända"
      : `❌ ${errors.length} fel hittade`,
  };
}

// ─── Payroll Guard ────────────────────────────────────────────────────

export interface PayrollLineForGuard {
  employee_name: string;
  gross_salary: number;
  tax_deduction: number;
  net_salary: number;
  employer_contributions: number;
}

export function guardPayroll(lines: PayrollLineForGuard[]): GuardResult {
  const checks: GuardCheck[] = [];

  // 1. At least one employee
  checks.push({
    name: "Minst en anställd",
    passed: lines.length > 0,
    severity: "error",
    message: lines.length > 0 ? `${lines.length} anställda` : "Inga lönerader",
  });

  for (const line of lines) {
    const prefix = line.employee_name || "Okänd";

    // 2. Net = Gross - Tax
    const expectedNet = line.gross_salary - line.tax_deduction;
    const netOk = Math.abs(expectedNet - line.net_salary) <= 1;
    checks.push({
      name: `${prefix}: Nettolön`,
      passed: netOk,
      severity: "error",
      message: netOk
        ? `${line.net_salary} kr korrekt`
        : `Förväntat ${expectedNet} kr, angivet ${line.net_salary} kr`,
    });

    // 3. Social fees ~31.42%
    const expectedFees = Math.round(line.gross_salary * EMPLOYER_SOCIAL_FEES_RATE);
    const feeDiff = Math.abs(expectedFees - line.employer_contributions);
    const feeOk = feeDiff <= Math.max(10, line.gross_salary * 0.02); // 2% tolerance or 10 kr
    checks.push({
      name: `${prefix}: Arbetsgivaravgifter`,
      passed: feeOk,
      severity: feeOk ? "info" : "warning",
      message: feeOk
        ? `${line.employer_contributions} kr (${(line.employer_contributions / line.gross_salary * 100).toFixed(1)}%)`
        : `Förväntat ~${expectedFees} kr (31.42%), angivet ${line.employer_contributions} kr`,
    });

    // 4. Tax rate sanity (10-60%)
    const taxRate = line.gross_salary > 0 ? line.tax_deduction / line.gross_salary : 0;
    const taxRateOk = taxRate >= 0.1 && taxRate <= 0.6;
    checks.push({
      name: `${prefix}: Skattesats`,
      passed: taxRateOk,
      severity: taxRateOk ? "info" : "warning",
      message: `${(taxRate * 100).toFixed(1)}%${taxRateOk ? "" : " — ovanlig skattesats"}`,
    });
  }

  const errors = checks.filter(c => !c.passed && c.severity === "error");
  return {
    passed: errors.length === 0,
    checks,
    summary: errors.length === 0 ? "✅ Lönekörning verifierad" : `❌ ${errors.length} fel i lönekörning`,
  };
}

// ─── AGI Guard ────────────────────────────────────────────────────────

export interface AGIDataForGuard {
  totalGross: number;
  totalTax: number;
  totalSocialFees: number;
  employeeCount: number;
  payrollLines: PayrollLineForGuard[];
}

export function guardAGI(data: AGIDataForGuard): GuardResult {
  const checks: GuardCheck[] = [];

  // 1. Totals match sum of lines
  const sumGross = data.payrollLines.reduce((s, l) => s + l.gross_salary, 0);
  const sumTax = data.payrollLines.reduce((s, l) => s + l.tax_deduction, 0);
  const sumFees = data.payrollLines.reduce((s, l) => s + l.employer_contributions, 0);

  checks.push({
    name: "Bruttolön stämmer",
    passed: Math.abs(sumGross - data.totalGross) <= 1,
    severity: "error",
    message: Math.abs(sumGross - data.totalGross) <= 1
      ? `${data.totalGross} kr`
      : `Summa rader ${sumGross} ≠ total ${data.totalGross}`,
  });

  checks.push({
    name: "Skatt stämmer",
    passed: Math.abs(sumTax - data.totalTax) <= 1,
    severity: "error",
    message: Math.abs(sumTax - data.totalTax) <= 1
      ? `${data.totalTax} kr`
      : `Summa rader ${sumTax} ≠ total ${data.totalTax}`,
  });

  checks.push({
    name: "Arbetsgivaravgifter stämmer",
    passed: Math.abs(sumFees - data.totalSocialFees) <= 1,
    severity: "error",
    message: Math.abs(sumFees - data.totalSocialFees) <= 1
      ? `${data.totalSocialFees} kr`
      : `Summa rader ${sumFees} ≠ total ${data.totalSocialFees}`,
  });

  checks.push({
    name: "Antal anställda",
    passed: data.employeeCount === data.payrollLines.length,
    severity: "error",
    message: data.employeeCount === data.payrollLines.length
      ? `${data.employeeCount} anställda`
      : `Angivet ${data.employeeCount}, faktiskt ${data.payrollLines.length}`,
  });

  // Run payroll guard on each line too
  const payrollResult = guardPayroll(data.payrollLines);
  checks.push(...payrollResult.checks);

  const errors = checks.filter(c => !c.passed && c.severity === "error");
  return {
    passed: errors.length === 0,
    checks,
    summary: errors.length === 0 ? "✅ AGI-data verifierad" : `❌ ${errors.length} fel i AGI`,
  };
}

// ─── Annual Report Guard ──────────────────────────────────────────────

export interface AnnualReportForGuard {
  totalAssets: number;
  totalEquityAndLiabilities: number;
  revenue: number;
  netProfit: number;
  hasUnapprovedEntries: boolean;
  hasCorporateTax: boolean;
  hasClosingEntry: boolean;
}

export function guardAnnualReport(data: AnnualReportForGuard): GuardResult {
  const checks: GuardCheck[] = [];

  // 1. Balance sheet balances
  const bsDiff = Math.abs(data.totalAssets - data.totalEquityAndLiabilities);
  checks.push({
    name: "Balansräkning balanserar",
    passed: bsDiff <= 1,
    severity: "error",
    message: bsDiff <= 1
      ? `Tillgångar = EK + Skulder (${data.totalAssets.toFixed(0)} kr)`
      : `Tillgångar ${data.totalAssets.toFixed(0)} ≠ EK+Skulder ${data.totalEquityAndLiabilities.toFixed(0)} (diff ${bsDiff.toFixed(0)})`,
  });

  // 2. No unapproved entries
  checks.push({
    name: "Alla verifikationer godkända",
    passed: !data.hasUnapprovedEntries,
    severity: "error",
    message: data.hasUnapprovedEntries
      ? "Det finns ej godkända verifikationer"
      : "Alla verifikationer godkända",
  });

  // 3. Corporate tax booked (8910)
  checks.push({
    name: "Bolagsskatt bokförd (8910)",
    passed: data.hasCorporateTax,
    severity: "warning",
    message: data.hasCorporateTax ? "Bolagsskatt bokförd" : "Bolagsskatt (8910) saknas",
  });

  // 4. Closing entry (8999)
  checks.push({
    name: "Bokslutsverifikation (8999)",
    passed: data.hasClosingEntry,
    severity: "warning",
    message: data.hasClosingEntry ? "Bokslutsverifikation finns" : "Bokslutsverifikation (8999) saknas",
  });

  // 5. Revenue sanity
  checks.push({
    name: "Intäkter registrerade",
    passed: data.revenue > 0,
    severity: "warning",
    message: data.revenue > 0 ? `Intäkter: ${data.revenue.toFixed(0)} kr` : "Inga intäkter registrerade",
  });

  const errors = checks.filter(c => !c.passed && c.severity === "error");
  return {
    passed: errors.length === 0,
    checks,
    summary: errors.length === 0 ? "✅ Bokslut verifierat" : `❌ ${errors.length} fel i bokslut`,
  };
}

// ─── VAT Declaration Guard ────────────────────────────────────────────

export interface VATDeclarationForGuard {
  sales25: number;
  sales12: number;
  sales6: number;
  outputVat25: number;
  outputVat12: number;
  outputVat6: number;
  inputVat: number;
  vatToPay: number;
}

export function guardVATDeclaration(data: VATDeclarationForGuard): GuardResult {
  const checks: GuardCheck[] = [];

  const expected25 = Math.round(data.sales25 * 0.25);
  const expected12 = Math.round(data.sales12 * 0.12);
  const expected6 = Math.round(data.sales6 * 0.06);

  const check = (name: string, expected: number, actual: number) => {
    const ok = Math.abs(expected - actual) <= 1;
    checks.push({
      name,
      passed: ok,
      severity: "error",
      message: ok ? `${actual} kr korrekt` : `Förväntat ${expected} kr, angivet ${actual} kr`,
    });
  };

  check("Utgående moms 25%", expected25, data.outputVat25);
  check("Utgående moms 12%", expected12, data.outputVat12);
  check("Utgående moms 6%", expected6, data.outputVat6);

  const expectedTotal = expected25 + expected12 + expected6;
  const expectedToPay = expectedTotal - data.inputVat;
  check("Moms att betala", expectedToPay, data.vatToPay);

  // High input VAT warning
  if (data.inputVat > expectedTotal * 2 && expectedTotal > 0) {
    checks.push({
      name: "Ingående moms ratio",
      passed: true,
      severity: "warning",
      message: `Ingående moms (${data.inputVat} kr) är ovanligt hög vs utgående (${expectedTotal} kr)`,
    });
  }

  const errors = checks.filter(c => !c.passed && c.severity === "error");
  return {
    passed: errors.length === 0,
    checks,
    summary: errors.length === 0 ? "✅ Momsdeklaration verifierad" : `❌ ${errors.length} fel i momsdeklaration`,
  };
}
