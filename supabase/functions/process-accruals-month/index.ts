// Posts pending accrual postings whose period_month is <= current month.
// Creates a journal entry (Debit cost, Credit prepaid) for each — the inverse
// of the original recognition entry, releasing the prepaid balance into P&L.
// Logs to ai_activity_log: "Periodiserade N poster automatiskt vid periodstängning."

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  companyId?: string;
  asOfMonth?: string; // YYYY-MM-01
  dryRun?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body: ProcessRequest = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const today = new Date();
    const cutoff =
      body.asOfMonth ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

    // Fetch pending postings up to cutoff
    let q = supabase
      .from("accrual_postings")
      .select("id, schedule_id, period_month, amount, accrual_schedules!inner(id, company_id, description, cost_account_number, prepaid_account_number, status, source_invoice_id, created_by)")
      .eq("status", "pending")
      .lte("period_month", cutoff);
    if (body.companyId) q = q.eq("accrual_schedules.company_id", body.companyId);
    const { data: postings, error } = await q;
    if (error) throw error;

    let posted = 0;
    const byCompany: Record<string, number> = {};

    for (const p of (postings || []) as any[]) {
      const sched = p.accrual_schedules;
      if (!sched || sched.status !== "active") continue;

      // Resolve account ids for the booking
      const { data: accts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", sched.company_id)
        .in("account_number", [sched.cost_account_number, sched.prepaid_account_number]);
      const costAcct = accts?.find((a: any) => a.account_number === sched.cost_account_number);
      const prepaidAcct = accts?.find((a: any) => a.account_number === sched.prepaid_account_number);
      if (!costAcct || !prepaidAcct) continue;

      if (body.dryRun) {
        posted++;
        continue;
      }

      // Header (draft)
      const { data: entry, error: entryErr } = await supabase
        .from("journal_entries")
        .insert({
          company_id: sched.company_id,
          entry_date: p.period_month,
          description: `[Periodisering] ${sched.description}`,
          status: "draft",
          created_by: sched.created_by ?? null,
        })
        .select()
        .maybeSingle();
      if (entryErr || !entry) continue;

      // Lines: Debit cost, Credit prepaid
      const { error: linesErr } = await supabase.from("journal_entry_lines").insert([
        {
          journal_entry_id: entry.id,
          account_id: costAcct.id,
          debit: Number(p.amount),
          credit: 0,
          description: "Periodisering – månadsdel",
        },
        {
          journal_entry_id: entry.id,
          account_id: prepaidAcct.id,
          debit: 0,
          credit: Number(p.amount),
          description: "Återföring förutbetald kostnad",
        },
      ]);
      if (linesErr) continue;

      // Approve header
      await supabase.from("journal_entries").update({ status: "approved" }).eq("id", entry.id);

      // Mark posting
      await supabase
        .from("accrual_postings")
        .update({ status: "posted", posted_at: new Date().toISOString(), journal_entry_id: entry.id })
        .eq("id", p.id);

      posted++;
      byCompany[sched.company_id] = (byCompany[sched.company_id] || 0) + 1;
    }

    // Mark schedules whose remaining pending count is now zero as completed
    if (!body.dryRun) {
      const { data: doneSchedules } = await supabase
        .from("accrual_schedules")
        .select("id, postings:accrual_postings(status)")
        .eq("status", "active");
      for (const s of (doneSchedules || []) as any[]) {
        const pendingLeft = (s.postings || []).filter((x: any) => x.status === "pending").length;
        if (pendingLeft === 0) {
          await supabase.from("accrual_schedules").update({ status: "completed" }).eq("id", s.id);
        }
      }

      // Activity log
      for (const [cid, n] of Object.entries(byCompany)) {
        await supabase.from("ai_activity_log").insert({
          company_id: cid,
          action: "accrual_auto_post",
          summary: `Periodiserade ${n} poster automatiskt vid periodstängning.`,
          metadata: { period_month: cutoff },
        }).then(() => {}, () => {});
      }
    }

    return new Response(JSON.stringify({ posted, dryRun: !!body.dryRun, cutoff }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-accruals-month error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
