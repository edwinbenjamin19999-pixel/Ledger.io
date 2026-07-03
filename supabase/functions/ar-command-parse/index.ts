// ar-command-parse — parses free-text commands into structured intents.
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "parse_command",
    description: "Parse a free-text annual-report command into a structured action.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "show_note", "add_note", "remove_note",
            "compare_year", "switch_framework",
            "export_pdf", "lock_section", "unlock_section",
            "run_validation", "explain", "scroll_to",
            "rewrite_section", "check_compliance", "show_ai_findings",
            "summarize_risks", "request_review",
          ],
        },
        target: { type: "string", description: "Note code, section type, or topic." },
        params: { type: "object", description: "Free-form params (year, framework, etc)." },
      },
      required: ["action"],
    },
  },
} as const;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { text } = await req.json();
    if (!text) return corsError("text krävs", 400);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Du tolkar svenska kommandon för en årsredovisnings-editor. Returnera ett strukturerat anrop." },
          { role: "user", content: text },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "parse_command" } },
      }),
    });

    if (aiResp.status === 429) return corsError("Rate limit nådd", 429);
    if (aiResp.status === 402) return corsError("Krediter slut", 402);
    if (!aiResp.ok) return corsError("AI-anrop misslyckades", 500);

    const j = await aiResp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return corsJson({ ok: false, intent: null });

    return corsJson({ ok: true, intent: JSON.parse(args) });
  } catch (e) {
    console.error("ar-command-parse error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
