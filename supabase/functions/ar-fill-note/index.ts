// ar-fill-note — generates Swedish K2/K3 note text from bookkeeping context.
// Receives noteCode + resolved fields and returns formal legal text.
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "fill_note",
    description: "Returnera not-text och uppdaterade fältförslag.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Notens brödtext i svensk juridisk stil." },
        suggested_field_values: {
          type: "object",
          description: "Förslag på värden för fält som inte kunde auto-hämtas.",
          additionalProperties: { type: "string" },
        },
        warnings: {
          type: "array",
          items: { type: "string" },
          description: "Varningar/anmärkningar (t.ex. saknad data, behov av manuell granskning).",
        },
      },
      required: ["text", "warnings"],
    },
  },
} as const;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      noteCode,
      noteTitle,
      framework = "K2",
      fiscalYear,
      defaultText = "",
      aiPrompt = "",
      resolvedFields = [],
    } = body as {
      noteCode: string;
      noteTitle: string;
      framework: "K2" | "K3";
      fiscalYear: number;
      defaultText: string;
      aiPrompt: string;
      resolvedFields: Array<{ key: string; label: string; value: number | null; description: string }>;
    };

    if (!noteCode) return corsError("noteCode krävs", 400);

    const fieldsContext = resolvedFields
      .map((f) => `- ${f.label} (${f.key}): ${f.value != null ? f.value.toLocaleString("sv-SE") + " kr" : "saknas"} — ${f.description}`)
      .join("\n");

    const sysPrompt = [
      "Du är en svensk redovisningskonsult som skriver enligt ÅRL och K2/K3.",
      `Ramverk: ${framework}. Räkenskapsår: ${fiscalYear}.`,
      "Skriv formell juridisk svenska, korrekt enligt BFNAR.",
      "Använd belopp i hela kronor med svenska tusentalsavgränsare (mellanslag).",
      "Om data saknas, skriv inte fiktiva siffror — markera 'data saknas' och lägg till en varning.",
      "Avsluta ALLTID med disclaimer-fri text — disclaimern visas separat i UI.",
    ].join("\n");

    const userPrompt = [
      `Generera not-text för: "${noteTitle}" (${noteCode}).`,
      `Anvisningar: ${aiPrompt}`,
      `Mall (för struktur): ${defaultText}`,
      "",
      "Auto-resolverade fältvärden:",
      fieldsContext || "(inga)",
      "",
      "Producera komplett notebrödtext. Returnera även förslag på fält som behöver manuell granskning i suggested_field_values.",
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
        tool_choice: { type: "function", function: { name: "fill_note" } },
      }),
    });

    if (aiResp.status === 429) return corsError("AI-rate limit nådd, försök igen senare.", 429);
    if (aiResp.status === 402) return corsError("AI-krediter slut — fyll på i Inställningar.", 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return corsError("AI-anrop misslyckades", 500);
    }

    const j = await aiResp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return corsError("AI returnerade ingen text", 500);

    const parsed = JSON.parse(args) as {
      text: string;
      suggested_field_values?: Record<string, string>;
      warnings: string[];
    };

    return corsJson(parsed);
  } catch (e) {
    console.error("ar-fill-note error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
