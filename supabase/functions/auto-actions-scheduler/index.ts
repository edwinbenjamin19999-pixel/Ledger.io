// Cron-driven auto-actions: läser automation_settings per bolag och kör
//   1) auto_send_reminders_after_days  → process-invoice-reminders per faktura
//   2) auto_defer_noncritical_payments → flyttar AP due_date till själva förfallodagen (no-op om redan där)
//   3) auto_prioritize_largest_ar      → uppdaterar reminder-prioritet (sort_priority kolumn finns ej, vi loggar bara ranking)
//
// Anropas av pg_cron varje timme. Idempotent: använder last_reminder_sent_at för att undvika dubbla utskick.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RunResult {
  company_id: string;
  reminders_sent: number;
  payments_deferred: number;
  ar_ranked: number;
  errors: string[];
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results: RunResult[] = [];

  try {
    const { data: settingsRows, error } = await supabase
      .from("automation_settings")
      .select(
        "company_id, auto_send_reminders_after_days, auto_defer_noncritical_payments, auto_prioritize_largest_ar"
      )
      .or(
        "auto_send_reminders_after_days.not.is.null,auto_defer_noncritical_payments.eq.true,auto_prioritize_largest_ar.eq.true"
      );

    if (error) throw error;

    for (const s of settingsRows ?? []) {
      const r: RunResult = {
        company_id: s.company_id,
        reminders_sent: 0,
        payments_deferred: 0,
        ar_ranked: 0,
        errors: [],
      };

      // ---------- 1) AUTO REMINDERS ----------
      if (s.auto_send_reminders_after_days != null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - s.auto_send_reminders_after_days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        const { data: overdue } = await supabase
          .from("invoices")
          .select("id, last_reminder_sent_at, reminder_count")
          .eq("company_id", s.company_id)
          .eq("invoice_direction", "outgoing")
          .in("status", ["sent", "overdue"])
          .lte("due_date", cutoffStr)
          .limit(50);

        for (const inv of overdue ?? []) {
          // Skip if a reminder was sent in the last 7 days (debounce)
          if (inv.last_reminder_sent_at) {
            const since = Date.now() - new Date(inv.last_reminder_sent_at).getTime();
            if (since < 7 * 24 * 60 * 60 * 1000) continue;
          }
          const { error: invErr } = await supabase.functions.invoke("process-invoice-reminders", {
            body: { invoice_id: inv.id, tone: "friendly" },
          });
          if (invErr) r.errors.push(`reminder ${inv.id}: ${invErr.message}`);
          else {
            r.reminders_sent++;
            await supabase
              .from("invoices")
              .update({
                last_reminder_sent_at: new Date().toISOString(),
                reminder_count: (inv.reminder_count ?? 0) + 1,
                status: "overdue",
              })
              .eq("id", inv.id);
          }
        }
      }

      // ---------- 2) AUTO DEFER NON-CRITICAL AP ----------
      // Flyttar inte due_date framåt (juridiskt tveksamt) — markerar istället som "review" via flag
      // genom att skapa en system_action_log-rad. Faktisk reschedule sker via UI-action.
      if (s.auto_defer_noncritical_payments) {
        const today = new Date();
        const horizon = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data: incoming } = await supabase
          .from("invoices")
          .select("id, total_amount, due_date, counterparty_name")
          .eq("company_id", s.company_id)
          .eq("invoice_direction", "incoming")
          .in("status", ["sent", "approved"])
          .gte("due_date", today.toISOString().slice(0, 10))
          .lte("due_date", horizon.toISOString().slice(0, 10))
          .limit(50);

        const safeToDelay = (incoming ?? []).filter((i) => Number(i.total_amount) < 50_000);

        if (safeToDelay.length > 0) {
          await supabase.from("system_action_log").insert([
            {
              company_id: s.company_id,
              source_module: "auto-actions-scheduler",
              target_module: "ap",
              action_type: "cashflow.auto_defer_review",
              payload: {
                count: safeToDelay.length,
                invoice_ids: safeToDelay.map((i) => i.id),
              } as never,
              status: "completed",
            } as never,
          ]);
          r.payments_deferred = safeToDelay.length;
        }
      }

      // ---------- 3) AUTO PRIORITIZE AR ----------
      if (s.auto_prioritize_largest_ar) {
        const { data: ar } = await supabase
          .from("invoices")
          .select("id, total_amount, due_date")
          .eq("company_id", s.company_id)
          .eq("invoice_direction", "outgoing")
          .in("status", ["sent", "overdue"])
          .order("total_amount", { ascending: false })
          .limit(10);

        if (ar && ar.length) {
          await supabase.from("system_action_log").insert([
            {
              company_id: s.company_id,
              source_module: "auto-actions-scheduler",
              target_module: "ar",
              action_type: "cashflow.auto_priority_ranked",
              payload: { top_ids: ar.map((i) => i.id) } as never,
              status: "completed",
            } as never,
          ]);
          r.ar_ranked = ar.length;
        }
      }

      results.push(r);
    }

    return corsJson({ ok: true, processed: results.length, results });
  } catch (e) {
    return corsError((e as Error).message, 500);
  }
});
