// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Compute the SKV due_date for a given period.
 * SKV rule of thumb: 12th of the second month after the period end.
 * (For VAT/AGI monthly: period 2026-04 → due 2026-06-12; F-tax monthly: due 12th of period month.)
 * We use a conservative "12th of the month after period" for VAT/AGI obligations
 * because the regelverk varies by company size — this matches the platform's
 * existing reminder copy and is what the client/UX has agreed on.
 */
function dueDateForPeriod(period: string, _paymentType: string): string {
  // period format "YYYY-MM" → due date = 12:e månaden EFTER perioden.
  // Date.UTC(y, m, 12): when 'm' is 1-indexed (e.g. 4 for April), passing it as
  // the 0-indexed monthIndex actually yields May → which is exactly "next month, day 12". ✅
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return new Date().toISOString().slice(0, 10);
  return new Date(Date.UTC(y, m, 12)).toISOString().slice(0, 10);
}

function periodFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = new Date();
    let inserted = 0;
    let updated = 0;

    // Process every company
    const { data: companies, error: cErr } = await supabase
      .from("companies")
      .select("id, name");
    if (cErr) throw cErr;

    for (const company of companies ?? []) {
      // 1. VAT obligations from vat_declarations with vat_to_pay > 0
      const { data: vatDecls } = await supabase
        .from("vat_declarations")
        .select("id, period_year, period_month, period_quarter, period_type, vat_to_pay, status")
        .eq("company_id", company.id)
        .gt("vat_to_pay", 0)
        .in("status", ["submitted", "approved", "filed"]);

      for (const v of vatDecls ?? []) {
        // Resolve period end month based on period_type
        let endMonth = v.period_month ?? 12;
        if (v.period_type === "quarterly" && v.period_quarter) endMonth = v.period_quarter * 3;
        else if (v.period_type === "yearly") endMonth = 12;
        const period = `${v.period_year}-${String(endMonth).padStart(2, "0")}`;
        const due = dueDateForPeriod(period, "vat");
        const { data: existing } = await supabase
          .from("skv_payment_obligations")
          .select("id, status")
          .eq("company_id", company.id)
          .eq("payment_type", "vat")
          .eq("period", period)
          .maybeSingle();
        if (!existing) {
          const { error } = await supabase.from("skv_payment_obligations").insert({
            company_id: company.id,
            payment_type: "vat",
            period,
            amount: v.vat_to_pay,
            due_date: due,
            source_ref: v.id,
            status: "pending",
          });
          if (!error) inserted++;
        } else if (existing.status === "pending") {
          await supabase.from("skv_payment_obligations").update({
            amount: v.vat_to_pay, due_date: due,
          }).eq("id", existing.id);
          updated++;
        }
      }

      // 2. AGI obligations (employer_tax + employee_tax) from agi_submissions
      const { data: agiSubs } = await supabase
        .from("agi_submissions")
        .select("id, payroll_run_id, submission_data, status, agi_period_id")
        .eq("company_id", company.id)
        .eq("status", "submitted");

      for (const s of agiSubs ?? []) {
        const sd = (s.submission_data ?? {}) as any;
        const totalContrib = Number(sd.totalContributions ?? sd.employer_contributions ?? 0);
        const totalTax = Number(sd.totalTax ?? sd.employee_tax ?? 0);
        // Period: prefer payroll_run period or agi period
        const { data: agiPeriod } = await supabase
          .from("agi_periods")
          .select("period_year, period_month")
          .eq("id", s.agi_period_id)
          .maybeSingle();
        if (!agiPeriod) continue;
        const period = `${agiPeriod.period_year}-${String(agiPeriod.period_month).padStart(2, "0")}`;
        const due = dueDateForPeriod(period, "employer_tax");

        for (const [type, amount] of [["employer_tax", totalContrib], ["employee_tax", totalTax]] as const) {
          if (amount <= 0) continue;
          const { data: existing } = await supabase
            .from("skv_payment_obligations")
            .select("id, status")
            .eq("company_id", company.id)
            .eq("payment_type", type)
            .eq("period", period)
            .maybeSingle();
          if (!existing) {
            const { error } = await supabase.from("skv_payment_obligations").insert({
              company_id: company.id,
              payment_type: type,
              period,
              amount,
              due_date: due,
              source_ref: s.id,
              status: "pending",
            });
            if (!error) inserted++;
          } else if (existing.status === "pending") {
            await supabase.from("skv_payment_obligations").update({
              amount, due_date: due,
            }).eq("id", existing.id);
            updated++;
          }
        }
      }

      // 3. Mark overdue
      await supabase
        .from("skv_payment_obligations")
        .update({ status: "overdue" })
        .eq("company_id", company.id)
        .lt("due_date", today.toISOString().slice(0, 10))
        .in("status", ["pending", "reminded"]);
    }

    return corsJson({ ok: true, inserted, updated });
  } catch (err) {
    console.error("[generate-skv-obligations]", err);
    return corsError((err as Error).message ?? "Unknown error", 500);
  }
});
