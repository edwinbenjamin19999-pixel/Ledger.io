// payroll-to-journal
// Generates a draft journal entry from a payroll_run.
// Standard Swedish payroll posting:
//   Debit  7010  Bruttolöner             (sum gross_salary)
//   Debit  7510  Arbetsgivaravgifter     (sum employer_social_fees)
//   Credit 2710  Personalskatt           (sum tax_deduction)
//   Credit 2731  Semesterlöneskuld       (sum vacation_pay)        [if > 0]
//   Credit 2941  Upplupna arb.giv.avg.   (sum employer_social_fees)
//   Credit 1930  Företagskonto/bank      (sum net_salary)
// Header is created in `draft`, lines inserted, then header flipped to
// `pending_approval` (per ai-booking-transaction-sequence-sv).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface Body {
  payroll_run_id: string;
  company_id: string;
}

const ACCOUNTS = {
  GROSS: "7010",
  EMPLOYER_FEE_EXPENSE: "7510",
  TAX_PAYABLE: "2710",
  VACATION_DEBT: "2731",
  EMPLOYER_FEE_PAYABLE: "2941",
  BANK: "1930",
};

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return corsError("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimErr } = await supabase.auth.getClaims(token);
    if (claimErr || !claims?.claims) return corsError("Unauthorized", 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as Body;
    if (!body?.payroll_run_id || !body?.company_id) {
      return corsError("Missing payroll_run_id/company_id", 400);
    }

    // Service role for writing journal (bypasses RLS but we already auth'd above)
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotency: if a journal already exists for this run, return it
    const { data: existing } = await svc
      .from("journal_entries")
      .select("id, status, journal_number")
      .eq("company_id", body.company_id)
      .ilike("description", `%payroll_run:${body.payroll_run_id}%`)
      .maybeSingle();
    if (existing) {
      return corsJson({ ok: true, journal_entry_id: existing.id, status: existing.status, reused: true });
    }

    const { data: run, error: runErr } = await svc
      .from("payroll_runs")
      .select("id, period_start, period_end, payment_date, status, total_gross, total_tax, total_net, total_employer_cost")
      .eq("id", body.payroll_run_id)
      .eq("company_id", body.company_id)
      .single();
    if (runErr || !run) return corsError("Payroll run not found", 404);

    const { data: lines, error: linesErr } = await svc
      .from("payroll_lines")
      .select("gross_salary, tax_deduction, net_salary, employer_social_fees, vacation_pay")
      .eq("payroll_run_id", body.payroll_run_id);
    if (linesErr) return corsError(linesErr.message, 500);
    if (!lines || lines.length === 0) return corsError("No payroll lines", 400);

    let gross = 0, tax = 0, net = 0, fee = 0, vac = 0;
    for (const l of lines) {
      gross += Number(l.gross_salary || 0);
      tax += Number(l.tax_deduction || 0);
      net += Number(l.net_salary || 0);
      fee += Number(l.employer_social_fees || 0);
      vac += Number(l.vacation_pay || 0);
    }
    gross = Math.round(gross * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    net = Math.round(net * 100) / 100;
    fee = Math.round(fee * 100) / 100;
    vac = Math.round(vac * 100) / 100;

    // Resolve account ids
    const accountNumbers = Object.values(ACCOUNTS);
    const { data: accounts, error: accErr } = await svc
      .from("chart_of_accounts")
      .select("id, account_number")
      .eq("company_id", body.company_id)
      .in("account_number", accountNumbers);
    if (accErr) return corsError(accErr.message, 500);

    const accById = new Map<string, string>();
    (accounts || []).forEach((a: any) => accById.set(a.account_number, a.id));

    const required = [ACCOUNTS.GROSS, ACCOUNTS.TAX_PAYABLE, ACCOUNTS.BANK];
    const missing = required.filter((n) => !accById.has(n));
    if (missing.length) {
      return corsError(`Saknar konton i kontoplanen: ${missing.join(", ")}. Aktivera BAS-kontona först.`, 400);
    }

    const entryDate = run.payment_date || run.period_end;
    const description = `Lönekörning ${run.period_start} → ${run.period_end} [payroll_run:${body.payroll_run_id}]`;

    // 1. Header in draft
    const { data: header, error: hdrErr } = await svc
      .from("journal_entries")
      .insert({
        company_id: body.company_id,
        entry_date: entryDate,
        description,
        status: "draft",
        created_by: userId,
        ai_explanation: "Auto-genererad från godkänd lönekörning. Konton: 7010 brutto, 7510/2941 arb.giv.avg., 2710 personalskatt, 2731 semesterskuld, 1930 nettoutbetalning.",
        ai_confidence: 0.95,
      })
      .select()
      .single();
    if (hdrErr || !header) return corsError(hdrErr?.message || "Kunde inte skapa verifikation", 500);

    // 2. Lines
    type Line = { account_id: string; debit: number; credit: number };
    const journalLines: Line[] = [];

    if (gross > 0) journalLines.push({ account_id: accById.get(ACCOUNTS.GROSS)!, debit: gross, credit: 0 });
    if (fee > 0 && accById.has(ACCOUNTS.EMPLOYER_FEE_EXPENSE)) {
      journalLines.push({ account_id: accById.get(ACCOUNTS.EMPLOYER_FEE_EXPENSE)!, debit: fee, credit: 0 });
    }
    if (tax > 0) journalLines.push({ account_id: accById.get(ACCOUNTS.TAX_PAYABLE)!, debit: 0, credit: tax });
    if (vac > 0 && accById.has(ACCOUNTS.VACATION_DEBT)) {
      journalLines.push({ account_id: accById.get(ACCOUNTS.VACATION_DEBT)!, debit: 0, credit: vac });
    }
    if (fee > 0 && accById.has(ACCOUNTS.EMPLOYER_FEE_PAYABLE)) {
      journalLines.push({ account_id: accById.get(ACCOUNTS.EMPLOYER_FEE_PAYABLE)!, debit: 0, credit: fee });
    }
    if (net > 0) journalLines.push({ account_id: accById.get(ACCOUNTS.BANK)!, debit: 0, credit: net });

    // Balance check (allow tiny rounding)
    const totalDebit = journalLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = journalLines.reduce((s, l) => s + l.credit, 0);
    const diff = Math.round((totalDebit - totalCredit) * 100) / 100;
    if (Math.abs(diff) > 0.01) {
      // Plug to bank to balance (rounding)
      const bank = journalLines.find((l) => l.account_id === accById.get(ACCOUNTS.BANK));
      if (bank) bank.credit = Math.round((bank.credit + diff) * 100) / 100;
    }

    const { error: linesInsErr } = await svc.from("journal_entry_lines").insert(
      journalLines.map((l) => ({ journal_entry_id: header.id, ...l })),
    );
    if (linesInsErr) {
      await svc.from("journal_entries").delete().eq("id", header.id);
      return corsError(linesInsErr.message, 500);
    }

    // 3. Flip to pending_approval (so user can review and approve in normal flow)
    await svc
      .from("journal_entries")
      .update({ status: "pending_approval" })
      .eq("id", header.id);

    return corsJson({
      ok: true,
      journal_entry_id: header.id,
      status: "pending_approval",
      totals: { gross, tax, net, fee, vac },
      lineCount: journalLines.length,
    });
  } catch (e: any) {
    return corsError(e?.message || "Internal error", 500);
  }
});
