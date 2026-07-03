// Bureau weekly insights — generates a Monday morning portfolio report
// for each firm using Lovable AI Gateway. Aggregates risk levels, deadlines,
// and activity into a narrative + structured data block, persisted in
// bureau_portfolio_insights.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await safeJson(req);
    const targetFirmId: string | undefined = body?.firm_id;

    // If no firm specified → run for all active firms (cron path)
    const { data: firms } = targetFirmId
      ? await admin.from("accounting_firms").select("id, name").eq("id", targetFirmId)
      : await admin.from("accounting_firms").select("id, name").eq("is_active", true);

    const results: Array<{ firm_id: string; status: string; error?: string }> = [];

    for (const firm of firms ?? []) {
      try {
        await generateForFirm(admin, firm.id, firm.name);
        results.push({ firm_id: firm.id, status: "ok" });
      } catch (e) {
        console.error("weekly-insights firm failed", firm.id, e);
        results.push({ firm_id: firm.id, status: "failed", error: String(e) });
      }
    }

    return json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function generateForFirm(
  admin: ReturnType<typeof createClient>,
  firmId: string,
  firmName: string,
) {
  // Aggregate portfolio context
  const [{ data: risk }, { data: clients }, { data: deadlines }, { data: alerts }] = await Promise.all([
    admin.from("bureau_client_risk").select("score, level, signals, firm_client_id").eq("firm_id", firmId),
    admin
      .from("firm_clients")
      .select("id, status, companies:company_id (name)")
      .eq("firm_id", firmId)
      .eq("is_active", true),
    admin
      .from("firm_deadlines")
      .select("type, due_date, status")
      .eq("firm_id", firmId)
      .gte("due_date", new Date().toISOString().slice(0, 10))
      .lte("due_date", new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)),
    admin
      .from("bureau_alerts")
      .select("severity, code, message")
      .eq("firm_id", firmId)
      .eq("status", "open"),
  ]);

  const riskBuckets = { safe: 0, watch: 0, warning: 0, critical: 0 };
  for (const r of risk ?? []) {
    if (r.level && r.level in riskBuckets) (riskBuckets as Record<string, number>)[r.level]++;
  }

  const summary = {
    firm_name: firmName,
    week_starts_on: mondayISO(),
    client_count: clients?.length ?? 0,
    risk_distribution: riskBuckets,
    open_alerts: {
      critical: alerts?.filter((a) => a.severity === "critical").length ?? 0,
      warning: alerts?.filter((a) => a.severity === "warning").length ?? 0,
      info: alerts?.filter((a) => a.severity === "info").length ?? 0,
    },
    upcoming_deadlines_14d: deadlines?.length ?? 0,
    deadline_breakdown: groupBy(deadlines ?? [], "type"),
  };

  // Ask AI for a Swedish narrative
  const prompt = `Du är portföljanalytiker för svensk redovisningsbyrå.
Skriv en kort veckorapport (markdown, max 250 ord) baserad på datan nedan.
Struktur:
- ## Veckans läge (1-2 meningar)
- ## Topprioriteringar (3 punkter)
- ## Möjligheter (1-2 punkter)
- Avsluta med en kort uppmaning.

Datakontext:
${JSON.stringify(summary, null, 2)}`;

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Svara alltid på svenska. Var konkret och datadriven." },
        { role: "user", content: prompt },
      ],
    }),
  });

  let body = "Veckorapport kunde inte genereras.";
  if (aiResp.ok) {
    const aiData = await aiResp.json();
    body = aiData.choices?.[0]?.message?.content ?? body;
  } else {
    const t = await aiResp.text();
    console.error("AI gateway error", aiResp.status, t);
  }

  await admin.from("bureau_portfolio_insights").insert({
    firm_id: firmId,
    insight_type: "weekly_report",
    title: `Veckorapport ${mondayISO()}`,
    body,
    data: summary,
    week_starts_on: mondayISO(),
  });
}

function mondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = String(item[key] ?? "okänd");
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

async function safeJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
