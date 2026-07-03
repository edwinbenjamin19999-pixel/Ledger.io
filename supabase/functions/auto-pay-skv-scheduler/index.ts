// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, corsJson, corsError } from "../_shared/cors.ts";
import { bookSKVPayment } from "../_shared/bookSKVPayment.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const diffDays = (due: string, today: Date) =>
  Math.round((new Date(due + "T00:00:00Z").getTime() - today.getTime()) / 86_400_000);

async function notify(supabase: any, userIds: string[], companyId: string, title: string, message: string, notification_type: string, severity: string, metadata: any) {
  for (const uid of userIds) {
    await supabase.from("admin_notifications").insert({
      user_id: uid, company_id: companyId, title, message, notification_type, severity, metadata,
    });
  }
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const todayISO = today.toISOString().slice(0, 10);

    const { data: obligations } = await supabase
      .from("skv_payment_obligations")
      .select("id, company_id, payment_type, period, amount, due_date, status")
      .in("status", ["pending", "reminded"])
      .gte("due_date", todayISO);

    let paid = 0, skipped = 0, failed = 0;
    for (const o of obligations ?? []) {
      const { data: settings } = await supabase
        .from("automation_settings")
        .select("auto_pay_skv_enabled, auto_pay_skv_max_amount, auto_pay_skv_days_before, auto_pay_skv_types")
        .eq("company_id", o.company_id).maybeSingle();

      if (!settings?.auto_pay_skv_enabled) { skipped++; continue; }
      const days = diffDays(o.due_date, today);
      if (days > (settings.auto_pay_skv_days_before ?? 1)) { skipped++; continue; }
      const allowedTypes: string[] = settings.auto_pay_skv_types ?? [];
      if (!allowedTypes.includes(o.payment_type)) { skipped++; continue; }

      const { data: owners } = await supabase
        .from("user_roles").select("user_id")
        .eq("company_id", o.company_id).in("role", ["owner", "accountant"]);
      const ownerIds = (owners ?? []).map((u: any) => u.user_id);

      if (Number(o.amount) > Number(settings.auto_pay_skv_max_amount ?? 0)) {
        skipped++;
        await notify(supabase, ownerIds, o.company_id,
          "AI kunde inte autobetala SKV — över maxgräns",
          `Belopp ${o.amount} kr överstiger inställt tak (${settings.auto_pay_skv_max_amount} kr). Bekräfta manuellt.`,
          "skv_auto_payment_failed", "warning",
          { action_key: "skv_auto_payment_failed", action_url: "/skatteagent", obligation_id: o.id });
        continue;
      }

      const { data: company } = await supabase
        .from("companies").select("created_by").eq("id", o.company_id).maybeSingle();
      const userId = company?.created_by;
      if (!userId) { skipped++; continue; }

      try {
        const result = await bookSKVPayment(supabase, {
          companyId: o.company_id, userId,
          amount: Number(o.amount), entryDate: todayISO,
          paymentType: o.payment_type as any,
          reference: `Auto SKV ${o.period}`,
        });
        await supabase.from("skv_payment_obligations").update({
          status: "paid", journal_entry_id: result.journalEntryId,
        }).eq("id", o.id);
        paid++;
        await notify(supabase, ownerIds, o.company_id,
          "AI har bokfört SKV-betalning",
          `${o.payment_type} ${o.period}: ${o.amount} kr bokförd (verifikation ${result.journalNumber ?? result.journalEntryId.slice(0,8)}).`,
          "skv_auto_payment_completed", "info",
          { action_key: "skv_auto_payment_completed", action_url: "/verifikationer", obligation_id: o.id });
      } catch (err) {
        failed++;
        console.error("[auto-pay-skv]", o.id, err);
        await supabase.from("skv_payment_obligations").update({
          status: "reminded", notes: `AI-fel: ${(err as Error).message}`,
        }).eq("id", o.id);
        await notify(supabase, ownerIds, o.company_id,
          "AI kunde inte betala SKV",
          `Fel vid autobetalning av ${o.payment_type} ${o.period}: ${(err as Error).message}. Betala manuellt.`,
          "skv_auto_payment_failed", "error",
          { action_key: "skv_auto_payment_failed", action_url: "/skatteagent", obligation_id: o.id });
      }
    }
    return corsJson({ ok: true, paid, skipped, failed });
  } catch (err) {
    console.error("[auto-pay-skv-scheduler]", err);
    return corsError((err as Error).message ?? "Unknown", 500);
  }
});
