// Bureau AI copilot — streams responses from Lovable AI Gateway with portfolio context.
// Note: spec asked for claude-sonnet — we route through Lovable AI Gateway (no API key required)
// using google/gemini-3-flash-preview as default; can be overridden via request.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `Du är en AI-assistent för en svensk redovisningsbyrå som använder NorthLedger.
Du har tillgång till realtidsdata om byråns klientportfölj.
Svara alltid på svenska. Var specifik och datadriven.
När du listar klienter, inkludera alltid aktuell status och nyckeltal.
Föreslå alltid konkreta nästa steg.
Du får aldrig dela information om en klient till en annan klient.
Använd kort markdown (rubriker, listor, tabeller) för läsbarhet.`;

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

    const { firm_id, messages, model } = await req.json();
    if (!firm_id || !Array.isArray(messages)) return json({ error: "firm_id and messages required" }, 400);

    // Verify membership
    const { data: member } = await userClient
      .from("firm_members")
      .select("id")
      .eq("firm_id", firm_id)
      .eq("user_id", claims.claims.sub)
      .eq("is_active", true)
      .maybeSingle();
    if (!member) return json({ error: "Forbidden" }, 403);

    // Build context (service role for cross-client aggregation, scoped to this firm only)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const context = await buildContext(admin, firm_id);

    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `BYRÅ-KONTEXT (JSON):\n${JSON.stringify(context, null, 2)}` },
      ...messages,
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "google/gemini-3-flash-preview",
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "Rate limit — försök igen om en stund." }, 429);
      if (resp.status === 402) return json({ error: "AI-krediter slut. Lägg till krediter i workspace." }, 402);
      const t = await resp.text();
      console.error("AI gateway", resp.status, t);
      return json({ error: "AI-fel" }, 500);
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
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

async function buildContext(admin: ReturnType<typeof createClient>, firm_id: string) {
  const [{ data: firm }, { data: clients }, { data: risk }, { data: deadlines }, { data: members }] = await Promise.all([
    admin.from("accounting_firms").select("id, name, subtitle").eq("id", firm_id).maybeSingle(),
    admin
      .from("firm_clients")
      .select("id, status, mandate_status, assigned_consultant_id, companies:company_id (id, name, org_number, industry)")
      .eq("firm_id", firm_id)
      .eq("is_active", true)
      .limit(200),
    admin.from("bureau_client_risk").select("firm_client_id, score, level, signals").eq("firm_id", firm_id),
    admin
      .from("firm_deadlines")
      .select("client_id, type, due_date, status")
      .eq("firm_id", firm_id)
      .gte("due_date", new Date().toISOString().slice(0, 10))
      .order("due_date")
      .limit(50),
    admin.from("firm_members").select("user_id, role").eq("firm_id", firm_id).eq("is_active", true),
  ]);

  const riskByClient = new Map((risk ?? []).map((r) => [r.firm_client_id, r]));
  return {
    firm: firm ?? null,
    today: new Date().toISOString().slice(0, 10),
    staff_count: members?.length ?? 0,
    client_count: clients?.length ?? 0,
    clients: (clients ?? []).map((c) => {
      const co = c.companies as unknown as { id: string; name: string; org_number: string; industry: string };
      const r = riskByClient.get(c.id);
      return {
        id: c.id,
        name: co?.name,
        org_number: co?.org_number,
        industry: co?.industry,
        status: c.status,
        risk_score: r?.score ?? null,
        risk_level: r?.level ?? null,
        top_signal: Array.isArray(r?.signals) && r.signals[0] ? (r.signals[0] as { message: string }).message : null,
      };
    }),
    upcoming_deadlines: (deadlines ?? []).slice(0, 30),
  };
}
