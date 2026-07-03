// ar-write-text — generate legal-grade Swedish text for an AR block via Lovable AI.
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "produce_text",
    description: "Returnera HTML, motivering och referenser för en sektion i årsredovisningen.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Text i HTML (p, ul, li, strong)." },
        rationale: { type: "string", description: "Kort förklaring av tonval och struktur (2-3 meningar)." },
        citations: {
          type: "array",
          items: {
            type: "object",
            properties: { source: { type: "string" }, ref: { type: "string" } },
            required: ["source", "ref"],
          },
        },
      },
      required: ["html", "rationale", "citations"],
    },
  },
} as const;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const body = await req.json().catch(() => ({}));
    const {
      annualReportId,
      blockId,
      kind,
      tone = "formal",
      length = "medium",
      sourceContext,
    } = body as {
      annualReportId: string; blockId?: string; kind: string;
      tone?: "formal" | "simplified"; length?: "short" | "medium" | "long";
      sourceContext?: Record<string, unknown>;
    };

    if (!annualReportId || !kind) return corsError("annualReportId + kind krävs", 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch report context
    const { data: report } = await sb.from("annual_reports").select("*").eq("id", annualReportId).maybeSingle();
    if (!report) return corsError("Utkast saknas", 404);

    const framework = (report.report_type || "k2").toUpperCase();
    const ctx = {
      framework,
      fiscal_year: report.fiscal_year,
      revenue: report.revenue,
      net_profit: report.net_profit,
      total_equity: report.total_equity,
      ...sourceContext,
    };

    const targetLen = length === "short" ? "80-140 ord" : length === "long" ? "300-500 ord" : "150-250 ord";
    const toneInstr = tone === "formal"
      ? "Formell, juridiskt korrekt ton enligt ÅRL och K2/K3."
      : "Klar och lättillgänglig svenska, men fortfarande korrekt enligt ÅRL.";

    const equitySign = (report.total_equity ?? 0) < 0 ? "negativt" : "positivt";
    const resultSign = (report.net_profit ?? 0) < 0 ? "förlust" : "vinst";

    const sysPrompt = [
      "Du är en svensk redovisningskonsult som skriver enligt ÅRL och K2/K3.",
      `Ramverk: ${framework}. Räkenskapsår: ${ctx.fiscal_year}.`,
      `Resultat: ${resultSign}. Eget kapital: ${equitySign}.`,
      `Ton: ${toneInstr}`,
      `Längd: ${targetLen}.`,
      "Om data saknas, skriv inte fiktiva siffror — säg 'data saknas'.",
      "Referera ÅRL-paragrafer eller K2/K3-allmänna råd i citations.",
    ].join("\n");

    const userPrompt = [
      `Skriv text för: ${kind}.`,
      `Kontext (JSON): ${JSON.stringify(ctx)}`,
    ].join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "produce_text" } },
      }),
    });

    if (aiResp.status === 429) return corsError("AI-rate limit nådd", 429);
    if (aiResp.status === 402) return corsError("AI-krediter slut", 402);
    if (!aiResp.ok) return corsError("AI-anrop misslyckades", 500);

    const j = await aiResp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return corsError("AI returnerade ingen text", 500);

    const parsed = JSON.parse(args) as { html: string; rationale: string; citations: Array<{ source: string; ref: string }> };

    // Persist rationale into block metadata if blockId provided.
    if (blockId) {
      const { data: existing } = await sb.from("ar_blocks").select("metadata, content").eq("id", blockId).maybeSingle();
      const meta = ((existing?.metadata as Record<string, unknown>) ?? {});
      const history = Array.isArray(meta.history) ? (meta.history as unknown[]).slice(-9) : [];
      history.push({ at: new Date().toISOString(), html: (existing?.content as { html?: string })?.html ?? "" });
      await sb.from("ar_blocks").update({
        content: { html: parsed.html },
        metadata: { ...meta, rationale: parsed.rationale, citations: parsed.citations, history },
        ai_generated: true,
        ai_confidence: 0.85,
      } as never).eq("id", blockId);
    }

    return corsJson(parsed);
  } catch (e) {
    console.error("ar-write-text error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
