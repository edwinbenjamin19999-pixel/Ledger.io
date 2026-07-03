// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, corsJson, corsError } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TYPE_LABEL: Record<string, string> = {
  vat: "Moms", f_tax: "F-skatt",
  employer_tax: "Arbetsgivaravgifter", employee_tax: "Personalskatt",
};

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

const diffDays = (due: string, today: Date) =>
  Math.round((new Date(due + "T00:00:00Z").getTime() - today.getTime()) / 86_400_000);

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const todayISO = today.toISOString().slice(0, 10);

    const { data: obligations } = await supabase
      .from("skv_payment_obligations")
      .select("id, company_id, payment_type, period, amount, due_date, status, reminder_stage")
      .in("status", ["pending", "reminded"])
      .gte("due_date", todayISO);

    let sent = 0;
    for (const o of obligations ?? []) {
      const days = diffDays(o.due_date, today);
      let stage: string | null = null;
      let actionKey: string | null = null;
      if (days === 10) { stage = "10d"; actionKey = "skv_payment_reminder_10d"; }
      else if (days === 3) { stage = "3d"; actionKey = "skv_payment_reminder_3d"; }
      else if (days === 0) { stage = "due"; actionKey = "skv_payment_due_today"; }
      else continue;
      if (o.reminder_stage === stage) continue;

      const label = TYPE_LABEL[o.payment_type] ?? o.payment_type;
      const title = days === 0
        ? `${label} ${o.period} förfaller idag`
        : `${label} ${o.period} förfaller om ${days} dagar`;
      const message = `${label} för ${o.period} på ${fmtSEK(Number(o.amount))} förfaller ${o.due_date}.`;

      const { data: roles } = await supabase
        .from("user_roles").select("user_id")
        .eq("company_id", o.company_id)
        .in("role", ["owner", "accountant", "admin"]);

      for (const r of roles ?? []) {
        await supabase.from("admin_notifications").insert({
          user_id: r.user_id, company_id: o.company_id,
          title, message,
          notification_type: "skv_payment_reminder",
          severity: days <= 3 ? "warning" : "info",
          metadata: { action_key: actionKey, action_url: "/skatteagent", obligation_id: o.id },
        });
      }

      await supabase.from("skv_payment_obligations").update({
        status: "reminded", reminder_stage: stage,
        last_reminder_sent_at: new Date().toISOString(),
      }).eq("id", o.id);
      sent++;
    }
    return corsJson({ ok: true, sent });
  } catch (err) {
    console.error("[send-skv-reminders]", err);
    return corsError((err as Error).message ?? "Unknown", 500);
  }
});
