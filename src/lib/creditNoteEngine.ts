/**
 * Section 11 — Credit Notes, Part Payments, and Currency Differences
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Credit Notes (Kreditnotor) ──────────────────────────────

export interface CreditNoteResult {
  success: boolean;
  journalEntryId?: string;
  error?: string;
}

/**
 * Creates a credit note reversal entry linked to the original invoice.
 * Reverses the original journal entry with negative amounts on the same accounts.
 */
export async function createCreditNote(
  originalInvoiceId: string,
  companyId: string,
  userId: string,
  creditAmount?: number // If partial credit note, otherwise full reversal
): Promise<CreditNoteResult> {
  try {
    // Find the journal entry linked to the original invoice
    const { data: originalEntry } = await supabase
      .from('journal_entries')
      .select('id, description')
      .eq('company_id', companyId)
      .eq('document_id', originalInvoiceId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (!originalEntry) {
      return { success: false, error: 'Kunde inte hitta originalverifikationen för fakturan.' };
    }

    // Fetch original lines
    const { data: originalLines, error: fetchErr } = await supabase
      .from('journal_entry_lines')
      .select('debit, credit, account_id, vat_code, vat_amount')
      .eq('journal_entry_id', originalEntry.id);

    if (fetchErr || !originalLines?.length) {
      return { success: false, error: 'Originalverifikation saknar konteringsrader.' };
    }

    // Calculate scale factor for partial credit notes
    const originalTotal = originalLines.reduce((s, l) => s + (l.debit || 0), 0);
    const scale = creditAmount && originalTotal > 0 ? creditAmount / originalTotal : 1;

    // Create reversal entry
    const { data: reversal, error: revErr } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_date: new Date().toISOString().split('T')[0],
        description: `Kreditnota — reversal av ${originalEntry.description || originalEntry.id}`,
        status: 'draft',
        created_by: userId,
      })
      .select('id, journal_number')
      .maybeSingle();

    if (revErr) throw revErr;

    // Reversed lines (swap debit/credit, apply scale)
    const reversedLines = originalLines.map((l: any) => ({
      journal_entry_id: reversal.id,
      account_id: l.account_id,
      debit: Math.round((l.credit || 0) * scale * 100) / 100,
      credit: Math.round((l.debit || 0) * scale * 100) / 100,
      vat_code: l.vat_code,
      vat_amount: l.vat_amount ? Math.round(l.vat_amount * scale * 100) / 100 : null,
    }));

    await supabase.from('journal_entry_lines').insert(reversedLines);

    // Audit log
    await supabase.from('audit_events').insert({
      user_id: userId,
      entity_type: 'journal_entries',
      entity_id: reversal.id,
      event_type: 'CREDIT_NOTE',
      data_categories: ['financial'],
      processing_purpose: 'Kreditnota — reversal av originalfaktura',
      legal_basis: 'legal_obligation',
      new_data: { original_invoice_id: originalInvoiceId, credit_amount: creditAmount },
    });

    return { success: true, journalEntryId: reversal.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Fel vid skapande av kreditnota.' };
  }
}

// ─── Part Payments (Delbetalningar) ──────────────────────────

export interface PartPaymentResult {
  success: boolean;
  journalEntryId?: string;
  remainingBalance?: number;
  error?: string;
}

/**
 * Books a partial payment against an invoice.
 * Only the paid amount is moved from accounts receivable (1510) to bank (1930).
 */
export async function bookPartPayment(
  invoiceId: string,
  paidAmount: number,
  companyId: string,
  userId: string,
  bankAccount: string = '1930'
): Promise<PartPaymentResult> {
  try {
    if (paidAmount <= 0) {
      return { success: false, error: 'Betalningsbeloppet måste vara positivt.' };
    }

    // Get invoice info
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, total_amount, invoice_number, status')
      .eq('id', invoiceId)
      .maybeSingle();

    if (!invoice) {
      return { success: false, error: 'Fakturan hittades inte.' };
    }

    // Create payment entry
    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_date: new Date().toISOString().split('T')[0],
        description: `Delbetalning faktura ${invoice.invoice_number || invoiceId} — ${paidAmount} kr`,
        status: 'draft',
        created_by: userId,
      })
      .select('id')
      .maybeSingle();

    if (entryErr) throw entryErr;

    // Find the correct account IDs
    const { data: arAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_number', '1510')
      .limit(1)
      .maybeSingle();

    const { data: bankAcc } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_number', bankAccount)
      .limit(1)
      .maybeSingle();

    // Debit bank, credit accounts receivable
    await supabase.from('journal_entry_lines').insert([
      {
        journal_entry_id: entry.id,
        account_id: bankAcc?.id || null,
        debit: paidAmount,
        credit: 0,
      },
      {
        journal_entry_id: entry.id,
        account_id: arAccount?.id || null,
        debit: 0,
        credit: paidAmount,
      },
    ]);

    const remaining = (invoice.total_amount || 0) - paidAmount;

    return {
      success: true,
      journalEntryId: entry.id,
      remainingBalance: remaining > 0 ? remaining : 0,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Fel vid bokning av delbetalning.' };
  }
}

// ─── Currency Differences (Valutaskillnader) ─────────────────

export interface CurrencyDiffResult {
  success: boolean;
  journalEntryId?: string;
  difference: number;
  error?: string;
}

/**
 * Calculates and books currency exchange rate differences.
 * Positive diff → konto 3960 (valutakursvinst)
 * Negative diff → konto 7960 (valutakursförlust)
 */
export async function bookCurrencyDifference(
  invoiceId: string,
  originalAmountSEK: number,
  settlementAmountSEK: number,
  companyId: string,
  userId: string
): Promise<CurrencyDiffResult> {
  const difference = settlementAmountSEK - originalAmountSEK;

  if (Math.abs(difference) < 0.01) {
    return { success: true, difference: 0, journalEntryId: undefined };
  }

  try {
    const isGain = difference > 0;
    const absDiff = Math.abs(difference);

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_date: new Date().toISOString().split('T')[0],
        description: `Valutakursdifferens faktura ${invoiceId}: ${isGain ? '+' : '-'}${absDiff.toFixed(2)} kr`,
        status: 'draft',
        created_by: userId,
      })
      .select('id')
      .maybeSingle();

    if (entryErr) throw entryErr;

    // Find accounts
    const gainAccount = '3960'; // Valutakursvinster
    const lossAccount = '7960'; // Valutakursförluster
    const lossAccountFallback = '4960'; // Fallback: Valutakursförluster varuinköp

    let diffAcct: { id: string } | null = null;
    const targetAccount = isGain ? gainAccount : lossAccount;
    const { data: primaryAcct } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_number', targetAccount)
      .limit(1)
      .maybeSingle();
    
    diffAcct = primaryAcct;
    
    // Fallback for loss account: try 4960 if 7960 doesn't exist
    if (!diffAcct && !isGain) {
      const { data: fallbackAcct } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('account_number', lossAccountFallback)
        .limit(1)
        .maybeSingle();
      diffAcct = fallbackAcct;
    }

    const { data: arAcct } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_number', '1510')
      .limit(1)
      .maybeSingle();

    if (isGain) {
      // Debit AR (more received), Credit gain account
      await supabase.from('journal_entry_lines').insert([
        { journal_entry_id: entry.id, account_id: arAcct?.id, debit: absDiff, credit: 0 },
        { journal_entry_id: entry.id, account_id: diffAcct?.id, debit: 0, credit: absDiff },
      ]);
    } else {
      // Debit loss account, Credit AR (less received)
      await supabase.from('journal_entry_lines').insert([
        { journal_entry_id: entry.id, account_id: diffAcct?.id, debit: absDiff, credit: 0 },
        { journal_entry_id: entry.id, account_id: arAcct?.id, debit: 0, credit: absDiff },
      ]);
    }

    return { success: true, journalEntryId: entry.id, difference };
  } catch (error: any) {
    return { success: false, difference, error: error?.message || 'Fel vid bokning av valutadifferens.' };
  }
}
