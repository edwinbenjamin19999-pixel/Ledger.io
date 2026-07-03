import { z } from "zod";

// BAS 2026 kontoplan
export const ACCOUNT_RANGES = {
  ASSETS: { min: 1000, max: 1999, name: "Tillgångar" },
  LIABILITIES: { min: 2000, max: 2999, name: "Skulder och eget kapital" },
  INCOME: { min: 3000, max: 3999, name: "Intäkter" },
  COST_OF_GOODS: { min: 4000, max: 4999, name: "Kostnader för sålda varor" },
  OPERATING_EXPENSES: { min: 5000, max: 6999, name: "Rörelsekostnader" },
  PERSONNEL: { min: 7000, max: 7999, name: "Personal och avskrivningar" },
  FINANCIAL: { min: 8000, max: 8999, name: "Finansiella poster" },
};

export const VALID_VAT_RATES = [0, 6, 12, 25];

export const VAT_CODES = {
  "25": { rate: 25, outputAccount: "2610", inputAccount: "2640" },
  "12": { rate: 12, outputAccount: "2620", inputAccount: "2640" },
  "6": { rate: 6, outputAccount: "2630", inputAccount: "2640" },
  "0": { rate: 0, outputAccount: null, inputAccount: null },
} as const;

export interface JournalEntryValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
  vatCode?: string;
  vatAmount?: number;
  amountIncludesVat?: boolean;
}

export class BookkeepingValidator {
  /**
   * Validate a complete journal entry
   */
  static validateJournalEntry(lines: JournalLine[]): JournalEntryValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Min 2 rows
    if (lines.length < 2) {
      errors.push("Minst 2 rader krävs (debet och kredit)");
    }

    // 2. Balance check (CRITICAL)
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    const difference = Math.abs(totalDebit - totalCredit);

    if (difference > 0.01) {
      errors.push(
        `Ej balanserat: debet ${totalDebit.toFixed(2)} ≠ kredit ${totalCredit.toFixed(2)} (diff: ${difference.toFixed(2)} kr)`
      );
    }

    // 3. Validate each line
    lines.forEach((line, index) => {
      const lineResult = this.validateJournalLine(line, index + 1);
      errors.push(...lineResult.errors);
      warnings.push(...lineResult.warnings);
    });

    // 4. Check debit/credit per line
    lines.forEach((line, index) => {
      if (line.debit > 0 && line.credit > 0) {
        warnings.push(`Rad ${index + 1}: Har både debet och kredit — normalt sett en per rad`);
      }
      if (line.debit === 0 && line.credit === 0) {
        errors.push(`Rad ${index + 1}: Saknar belopp`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate a single journal line
   */
  static validateJournalLine(
    line: JournalLine,
    lineNumber: number
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Account number format
    const accountNum = parseInt(line.account);
    if (isNaN(accountNum) || accountNum < 1000 || accountNum > 8999) {
      errors.push(`Rad ${lineNumber}: Ogiltigt konto ${line.account} (1000-8999)`);
    }

    // VAT validation
    if (line.vatCode && line.vatCode !== "0" && line.vatCode !== "none") {
      const vatResult = this.validateVAT(
        line.vatCode,
        line.debit || line.credit,
        line.vatAmount || 0,
        lineNumber,
        line.amountIncludesVat ?? true // Default: assume gross amounts
      );
      errors.push(...vatResult.errors);
      warnings.push(...vatResult.warnings);
    }

    // No negative amounts
    if (line.debit < 0 || line.credit < 0) {
      errors.push(`Rad ${lineNumber}: Negativa belopp ej tillåtna`);
    }

    return { errors, warnings };
  }

  /**
   * Validate VAT calculation — supports both gross and net amounts.
   * 
   * CRITICAL FIX: Previous version always used net formula (amount * rate / 100),
   * causing incorrect VAT för gross amounts. Example: 1500 SEK inkl. moms 25%
   * → Korrekt moms: 1500 * 25 / 125 = 300 kr (INTE 375 kr).
   */
  static validateVAT(
    vatCode: string,
    amount: number,
    vatAmount: number,
    lineNumber: number,
    amountIncludesVat: boolean = true
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const vatConfig = VAT_CODES[vatCode as keyof typeof VAT_CODES];
    if (!vatConfig) {
      errors.push(`Rad ${lineNumber}: Ogiltig momskod "${vatCode}"`);
      return { errors, warnings };
    }

    if (vatConfig.rate === 0) {
      return { errors, warnings };
    }

    // Calculate expected VAT based on whether amount includes VAT or not
    const expectedVat = amountIncludesVat
      ? this.vatFromGross(amount, vatConfig.rate)
      : this.vatFromNet(amount, vatConfig.rate);

    const vatDifference = Math.abs(expectedVat - vatAmount);

    if (vatDifference > 1) {
      const netAmount = amountIncludesVat ? amount - expectedVat : amount;
      errors.push(
        `Rad ${lineNumber}: Moms ${vatConfig.rate}% fel. ` +
        `Belopp ${amount.toFixed(0)} kr ${amountIncludesVat ? '(inkl. moms)' : '(exkl. moms)'} → ` +
        `netto ${netAmount.toFixed(0)} + moms ${expectedVat.toFixed(0)} kr ` +
        `(angivet: ${vatAmount.toFixed(0)} kr)`
      );
    } else if (vatDifference > 0.01) {
      warnings.push(`Rad ${lineNumber}: Öresavrundning i moms (${vatDifference.toFixed(2)} kr)`);
    }

    return { errors, warnings };
  }

  /**
   * Calculate VAT from gross amount (inkl. moms)
   * Formula: gross * rate / (100 + rate)
   * Example: 1500 * 25 / 125 = 300
   */
  static vatFromGross(grossAmount: number, vatRate: number): number {
    return Math.round((grossAmount * vatRate) / (100 + vatRate));
  }

  /**
   * Calculate VAT from net amount (exkl. moms)
   * Formula: net * rate / 100
   * Example: 1200 * 25 / 100 = 300
   */
  static vatFromNet(netAmount: number, vatRate: number): number {
    return Math.round((netAmount * vatRate) / 100);
  }

  /**
   * Extract net and VAT from a gross amount
   * Returns { net, vat, gross } för transparency
   */
  static splitGrossAmount(grossAmount: number, vatRate: number): {
    gross: number;
    net: number;
    vat: number;
    vatRate: number;
  } {
    const vat = this.vatFromGross(grossAmount, vatRate);
    return {
      gross: grossAmount,
      net: grossAmount - vat,
      vat,
      vatRate,
    };
  }

  /**
   * Validate account against BAS 2026
   */
  static validateAccount(
    accountNumber: string,
    accountType: "asset" | "liability" | "equity" | "income" | "expense"
  ): { isValid: boolean; message?: string } {
    const accountNum = parseInt(accountNumber);
    if (isNaN(accountNum)) {
      return { isValid: false, message: "Ogiltigt kontonummer" };
    }

    const typeRangeMap: Record<string, typeof ACCOUNT_RANGES[keyof typeof ACCOUNT_RANGES][]> = {
      asset: [ACCOUNT_RANGES.ASSETS],
      liability: [ACCOUNT_RANGES.LIABILITIES],
      equity: [ACCOUNT_RANGES.LIABILITIES],
      income: [ACCOUNT_RANGES.INCOME],
      expense: [
        ACCOUNT_RANGES.COST_OF_GOODS,
        ACCOUNT_RANGES.OPERATING_EXPENSES,
        ACCOUNT_RANGES.PERSONNEL,
        ACCOUNT_RANGES.FINANCIAL,
      ],
    };

    const validRanges = typeRangeMap[accountType];
    if (!validRanges) {
      return { isValid: false, message: "Ogiltig kontotyp" };
    }

    const isInRange = validRanges.some(
      (range) => accountNum >= range.min && accountNum <= range.max
    );

    if (!isInRange) {
      return {
        isValid: false,
        message: `Konto ${accountNumber} matchar inte kontotyp "${accountType}"`,
      };
    }

    return { isValid: true };
  }

  /**
   * Calculate VAT amount (backwards compat)
   */
  static calculateVAT(amount: number, vatRate: number): number {
    if (!VALID_VAT_RATES.includes(vatRate)) {
      throw new Error(`Ogiltig momssats: ${vatRate}%`);
    }
    return this.vatFromNet(amount, vatRate);
  }

  /**
   * Check if date is within fiscal year
   */
  static isDateInFiscalYear(
    date: Date,
    fiscalYearStart: number,
    referenceDate: Date = new Date()
  ): boolean {
    const year = referenceDate.getFullYear();
    const fiscalStart = new Date(year, fiscalYearStart - 1, 1);
    const fiscalEnd = new Date(year + 1, fiscalYearStart - 1, 0);
    return date >= fiscalStart && date <= fiscalEnd;
  }
}
