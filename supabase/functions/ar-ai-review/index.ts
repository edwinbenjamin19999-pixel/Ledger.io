// ar-ai-review — AI compliance/narrative review producing ar_ai_findings.
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "report_findings",
    description: "Lista AI-fynd för en årsredovisning.",
    parameters: {
      type: "object",
      properties: {
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["narrative_mismatch", "missing_disclosure", "unusual_metric", "tone", "compliance"],
              },
              severity: { type: "string", enum: ["error", "warning", "info"] },
              title: { type: "string" },
              detail: { type: "string" },
              ai_confidence: { type: "number" },
              section_type_hint: { type: "string" },
            },
            required: ["category", "severity", "title", "detail"],
          },
        },
      },
      required: ["findings"],
    },
  },
} as const;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { annualReportId } = await req.json();
    if (!annualReportId) return corsError("annualReportId krävs", 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [{ data: report }, { data: sections }, { data: blocks }] = await Promise.all([
      sb.from("annual_reports").select("*").eq("id", annualReportId).maybeSingle(),
      sb.from("annual_report_sections").select("id, label, section_type, content").eq("annual_report_id", annualReportId),
      sb.from("ar_blocks").select("id, section_id, block_type, content").eq("annual_report_id", annualReportId),
    ]);
    if (!report) return corsError("Utkast saknas", 404);

    const summary = {
      framework: (report.report_type || "k2").toUpperCase(),
      revenue: report.revenue,
      net_profit: report.net_profit,
      total_equity: report.total_equity,
      sections: (sections ?? []).map((s: any) => ({ id: s.id, type: s.section_type, label: s.label })),
      block_count: (blocks ?? []).length,
      text_blocks: (blocks ?? [])
        .filter((b: any) => b.block_type === "text")
        .slice(0, 30)
        .map((b: any) => ({ section_id: b.section_id, html: (b.content?.html ?? "").slice(0, 1200) })),
    };

    const sysPrompt = [
      "Du är en svensk auktoriserad revisor som granskar årsredovisning.",
      "Identifiera fynd inom: narrativ vs siffror, saknade upplysningar, ovanliga nyckeltal, ton, compliance K2/K3.",
      "Var konkret. Skapa max 12 fynd. Severity 'error' endast vid lagbrott eller tydlig motsägelse.",
    ].join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: `Granska följande årsredovisning:\n${JSON.stringify(summary)}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "report_findings" } },
      }),
    });

    if (aiResp.status === 429) return corsError("AI-rate limit nådd", 429);
    if (aiResp.status === 402) return corsError("AI-krediter slut", 402);
    if (!aiResp.ok) return corsError("AI-anrop misslyckades", 500);

    const j = await aiResp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return corsJson({ created: 0, updated: 0, closed: 0 });
    const parsed = JSON.parse(args) as { findings: Array<{ category: string; severity: string; title: string; detail: string; ai_confidence?: number; section_type_hint?: string }> };

    // Close findings whose title is no longer reported.
    const titles = new Set(parsed.findings.map((f) => f.title));
    const { data: openFindings } = await sb.from("ar_ai_findings").select("id, title, status").eq("annual_report_id", annualReportId).eq("status", "open");
    const toClose = (openFindings ?? []).filter((f: any) => !titles.has(f.title)).map((f: any) => f.id);
    let closed = 0;
    if (toClose.length) {
      const { error } = await sb.from("ar_ai_findings").update({ status: "dismissed" }).in("id", toClose);
      if (!error) closed = toClose.length;
    }

    let created = 0;
    let updated = 0;
    for (const f of parsed.findings) {
      const existing = (openFindings ?? []).find((x: any) => x.title === f.title);
      const sectionId = (sections ?? []).find((s: any) => s.section_type === f.section_type_hint)?.id ?? null;
      if (existing) {
        await sb.from("ar_ai_findings").update({
          detail: f.detail, severity: f.severity, ai_confidence: f.ai_confidence ?? null,
        }).eq("id", existing.id);
        updated++;
      } else {
        const { error } = await sb.from("ar_ai_findings").insert({
          annual_report_id: annualReportId,
          section_id: sectionId,
          category: f.category,
          severity: f.severity,
          title: f.title,
          detail: f.detail,
          ai_confidence: f.ai_confidence ?? null,
        });
        if (!error) created++;
      }
    }

    return corsJson({ created, updated, closed });
  } catch (e) {
    console.error("ar-ai-review error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
