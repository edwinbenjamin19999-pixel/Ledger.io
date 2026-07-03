/**
 * Auto-book the final corporate tax as a journal entry.
 *
 * Sequence (follows the platform's ai-booking-transaction-sequence rule —
 * the enforce_journal_balance_on_approval trigger requires ≥2 balanced lines
 * BEFORE the entry can be approved):
 *
 *   1. ensure chart_of_accounts has 8910 (skattekostnad) and 2510 (skatteskuld)
 *   2. INSERT journal_entries with status='draft'
 *   3. INSERT 2 lines (debit/credit) — balanced
 *   4. UPDATE journal_entries SET status='approved'
 *
 * Cases:
 *   corporateTax > 0  →  Debit 8910 / Credit 2510   (skuld byggs upp)
 *   corporateTax < 0  →  Debit 2510 / Credit 8910   (fordran byggs upp)
 *   corporateTax = 0  →  no-op (returns null)
 */

import { supabase } from "@/integrations/supabase/client";
import { TAX_ACCOUNTS } from "./accountMappingEngine";

export interface BookFinalTaxParams {
  companyId: string;
  userId: string;
  fiscalYear: number;
  corporateTax: number;
  /** Posting date — defaults to last day of fiscal year. */
  entryDate?: string;
}

export interface BookFinalTaxResult {
  journalEntryId: string;
  journalNumber: string | null;
  amount: number;
  direction: "payable" | "receivable";
}

async function ensureAccount(
  companyId: string,
  accountNumber: string,
  accountName: string,
  accountType: "asset" | "liability" | "equity" | "income" | "expense",
): Promise<string> {
  const { data: existing } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_number", accountNumber)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("chart_of_accounts")
    .insert({ company_id: companyId, account_number: accountNumber, account_name: accountName, account_type: accountType })
    .select("id")
    .maybeSingle();
  if (error || !created) throw new Error(error?.message || "Kunde inte skapa kontoplan-rad");
  return created.id;
}

export async function bookFinalTax(params: BookFinalTaxParams): Promise<BookFinalTaxResult | null> {
  const { companyId, userId, fiscalYear, corporateTax } = params;
  if (Math.abs(corporateTax) < 1) return null;

  const entryDate = params.entryDate ?? `${fiscalYear}-12-31`;
  const direction: "payable" | "receivable" = corporateTax > 0 ? "payable" : "receivable";
  const amount = Math.abs(Math.round(corporateTax));

  const accExpenseId = await ensureAccount(companyId, TAX_ACCOUNTS.taxExpense, "Skatt på årets resultat", "expense");
  const accLiabilityId = await ensureAccount(companyId, TAX_ACCOUNTS.taxLiability, "Skatteskulder", "liability");

  // Step 1 — create draft entry (balance trigger only fires on approval)
  const { data: je, error: jeErr } = await supabase
    .from("journal_entries")
    .insert({
      company_id: companyId,
      entry_date: entryDate,
      description: `Slutskatt ${fiscalYear} (${direction === "payable" ? "skuld" : "fordran"})`,
      status: "draft",
      created_by: userId,
      series_code: "A",
    })
    .select("id, journal_number")
    .maybeSingle();
  if (jeErr || !je) throw new Error(jeErr?.message || "Kunde inte skapa verifikation");

  // Step 2 — insert 2 balanced lines
  const lines = direction === "payable"
    ? [
        { journal_entry_id: je.id, account_id: accExpenseId,   debit: amount, credit: 0 },
        { journal_entry_id: je.id, account_id: accLiabilityId, debit: 0,      credit: amount },
      ]
    : [
        { journal_entry_id: je.id, account_id: accLiabilityId, debit: amount, credit: 0 },
        { journal_entry_id: je.id, account_id: accExpenseId,   debit: 0,      credit: amount },
      ];

  const { error: linesErr } = await supabase.from("journal_entry_lines").insert(lines);
  if (linesErr) {
    // rollback the draft to keep ledger clean
    await supabase.from("journal_entries").delete().eq("id", je.id);
    throw new Error(linesErr.message);
  }

  // Step 3 — approve (trigger validates balance + ≥2 lines)
  const { error: approveErr } = await supabase
    .from("journal_entries")
    .update({ status: "approved", approved_by: userId })
    .eq("id", je.id);
  if (approveErr) {
    await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", je.id);
    await supabase.from("journal_entries").delete().eq("id", je.id);
    throw new Error(approveErr.message);
  }

  return { journalEntryId: je.id, journalNumber: (je as any).journal_number ?? null, amount, direction };
}
