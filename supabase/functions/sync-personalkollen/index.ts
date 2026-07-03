// Personalkollen sync — scaffold.
// Full live sync requires each customer's PERSONALKOLLEN_API_KEY (add via Lovable secrets per-company).
// This scaffold accepts manual payloads and upserts staff_cost_imports so the UI works immediately.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncPayload {
  company_id: string;
  period_month: string; // YYYY-MM-01
  total_hours: number;
  total_cost: number;
  scheduled_cost?: number;
  actual_cost?: number;
  source?: string; // "personalkollen" | "manual" | "caspeco"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as SyncPayload;
    if (!body?.company_id || !body?.period_month) {
      return new Response(JSON.stringify({ error: "company_id and period_month required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // TODO: When PERSONALKOLLEN_API_KEY is configured for this company,
    // fetch /api/reports/labor-cost?month=... and map into the payload.
    // const apiKey = Deno.env.get("PERSONALKOLLEN_API_KEY");
    // if (apiKey) { ...fetch from Personalkollen... }

    const { error } = await supabase.from("staff_cost_imports").upsert(
      {
        company_id: body.company_id,
        period_month: body.period_month,
        total_hours: body.total_hours ?? 0,
        total_cost: body.total_cost ?? 0,
        scheduled_cost: body.scheduled_cost ?? null,
        actual_cost: body.actual_cost ?? body.total_cost ?? 0,
        source: body.source ?? "manual",
      },
      { onConflict: "company_id,period_month,source" },
    );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-personalkollen error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
