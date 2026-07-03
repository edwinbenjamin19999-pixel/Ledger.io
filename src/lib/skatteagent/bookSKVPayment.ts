/**
 * Generic Skatteverket payment booking helper.
 *
 * Supports all common payment types from a Swedish company:
 *   - f_tax         → D 2518 / K 1930  (Preliminärskatt / F-skatt)
 *   - vat           → D 2650 / K 1930  (Moms — redovisningskonto)
 *   - employer_tax  → D 2731 / K 1930  (Arbetsgivaravgifter)
 *   - employee_tax  → D 2710 / K 1930  (Personalskatt)
 *   - generic       → D 1630 / K 1930  (Skattekontot, samlat uttag)
 *
 * Sequence (per ai-booking-transaction-sequence-sv):
 *   1. INSERT header status='draft'
 *   2. INSERT lines
 *   3. UPDATE header status='approved'  (balance trigger validates here)
 */

import { supabase } from "@/integrations/supabase/client";

export type SKVPaymentType =
  | "f_tax"
  | "vat"
  | "employer_tax"
  | "employee_tax"
  | "generic";

export interface BookSKVPaymentParams {
  companyId: string;
  userId: string;
  amount: number;
  /** ISO YYYY-MM-DD */
  entryDate: string;
  paymentType: SKVPaymentType;
  /** Optional reference text (OCR, bank reference, etc). */
  reference?: string;
  /** Optional override of credit (bank) account. Defaults to 1930. */
  bankAccountNumber?: string;
  /** Optional override of the description. Otherwise auto-generated. */
  description?: string;
}

export interface BookSKVPaymentResult {
  journalEntryId: string;
  journalNumber: string | null;
  amount: number;
  debitAccount: string;
  creditAccount: string;
}

interface AccountSpec {
  number: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
}

const DEBIT_MAP: Record<SKVPaymentType, AccountSpec> = {
  f_tax:        { number: "2518", name: "Betald F-skatt",                          type: "liability" },
  vat:          { number: "2650", name: "Redovisningskonto för moms",              type: "liability" },
  employer_tax: { number: "2731", name: "Avräkning lagstadgade sociala avgifter",  type: "liability" },
  employee_tax: { number: "2710", name: "Personalskatt",                           type: "liability" },
  generic:      { number: "1630", name: "Avräkning för skatter och avgifter (skattekonto)", type: "asset" },
};

const DESCRIPTION_MAP: Record<SKVPaymentType, string> = {
  f_tax:        "Preliminärskatt (F-skatt)",
  vat:          "Momsbetalning till Skatteverket",
  employer_tax: "Arbetsgivaravgifter till Skatteverket",
  employee_tax: "Personalskatt till Skatteverket",
  generic:      "Skattekontobetalning till Skatteverket",
};

async function ensureAccount(
  companyId: string,
  spec: AccountSpec,
): Promise<string> {
  const { data: existing } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_number", spec.number)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("chart_of_accounts")
    .insert({
      company_id: companyId,
      account_number: spec.number,
      account_name: spec.name,
      account_type: spec.type,
    })
    .select("id")
    .maybeSingle();
  if (error || !created) {
    throw new Error(error?.message || `Kunde inte skapa konto ${spec.number}`);
  }
  return created.id;
}

export async function bookSKVPayment(
  params: BookSKVPaymentParams,
): Promise<BookSKVPaymentResult> {
  const { companyId, userId, amount, entryDate, paymentType, reference, description } = params;
  if (amount <= 0) throw new Error("Beloppet måste vara större än 0");

  const bankAccountNumber = params.bankAccountNumber ?? "1930";
  const debitSpec = DEBIT_MAP[paymentType];
  const bankSpec: AccountSpec = { number: bankAccountNumber, name: "Företagskonto", type: "asset" };

  const debitAccountId = await ensureAccount(companyId, debitSpec);
  const bankAccountId  = await ensureAccount(companyId, bankSpec);

  const desc = description
    ?? `${DESCRIPTION_MAP[paymentType]} ${entryDate}${reference ? ` · ${reference}` : ""}`;

  // 1. Draft
  const { data: je, error: jeErr } = await supabase
    .from("journal_entries")
    .insert({
      company_id: companyId,
      entry_date: entryDate,
      description: desc,
      status: "draft",
      created_by: userId,
      series_code: "A",
    })
    .select("id, journal_number")
    .maybeSingle();
  if (jeErr || !je) throw new Error(jeErr?.message || "Kunde inte skapa verifikation");

  // 2. Lines (D <SKV>  / K 1930)
  const { error: linesErr } = await supabase.from("journal_entry_lines").insert([
    { journal_entry_id: je.id, account_id: debitAccountId, debit: amount, credit: 0 },
    { journal_entry_id: je.id, account_id: bankAccountId,  debit: 0,      credit: amount },
  ]);
  if (linesErr) {
    await supabase.from("journal_entries").delete().eq("id", je.id);
    throw new Error(linesErr.message);
  }

  // 3. Approve (triggers balance validation)
  const { error: approveErr } = await supabase
    .from("journal_entries")
    .update({ status: "approved", approved_by: userId })
    .eq("id", je.id);
  if (approveErr) {
    await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", je.id);
    await supabase.from("journal_entries").delete().eq("id", je.id);
    throw new Error(approveErr.message);
  }

  return {
    journalEntryId: je.id,
    journalNumber: (je as { journal_number?: string | null }).journal_number ?? null,
    amount,
    debitAccount: debitSpec.number,
    creditAccount: bankAccountNumber,
  };
}

// Convenience wrappers
export const bookVATPayment          = (p: Omit<BookSKVPaymentParams,"paymentType">) => bookSKVPayment({ ...p, paymentType: "vat" });
export const bookEmployerTaxPayment  = (p: Omit<BookSKVPaymentParams,"paymentType">) => bookSKVPayment({ ...p, paymentType: "employer_tax" });
export const bookEmployeeTaxPayment  = (p: Omit<BookSKVPaymentParams,"paymentType">) => bookSKVPayment({ ...p, paymentType: "employee_tax" });
export const bookGenericSKVPayment   = (p: Omit<BookSKVPaymentParams,"paymentType">) => bookSKVPayment({ ...p, paymentType: "generic" });
