/**
 * Three-Step AI Bookkeeping Engine
 * Step 1: Classify transaction
 * Step 2: Resolve scenario → journal template
 * Step 3: Validate and commit
 */

import { supabase } from '@/integrations/supabase/client';
import {
  TransactionCategory,
  AccountScenario,
  JournalLine,
  DEPRECATED_ACCOUNTS,
  DIRECT_EXPENSE_LIMIT,
  getScenarioById,
  resolveScenarioFromDescription,
  getModernEquivalent,
  isDeprecatedAccount,
} from './accountMapping';
import { validateCompliance, type ComplianceEntryInput } from './complianceEngine';

// ─── Types ────────────────────────────────────────────────────

export interface TransactionInput {
  description: string;
  amount: number;            // Gross amount (incl. VAT if applicable)
  currency?: string;         // Default SEK
  counterpartName?: string;
  counterpartCountry?: string; // ISO 2-letter
  vatRate?: number;          // 0, 6, 12, 25 or undefined
  vatAmount?: number;        // Explicit VAT amount if known
  documentDate: string;      // YYYY-MM-DD
  documentId?: string;
  scenarioId?: string;       // If user explicitly picked a scenario
}

export interface BookkeepingResult {
  success: boolean;
  journalEntryId?: string;
  journalNumber?: string;
  lines?: JournalLine[];
  classification?: TransactionCategory;
  scenarioId?: string;
  warnings: string[];
  error?: string;
}

export interface ValidationError {
  code: string;
  message: string;
  blocking: boolean;
}

// ─── EU country list ──────────────────────────────────────────

const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
  'IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES',
]);

// ─── Step 1: Classification ──────────────────────────────────

export function classifyTransaction(input: TransactionInput): TransactionCategory {
  const desc = input.description.toLowerCase();
  const country = input.counterpartCountry?.toUpperCase();

  // Payroll
  if (/lön|löne|salary|payroll|nettolön/.test(desc)) return 'payroll';

  // Equity
  if (/aktieägartillskott|aktieinsättning|utdelning|eget kapital/.test(desc)) return 'equity_movement';

  // Opening balance
  if (/ingående balans|ib\s|opening balance/.test(desc)) return 'opening_balance';

  // Correction
  if (/rättelse|korrigering|correction|revers/.test(desc)) return 'correction';

  // Intercompany
  if (/koncernbidrag|koncernintern|intercompany/.test(desc)) return 'intercompany';

  // Asset
  if (/inventarie|maskin|utrustning|tillgång|dator|möbl|anläggning/.test(desc)) {
    return 'asset_purchase';
  }

  // Revenue vs cost
  const isRevenue = /faktura|intäkt|försäljning|revenue|invoice/.test(desc);

  // Export
  if (country && !EU_COUNTRIES.has(country) && country !== 'SE') {
    return isRevenue ? 'revenue_export' : 'cost_import';
  }

  // EU
  if (country && EU_COUNTRIES.has(country)) {
    if (isRevenue) {
      return /tjänst|service|konsult/.test(desc) ? 'revenue_eu_service' : 'revenue_eu_goods';
    }
    return 'cost_eu_reverse_charge';
  }

  // Domestic
  return isRevenue ? 'revenue_domestic' : 'cost_domestic';
}

// ─── Step 2: Scenario Resolution ─────────────────────────────

export function resolveScenario(input: TransactionInput): {
  scenario: AccountScenario;
  warnings: string[];
} {
  const warnings: string[] = [];

  // If user explicitly selected a scenario
  if (input.scenarioId) {
    const s = getScenarioById(input.scenarioId);
    if (s) return { scenario: s, warnings };
  }

  const isEU = input.counterpartCountry
    ? EU_COUNTRIES.has(input.counterpartCountry.toUpperCase())
    : false;
  const isExport = input.counterpartCountry
    ? !EU_COUNTRIES.has(input.counterpartCountry.toUpperCase()) && input.counterpartCountry.toUpperCase() !== 'SE'
    : false;

  const scenario = resolveScenarioFromDescription(input.description, input.amount, {
    vatRate: input.vatRate,
    isEU,
    isExport,
  });

  if (!scenario) {
    // Fallback to generic domestic cost
    const fallback = getScenarioById('COST_GOODS_SE_25')!;
    warnings.push('Kunde inte automatiskt klassificera transaktionen — använder generellt inköpskonto.');
    return { scenario: fallback, warnings };
  }

  // Asset threshold check
  if (scenario.category === 'asset_purchase') {
    const netAmount = input.vatRate
      ? input.amount - Math.round(input.amount * input.vatRate / (100 + input.vatRate))
      : input.amount;
    if (netAmount > DIRECT_EXPENSE_LIMIT && scenario.id === 'ASSET_PURCHASE_DIRECT_EXPENSE') {
      const correct = getScenarioById('ASSET_PURCHASE_CAPITALIZE')!;
      warnings.push(`Beloppet ${netAmount} kr överstiger gränsen ${DIRECT_EXPENSE_LIMIT} kr — inventarien aktiveras istället för direktavdrag.`);
      return { scenario: correct, warnings };
    }
  }

  return { scenario, warnings };
}

// ─── Step 3: Validate ─────────────────────────────────────────

export function validateJournalLines(lines: JournalLine[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // (a) Debit = Credit
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    errors.push({
      code: 'BALANCE_ERROR',
      message: `Debet (${totalDebit.toFixed(2)}) ≠ Kredit (${totalCredit.toFixed(2)}). Differens: ${Math.abs(totalDebit - totalCredit).toFixed(2)} kr.`,
      blocking: true,
    });
  }

  // (b) No deprecated accounts
  for (const line of lines) {
    if (isDeprecatedAccount(line.accountNumber)) {
      const modern = getModernEquivalent(line.accountNumber);
      errors.push({
        code: 'DEPRECATED_ACCOUNT',
        message: `Konto ${line.accountNumber} är utgånget. ${modern ? `Använd ${modern.modern} (${modern.label}) istället.` : 'Kontrollera kontoplanen.'}`,
        blocking: true,
      });
    }
  }

  // (e) VAT consistency
  for (const line of lines) {
    if (line.vatCode && line.vatAmount != null && line.vatAmount > 0) {
      const rate = parseFloat(line.vatCode);
      if (!isNaN(rate) && rate > 0) {
        const baseAmount = Math.max(line.debit, line.credit);
        if (baseAmount > 0) {
          const expectedGross = Math.round(baseAmount * rate / (100 + rate));
          const expectedNet = Math.round(baseAmount * rate / 100);
          if (Math.abs(line.vatAmount - expectedGross) > 1 && Math.abs(line.vatAmount - expectedNet) > 1) {
            errors.push({
              code: 'VAT_MISMATCH',
              message: `Momsbelopp ${line.vatAmount} kr på konto ${line.accountNumber} avviker från förväntat belopp för ${rate}% moms.`,
              blocking: false,
            });
          }
        }
      }
    }
  }

  return errors;
}

// ─── Period check ─────────────────────────────────────────────

export async function checkPeriodOpen(companyId: string, entryDate: string): Promise<{ open: boolean; error?: string }> {
  // accounting_periods table may not exist yet — treat all periods as open until migration runs
  try {
    const date = new Date(entryDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const { data: period, error } = await supabase
      .from('accounting_periods')
      .select('status')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (error || !period) return { open: true };

    if (period.status === 'locked' || period.status === 'archived') {
      return {
        open: false,
        error: `Perioden ${year}-${String(month).padStart(2, '0')} är låst. Öppna perioden i Inställningar innan du bokför.`,
      };
    }
  } catch {
    // Table doesn't exist yet — all periods are open
  }

  return { open: true };
}

// ─── Full pipeline: classify → resolve → validate → commit ───

export async function processTransaction(
  input: TransactionInput,
  companyId: string,
  userId: string
): Promise<BookkeepingResult> {
  const warnings: string[] = [];

  try {
    // Step 1: Classify
    const classification = classifyTransaction(input);

    // Step 2: Resolve scenario
    const { scenario, warnings: resolveWarnings } = resolveScenario(input);
    warnings.push(...resolveWarnings);

    // Generate journal lines
    const lines = scenario.lines(input.amount, input.vatAmount);

    // Step 3a: Validate lines
    const validationErrors = validateJournalLines(lines);
    const blockingErrors = validationErrors.filter(e => e.blocking);

    if (blockingErrors.length > 0) {
      return {
        success: false,
        classification,
        scenarioId: scenario.id,
        warnings,
        lines,
        error: blockingErrors.map(e => e.message).join(' '),
      };
    }

    // Non-blocking warnings
    for (const w of validationErrors.filter(e => !e.blocking)) {
      warnings.push(w.message);
    }

    // Step 3b: Compliance engine check (BFL/BAS/VAT/period)
    const complianceInput: ComplianceEntryInput = {
      companyId,
      entryDate: input.documentDate,
      description: input.description,
      documentReference: input.documentId || null,
      lines: lines.map(l => ({
        accountNumber: l.accountNumber,
        debit: l.debit,
        credit: l.credit,
        vatCode: l.vatCode || null,
        vatAmount: l.vatAmount || null,
      })),
    };

    const compliance = await validateCompliance(complianceInput);
    if (!compliance.valid) {
      return {
        success: false,
        classification,
        scenarioId: scenario.id,
        warnings: [...warnings, ...compliance.warnings.map(w => w.message)],
        lines,
        error: compliance.errors.map(e => e.message).join(' | '),
      };
    }

    // Add compliance warnings
    for (const w of compliance.warnings) {
      warnings.push(w.message);
    }

    // Step 3c: Commit — create journal entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_date: input.documentDate,
        description: input.description,
        status: 'draft',
        created_by: userId,
        document_id: input.documentId || null,
      })
      .select('id, journal_number')
      .maybeSingle();

    if (entryError) throw entryError;

    // Resolve account_ids from chart_of_accounts
    const accountNumbers = lines.map(l => l.accountNumber).filter(Boolean);
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number')
      .eq('company_id', companyId)
      .in('account_number', accountNumbers);

    const accountMap = new Map<string, string>();
    for (const a of accounts || []) {
      accountMap.set(a.account_number, a.id);
    }

    // Insert lines
    const lineInserts = lines.map(line => ({
      journal_entry_id: entry.id,
      account_id: accountMap.get(line.accountNumber) || null,
      debit: line.debit,
      credit: line.credit,
      vat_code: line.vatCode || null,
      vat_amount: line.vatAmount || null,
    }));

    // Warn if any accounts couldn't be resolved
    const unresolved = lines.filter(l => l.accountNumber && !accountMap.has(l.accountNumber));
    if (unresolved.length > 0) {
      warnings.push(`Konton utan matchning i kontoplanen: ${unresolved.map(l => l.accountNumber).join(', ')}. Kontrollera att kontoplanen är uppdaterad.`);
    }

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lineInserts);

    if (linesError) throw linesError;

    // Audit log
    await supabase.from('audit_events').insert({
      user_id: userId,
      entity_type: 'journal_entries',
      entity_id: entry.id,
      event_type: 'CREATE_ENTRY',
      data_categories: ['financial'],
      processing_purpose: 'Automatisk bokföring via AI-motor',
      legal_basis: 'legal_obligation',
    });

    return {
      success: true,
      journalEntryId: entry.id,
      journalNumber: entry.journal_number,
      classification,
      scenarioId: scenario.id,
      lines,
      warnings,
    };
  } catch (error: any) {
    return {
      success: false,
      warnings,
      error: error?.message || 'Ett oväntat fel uppstod vid bokföring.',
    };
  }
}

// ─── Correction entry (never overwrite original) ──────────────

export async function createCorrectionEntry(
  originalEntryId: string,
  companyId: string,
  userId: string,
  newLines?: JournalLine[]
): Promise<BookkeepingResult> {
  try {
    // Fetch original lines
    const { data: originalLines, error: fetchError } = await supabase
      .from('journal_entry_lines')
      .select('debit, credit, vat_code, vat_amount, account_id')
      .eq('journal_entry_id', originalEntryId);

    if (fetchError) throw fetchError;
    if (!originalLines?.length) throw new Error('Originalverifikation saknar konteringsrader.');

    // Create reversal entry (swap debit/credit)
    const { data: reversal, error: reversalError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_date: new Date().toISOString().split('T')[0],
        description: `Rättelse av verifikat — original: ${originalEntryId}`,
        status: 'draft',
        created_by: userId,
      })
      .select('id, journal_number')
      .maybeSingle();

    if (reversalError) throw reversalError;

    // Insert reversed lines
    const reversedLines = originalLines.map((l: any) => ({
      journal_entry_id: reversal.id,
      account_id: l.account_id,
      debit: l.credit,       // Swap
      credit: l.debit,       // Swap
      vat_code: l.vat_code,
      vat_amount: l.vat_amount,
    }));

    await supabase.from('journal_entry_lines').insert(reversedLines);

    // Audit
    await supabase.from('audit_events').insert({
      user_id: userId,
      entity_type: 'journal_entries',
      entity_id: reversal.id,
      event_type: 'CORRECTION_ENTRY',
      data_categories: ['financial'],
      processing_purpose: 'Rättelse av felaktig bokföring',
      legal_basis: 'legal_obligation',
      new_data: { original_entry_id: originalEntryId },
    });

    // If new lines provided, create the corrected entry too
    let correctedEntryId: string | undefined;
    if (newLines?.length) {
      const validationErrors = validateJournalLines(newLines);
      const blocking = validationErrors.filter(e => e.blocking);
      if (blocking.length > 0) {
        return {
          success: false,
          journalEntryId: reversal.id,
          warnings: [],
          error: `Rättelseverifikatet skapades men den nya bokföringen har fel: ${blocking.map(e => e.message).join(' ')}`,
        };
      }

      const { data: corrected, error: corrError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_date: new Date().toISOString().split('T')[0],
          description: `Korrigerad bokföring (ersätter verifikat ${originalEntryId})`,
          status: 'draft',
          created_by: userId,
        })
        .select('id')
        .maybeSingle();

      if (corrError) throw corrError;
      correctedEntryId = corrected.id;

      // Resolve account_ids for correction lines
      const corrAccountNumbers = newLines.map(l => l.accountNumber).filter(Boolean);
      const { data: corrAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number')
        .eq('company_id', companyId)
        .in('account_number', corrAccountNumbers);

      const corrAccountMap = new Map<string, string>();
      for (const a of corrAccounts || []) {
        corrAccountMap.set(a.account_number, a.id);
      }

      const corrLines = newLines.map(l => ({
        journal_entry_id: corrected.id,
        account_id: corrAccountMap.get(l.accountNumber) || null,
        debit: l.debit,
        credit: l.credit,
        vat_code: l.vatCode || null,
        vat_amount: l.vatAmount || null,
      }));

      await supabase.from('journal_entry_lines').insert(corrLines);
    }

    return {
      success: true,
      journalEntryId: reversal.id,
      warnings: [],
    };
  } catch (error: any) {
    return {
      success: false,
      warnings: [],
      error: error?.message || 'Fel vid skapande av rättelseverifikat.',
    };
  }
}
