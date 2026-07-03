// Bureau proactive alerts — scans active clients and inserts open alerts.
// Designed to be called daily (cron) or on-demand from the bureau dashboard.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const { firm_id } = await req.json();
    if (!firm_id) return json({ error: "firm_id required" }, 400);

    const { data: member } = await userClient
      .from("firm_members").select("id")
      .eq("firm_id", firm_id).eq("user_id", claims.claims.sub).eq("is_active", true).maybeSingle();
    if (!member) return json({ error: "Forbidden" }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Build alerts from current risk signals (re-emits as proactive alerts)
    const { data: risks } = await admin
      .from("bureau_client_risk")
      .select("firm_client_id, company_id, signals, level")
      .eq("firm_id", firm_id);

    let inserted = 0;
    for (const r of risks ?? []) {
      const signals = (r.signals ?? []) as Array<{ code: string; message: string; severity: "info"|"warning"|"critical"; action_url: string }>;
      for (const s of signals) {
        // Skip if open alert with same code already exists for this client
        const { data: existing } = await admin
          .from("bureau_alerts")
          .select("id")
          .eq("firm_id", firm_id)
          .eq("firm_client_id", r.firm_client_id)
          .eq("code", s.code)
          .eq("status", "open")
          .maybeSingle();
        if (existing) continue;

        const { error } = await admin.from("bureau_alerts").insert({
          firm_id,
          firm_client_id: r.firm_client_id,
          company_id: r.company_id,
          severity: s.severity,
          code: s.code,
          title: s.message.split("—")[0]?.trim() || s.code,
          message: s.message,
          action_url: s.action_url,
        });
        if (!error) inserted++;
      }
    }

    return json({ ok: true, inserted });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
