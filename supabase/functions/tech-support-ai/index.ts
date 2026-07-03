// Sandboxad supportagent — endast förklara fel & validera whitelistade actions.
// Ingen DB-, schema- eller kod-modifikation tillåten.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ACTIONS = new Set([
  "retry_request",
  "refresh_module",
  "reset_form_state",
  "restore_last_valid",
  "reopen_draft",
  "clear_ui_state",
  "revalidate_inputs",
]);

const STRUCTURAL_KEYWORDS = [
  "schema",
  "permission denied for table",
  "rls",
  "policy",
  "edge function",
  "deploy",
  "chart of accounts",
  "drop table",
  "alter table",
];

const SYSTEM_PROMPT = `Du är en sandboxad teknisk supportagent för en svensk bokföringsplattform.
DU FÅR ENDAST:
- förklara fel på svenska, kort och tydligt
- föreslå whitelistade reparationer: retry_request, refresh_module, reset_form_state, restore_last_valid, reopen_draft, clear_ui_state, revalidate_inputs

DU FÅR ALDRIG:
- föreslå ändringar i databas-schema, RLS, integrationer, kod, secrets
- föreslå bulk-uppdateringar av data eller kontoplan

Om felet är strukturellt (schema/RLS/integration), svara att det måste eskaleras till mänsklig support.
Håll svaret under 60 ord.`;

function isStructural(msg: string): boolean {
  const m = (msg ?? "").toLowerCase();
  return STRUCTURAL_KEYWORDS.some((k) => m.includes(k));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const op = body?.op as string | undefined;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Identify user from JWT (best-effort)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    if (op === "log") {
      const { incident, plan, outcome } = body;
      const escalated = plan?.escalate === true || isStructural(incident?.errorMessage ?? "");
      // Server-side whitelist validation
      const requestedActions: string[] = Array.isArray(plan?.actions) ? plan.actions : [];
      const violations = requestedActions.filter((a) => !ALLOWED_ACTIONS.has(a));
      if (violations.length) {
        // Block: rewrite to escalation
        await supabase.from("support_incidents").insert({
          user_id: userId,
          company_id: incident?.context?.companyId ?? null,
          incident_type: incident?.source ?? "unknown",
          classification: incident?.classification ?? "unknown",
          module: incident?.module ?? null,
          error_message: incident?.errorMessage ?? "",
          context: incident?.context ?? {},
          actions_taken: outcome ? [outcome] : [],
          outcome: "blocked_invalid_action",
          escalated: true,
        });
        return new Response(
          JSON.stringify({ ok: false, mode: "BLOCKED", escalate: true, violations }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase.from("support_incidents").insert({
        user_id: userId,
        company_id: incident?.context?.companyId ?? null,
        incident_type: incident?.source ?? "unknown",
        classification: incident?.classification ?? "unknown",
        module: incident?.module ?? null,
        error_message: incident?.errorMessage ?? "",
        context: incident?.context ?? {},
        actions_taken: outcome ? [outcome] : [],
        outcome: outcome?.ok === true ? "fixed" : outcome?.ok === false ? "failed" : null,
        escalated,
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (op === "explain") {
      const incident = body?.incident;
      const errorMsg = incident?.errorMessage ?? "";
      if (isStructural(errorMsg)) {
        return new Response(
          JSON.stringify({
            explanation:
              "Det här kräver en strukturell ändring (rättigheter eller integration) som måste hanteras av support.",
            mode: "BLOCKED",
            escalate: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ explanation: "Okänt fel — försök ladda om sidan.", mode: "AUTO" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Modul: ${incident?.module ?? "okänd"}\nKlassificering: ${incident?.classification ?? "okänd"}\nFel: ${errorMsg}`,
            },
          ],
        }),
      });

      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ explanation: "AI-tjänsten är överbelastad. Försök igen om en stund.", mode: "AUTO" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ explanation: "AI-krediterna är slut.", mode: "AUTO" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!aiResp.ok) {
        return new Response(
          JSON.stringify({ explanation: "Kunde inte hämta förklaring just nu.", mode: "AUTO" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await aiResp.json();
      const explanation = data?.choices?.[0]?.message?.content ?? "Inget svar från AI.";
      return new Response(
        JSON.stringify({ explanation, mode: "AUTO", escalate: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown op" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tech-support-ai error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
