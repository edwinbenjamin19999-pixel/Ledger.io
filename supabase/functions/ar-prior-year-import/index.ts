// ar-prior-year-import — extracts structure from a prior-year PDF using Gemini Vision.
// Returns a suggestion payload only (no DB writes); the client confirms.
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "extract_ar_structure",
    description: "Extract section + note structure and writing style from a prior-year annual report.",
    parameters: {
      type: "object",
      properties: {
        framework: { type: "string", enum: ["K2", "K3"] },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              section_type: { type: "string", enum: ["forvaltning", "rr", "br", "kf", "eget_kapital", "noter", "note", "signering", "fastställelse", "custom"] },
              label: { type: "string" },
              order: { type: "number" },
            },
            required: ["section_type", "label", "order"],
          },
        },
        notes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              title: { type: "string" },
              order: { type: "number" },
            },
            required: ["title", "order"],
          },
        },
        style: { type: "string", description: "Skriftstil 1-2 meningar (formell/informell, kort/utförlig)." },
      },
      required: ["sections", "notes", "style"],
    },
  },
} as const;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { filePath } = await req.json();
    if (!filePath) return corsError("filePath krävs", 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: signed, error: sErr } = await sb.storage.from("annual-report-attachments").createSignedUrl(filePath, 600);
    if (sErr || !signed) return corsError("Kunde inte läsa fil", 404);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Du extraherar struktur från svenska årsredovisningar." },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrahera sektion-struktur, noter och skriftstil från denna årsredovisning." },
              { type: "image_url", image_url: { url: signed.signedUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_ar_structure" } },
      }),
    });

    if (aiResp.status === 429) return corsError("Rate limit nådd", 429);
    if (aiResp.status === 402) return corsError("Krediter slut", 402);
    if (!aiResp.ok) return corsError("AI-anrop misslyckades", 500);

    const j = await aiResp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return corsError("Ingen struktur kunde extraheras", 422);

    const parsed = JSON.parse(args);
    return corsJson({ ok: true, suggestion: parsed });
  } catch (e) {
    console.error("ar-prior-year-import error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
