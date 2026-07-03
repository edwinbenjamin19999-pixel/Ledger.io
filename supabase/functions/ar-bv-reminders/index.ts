// deno-lint-ignore-file no-explicit-any
// Sends Bolagsverket annual-report deadline reminders via Lovable transactional email.
// Idempotent: each (annual_report_id, reminder_kind) pair sent at most once.
// Triggered via cron (daily) or manual invoke.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, corsJson, corsError } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Thresholds { kind: "90d" | "30d" | "14d" | "7d" | "0d"; days: number; label: string }
const THRESHOLDS: Thresholds[] = [
  { kind: "90d", days: 90, label: "90 dagar kvar" },
  { kind: "30d", days: 30, label: "30 dagar kvar" },
  { kind: "14d", days: 14, label: "14 dagar kvar" },
  { kind: "7d",  days: 7,  label: "7 dagar kvar"  },
  { kind: "0d",  days: 0,  label: "Sista dagen"   },
];

const daysBetween = (target: string, today: Date) =>
  Math.round((new Date(target + "T00:00:00Z").getTime() - today.getTime()) / 86_400_000);

async function sendReminderEmail(opts: {
  recipients: string[];
  templateData: Record<string, unknown>;
}): Promise<{ ids: string[]; error?: string }> {
  const ids: string[] = [];
  for (const recipient of opts.recipients) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          templateName: "bv-deadline-reminder",
          to: recipient,
          templateData: opts.templateData,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return { ids, error: `send-transactional-email ${r.status}: ${JSON.stringify(data)}` };
      }
      ids.push((data as any)?.messageId ?? (data as any)?.id ?? "queued");
    } catch (e) {
      return { ids, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { ids };
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayISO = today.toISOString().slice(0, 10);

    // Optional override: { dryRun?: boolean, annualReportId?: string }
    let body: any = {};
    try { body = await req.json(); } catch (_) { /* cron call has no body */ }
    const dryRun = !!body?.dryRun;

    let q = supabase
      .from("annual_reports")
      .select("id, company_id, fiscal_year, fiscal_year_end, bolagsverket_deadline, bolagsverket_manual_submitted_at, bolagsverket_status, company:companies(name, org_number)")
      .is("bolagsverket_manual_submitted_at", null);
    if (body?.annualReportId) q = q.eq("id", body.annualReportId);

    const { data: reports, error } = await q;
    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    const log: any[] = [];

    for (const r of reports ?? []) {
      // Compute deadline if not set: 7 months after fiscal year end
      let deadline = r.bolagsverket_deadline as string | null;
      if (!deadline && r.fiscal_year_end) {
        const fye = new Date(r.fiscal_year_end + "T00:00:00Z");
        fye.setUTCMonth(fye.getUTCMonth() + 7);
        deadline = fye.toISOString().slice(0, 10);
      }
      if (!deadline) { skipped++; continue; }

      const daysLeft = daysBetween(deadline, today);
      const threshold = THRESHOLDS.find(t => t.days === daysLeft);
      if (!threshold) { skipped++; continue; }

      // Skip if already sent
      const { data: existing } = await supabase
        .from("ar_bv_reminders")
        .select("id")
        .eq("annual_report_id", r.id)
        .eq("reminder_kind", threshold.kind)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      // Recipients: company members with email + board members
      const recipients = new Set<string>();
      const { data: members } = await supabase
        .from("ar_board_members")
        .select("email")
        .eq("company_id", r.company_id);
      for (const m of members ?? []) if (m.email) recipients.add(m.email);

      // Fallback: company owners via profiles
      if (recipients.size === 0) {
        const { data: owners } = await supabase.rpc("get_company_member_profiles" as any, { _company_id: r.company_id }).select("email");
        for (const o of (owners as any[]) ?? []) if (o?.email) recipients.add(o.email);
      }

      const recList = Array.from(recipients);
      const company = (r as any).company || {};
      const templateData = {
        companyName: company.name ?? "—",
        orgNumber: company.org_number ?? "—",
        fiscalYear: r.fiscal_year,
        deadline,
        daysLeft,
        reminderKind: threshold.kind,
        appUrl: "https://northledger.se/annual-report",
      };

      let result: { ids: string[]; error?: string } = { ids: [], error: "no recipients" };
      if (recList.length > 0 && !dryRun) {
        result = await sendReminderEmail({ recipients: recList, templateData });
      } else if (dryRun) {
        result = { ids: ["dry-run"] };
      }

      await supabase.from("ar_bv_reminders").insert({
        annual_report_id: r.id,
        company_id: r.company_id,
        reminder_kind: threshold.kind,
        recipients: recList,
        email_id: result.ids[0] ?? null,
        status: result.error ? "failed" : "sent",
        error: result.error ?? null,
      });

      await supabase.from("annual_reports").update({
        bolagsverket_last_reminder_at: new Date().toISOString(),
        bolagsverket_last_reminder_kind: threshold.kind,
        bolagsverket_deadline: deadline,
      }).eq("id", r.id);

      sent++;
      log.push({ report: r.id, kind: threshold.kind, recipients: recList.length, error: result.error });
    }

    return corsJson({ ok: true, sent, skipped, log });
  } catch (e) {
    console.error("ar-bv-reminders error:", e);
    return corsError(e instanceof Error ? e.message : "Unknown error");
  }
});
