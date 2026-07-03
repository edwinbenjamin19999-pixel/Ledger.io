/**
 * Centralized Swedish Accounting Compliance Engine
 * 
 * Runs all BFL/BAS/ÅRL/Skatteverket checks before a journal entry is posted.
 * Replaces scattered client-side validation with a single entry point.
 */

import { supabase } from '@/integrations/supabase/client';
import { ACCOUNT_RANGES, VALID_VAT_RATES, BookkeepingValidator } from './validators/bookkeeping';

// ─── Types ────────────────────────────────────────────────────

export interface ComplianceError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  category: 'balance' | 'account' | 'vat' | 'period' | 'field' | 'direction';
}

export interface ComplianceResult {
  valid: boolean;
  errors: ComplianceError[];
  warnings: ComplianceError[];
}

export interface ComplianceLineInput {
  accountNumber: string;
  debit: number;
  credit: number;
  vatCode?: string | null;
  vatAmount?: number | null;
  description?: string;
}

export interface ComplianceEntryInput {
  companyId: string;
  entryDate: string;
  description: string;
  documentReference?: string | null;
  lines: ComplianceLineInput[];
}

// ─── VAT account class mapping ────────────────────────────────

const ACCOUNT_CLASS_VAT: Record<string, number[]> = {
  // Revenue accounts (3xxx) — typically 25%, 12%, 6% or 0%
  '3': [0, 6, 12, 25],
  // Cost accounts (4xxx-6xxx) — typically 25%, 12%, 6% or 0%
  '4': [0, 6, 12, 25],
  '5': [0, 6, 12, 25],
  '6': [0, 6, 12, 25],
  // Personnel (7xxx) — normally no VAT
  '7': [0],
  // Financial (8xxx) — normally no VAT
  '8': [0],
};

// ─── Direction expectations (normal balance) ──────────────────

function getExpectedDirection(accountNum: number): 'debit' | 'credit' | 'either' {
  if (accountNum >= 1000 && accountNum <= 1999) return 'debit';   // Assets: normally debit
  if (accountNum >= 2000 && accountNum <= 2999) return 'credit';  // Liabilities/equity: normally credit
  if (accountNum >= 3000 && accountNum <= 3999) return 'credit';  // Revenue: normally credit
  if (accountNum >= 4000 && accountNum <= 7999) return 'debit';   // Costs: normally debit
  if (accountNum >= 8000 && accountNum <= 8999) return 'either';  // Financial: can go either way
  return 'either';
}

// ─── Main compliance validation ───────────────────────────────

export async function validateCompliance(
  input: ComplianceEntryInput
): Promise<ComplianceResult> {
  const errors: ComplianceError[] = [];
  const warnings: ComplianceError[] = [];

  // ── 1. Required fields (BFL) ────────────────────────────────
  if (!input.entryDate) {
    errors.push({ code: 'MISSING_DATE', message: 'Datum saknas (krav enligt BFL)', severity: 'error', category: 'field' });
  }
  if (!input.description?.trim()) {
    errors.push({ code: 'MISSING_DESC', message: 'Beskrivning saknas (krav enligt BFL)', severity: 'error', category: 'field' });
  }
  if (input.lines.length < 2) {
    errors.push({ code: 'MIN_LINES', message: 'Minst 2 konteringsrader krävs', severity: 'error', category: 'balance' });
  }

  // ── 2. Debit = Credit ──────────────────────────────────────
  const totalDebit = input.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = input.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);

  if (diff > 0.01) {
    errors.push({
      code: 'IMBALANCE',
      message: `Debet (${totalDebit.toFixed(2)}) ≠ Kredit (${totalCredit.toFixed(2)}). Differens: ${diff.toFixed(2)} kr`,
      severity: 'error',
      category: 'balance',
    });
  }

  // ── 3. Validate each line ──────────────────────────────────
  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    const lineNum = i + 1;
    const accountNum = parseInt(line.accountNumber);

    // Account number validity
    if (isNaN(accountNum) || accountNum < 1000 || accountNum > 8999) {
      errors.push({
        code: 'INVALID_ACCOUNT',
        message: `Rad ${lineNum}: Ogiltigt kontonummer "${line.accountNumber}" (BAS 2026: 1000–8999)`,
        severity: 'error',
        category: 'account',
      });
      continue;
    }

    // No amount
    if ((line.debit || 0) === 0 && (line.credit || 0) === 0) {
      errors.push({
        code: 'ZERO_AMOUNT',
        message: `Rad ${lineNum}: Saknar belopp`,
        severity: 'error',
        category: 'field',
      });
    }

    // Both debit and credit on same line
    if ((line.debit || 0) > 0 && (line.credit || 0) > 0) {
      warnings.push({
        code: 'DUAL_AMOUNT',
        message: `Rad ${lineNum}: Har både debet och kredit — normalt en per rad`,
        severity: 'warning',
        category: 'balance',
      });
    }

    // Negative amounts
    if ((line.debit || 0) < 0 || (line.credit || 0) < 0) {
      errors.push({
        code: 'NEGATIVE_AMOUNT',
        message: `Rad ${lineNum}: Negativa belopp ej tillåtna`,
        severity: 'error',
        category: 'field',
      });
    }

    // ── 3a. VAT validation ───────────────────────────────────
    if (line.vatCode && line.vatCode !== '0' && line.vatCode !== 'none' && line.vatCode !== '') {
      const vatRate = parseInt(line.vatCode);
      if (!VALID_VAT_RATES.includes(vatRate)) {
        errors.push({
          code: 'INVALID_VAT_RATE',
          message: `Rad ${lineNum}: Ogiltig momssats ${line.vatCode}%. Giltiga: 0%, 6%, 12%, 25%`,
          severity: 'error',
          category: 'vat',
        });
      } else {
        // Check VAT is allowed for this account class
        const accountClass = line.accountNumber.charAt(0);
        const allowedRates = ACCOUNT_CLASS_VAT[accountClass];
        if (allowedRates && !allowedRates.includes(vatRate)) {
          warnings.push({
            code: 'VAT_CLASS_MISMATCH',
            message: `Rad ${lineNum}: Konto ${line.accountNumber} (klass ${accountClass}) har normalt inte ${vatRate}% moms`,
            severity: 'warning',
            category: 'vat',
          });
        }

        // Validate VAT amount if provided
        if (line.vatAmount && line.vatAmount > 0) {
          const grossAmount = Math.max(line.debit || 0, line.credit || 0);
          if (grossAmount > 0) {
            const expectedVatGross = BookkeepingValidator.vatFromGross(grossAmount, vatRate);
            const expectedVatNet = BookkeepingValidator.vatFromNet(grossAmount, vatRate);
            const diffGross = Math.abs(expectedVatGross - line.vatAmount);
            const diffNet = Math.abs(expectedVatNet - line.vatAmount);

            if (diffGross > 2 && diffNet > 2) {
              errors.push({
                code: 'VAT_AMOUNT_WRONG',
                message: `Rad ${lineNum}: Momsbelopp ${line.vatAmount} kr avviker från förväntat (${expectedVatGross} kr brutto / ${expectedVatNet} kr netto) vid ${vatRate}%`,
                severity: 'error',
                category: 'vat',
              });
            }
          }
        }
      }
    }

    // ── 3b. Direction check (informational) ──────────────────
    const expectedDir = getExpectedDirection(accountNum);
    const actualDir = (line.debit || 0) > 0 ? 'debit' : 'credit';

    if (expectedDir !== 'either' && expectedDir !== actualDir) {
      // This is a warning, not error — many valid cases exist (refunds, corrections)
      warnings.push({
        code: 'UNUSUAL_DIRECTION',
        message: `Rad ${lineNum}: Konto ${line.accountNumber} bokförs normalt i ${expectedDir === 'debit' ? 'debet' : 'kredit'} — kontrollera`,
        severity: 'warning',
        category: 'direction',
      });
    }
  }

  // ── 4. Period check ────────────────────────────────────────
  if (input.entryDate && input.companyId) {
    try {
      const date = new Date(input.entryDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const { data: period } = await supabase
        .from('accounting_periods')
        .select('status')
        .eq('company_id', input.companyId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (period?.status === 'locked' || period?.status === 'archived') {
        errors.push({
          code: 'PERIOD_LOCKED',
          message: `Perioden ${year}-${String(month).padStart(2, '0')} är låst. Öppna perioden innan du bokför.`,
          severity: 'error',
          category: 'period',
        });
      }
    } catch {
      // Period table may not exist — skip
    }
  }

  // ── 5. Account existence check ─────────────────────────────
  if (input.companyId && input.lines.length > 0) {
    try {
      const accountNumbers = [...new Set(input.lines.map(l => l.accountNumber).filter(Boolean))];
      const { data: existingAccounts } = await supabase
        .from('chart_of_accounts')
        .select('account_number')
        .eq('company_id', input.companyId)
        .in('account_number', accountNumbers);

      const existing = new Set((existingAccounts || []).map(a => a.account_number));
      for (const acctNum of accountNumbers) {
        if (!existing.has(acctNum)) {
          warnings.push({
            code: 'ACCOUNT_NOT_IN_PLAN',
            message: `Konto ${acctNum} finns inte i bolagets kontoplan — importera BAS 2026 eller skapa kontot`,
            severity: 'warning',
            category: 'account',
          });
        }
      }
    } catch {
      // Skip if chart_of_accounts unavailable
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Quick pre-commit check (synchronous, no DB) ─────────────

export function validateComplianceSync(lines: ComplianceLineInput[]): ComplianceResult {
  const errors: ComplianceError[] = [];
  const warnings: ComplianceError[] = [];

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);

  if (lines.length < 2) {
    errors.push({ code: 'MIN_LINES', message: 'Minst 2 konteringsrader krävs', severity: 'error', category: 'balance' });
  }

  if (diff > 0.01) {
    errors.push({
      code: 'IMBALANCE',
      message: `Ej balanserat: debet ${totalDebit.toFixed(2)} ≠ kredit ${totalCredit.toFixed(2)} (diff: ${diff.toFixed(2)} kr)`,
      severity: 'error',
      category: 'balance',
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const accountNum = parseInt(line.accountNumber);

    if (isNaN(accountNum) || accountNum < 1000 || accountNum > 8999) {
      errors.push({ code: 'INVALID_ACCOUNT', message: `Rad ${lineNum}: Ogiltigt kontonummer "${line.accountNumber}"`, severity: 'error', category: 'account' });
    }

    if ((line.debit || 0) === 0 && (line.credit || 0) === 0) {
      errors.push({ code: 'ZERO_AMOUNT', message: `Rad ${lineNum}: Saknar belopp`, severity: 'error', category: 'field' });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
