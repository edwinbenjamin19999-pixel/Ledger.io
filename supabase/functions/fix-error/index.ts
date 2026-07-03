import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Du är en expert React/TypeScript-utvecklare som specialiserar dig på att diagnostisera och åtgärda produktionsfel i en svensk bokföringsplattform (NorthLedger).

Du analyserar fel och returnerar ALLTID en strukturerad JSON-analys via tool-anropet 'submit_fix_analysis'.

Regler:
- confidence 90-100: säker fix, kan auto-deployas
- confidence 70-89: kräver manuell granskning
- confidence < 70: sätt requiresManualReview = true
- Om felet rör databas, autentisering, betalningar, moms, bokföringslogik eller skatteverket: sätt ALLTID requiresManualReview = true och confidence < 50
- 'analysis' och 'fixDescription' skrivs på svenska (kort, max 2 meningar vardera)
- 'rootCause' skrivs på engelska för loggning
- 'fixedCode' ska vara komplett, kompilerbar TypeScript/TSX för hela filen som anges i 'filename'
- Om du inte kan identifiera filen säkert eller felet saknar tillräckligt med kontext: sätt requiresManualReview = true, confidence < 40, och förklara varför i 'analysis'`;

interface ErrorPayload {
  errorId?: string;
  message?: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  timestamp?: string;
  breadcrumbs?: Array<{ description?: string; timestamp?: string }>;
}

const FIX_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_fix_analysis",
    description: "Returnera analys och föreslagen fix för det rapporterade felet.",
    parameters: {
      type: "object",
      properties: {
        analysis: { type: "string", description: "Kort förklaring (svenska) av vad som gick fel." },
        rootCause: { type: "string", description: "Teknisk rotorsak (engelska)." },
        fixDescription: { type: "string", description: "Vad fixen gör (svenska, 1 mening)." },
        fixedCode: { type: "string", description: "Komplett rättad kod för filen." },
        filename: { type: "string", description: "Filsökväg, t.ex. 'src/components/Foo.tsx'." },
        affectedLines: { type: "string", description: "Berörda rader, t.ex. '142-156'." },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        requiresManualReview: { type: "boolean" },
      },
      required: [
        "analysis",
        "rootCause",
        "fixDescription",
        "fixedCode",
        "filename",
        "confidence",
        "requiresManualReview",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== "POST") return corsError("Method not allowed", 405);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return corsError("LOVABLE_API_KEY not configured", 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let payload: ErrorPayload;
  try {
    payload = await req.json();
  } catch {
    return corsError("Invalid JSON body", 400);
  }

  if (!payload?.errorId || !payload?.message) {
    return corsError("Missing errorId or message", 400);
  }

  // Mark as analyzing
  await supabase
    .from("error_logs")
    .update({ fix_status: "analyzing" })
    .eq("error_id", payload.errorId);

  const breadcrumbsText = (payload.breadcrumbs ?? [])
    .map((b) => `- ${b.description ?? ""} (${b.timestamp ?? ""})`)
    .join("\n") || "Inga breadcrumbs";

  const userPrompt = `FELRAPPORT
Error ID: ${payload.errorId}
URL: ${payload.url ?? "okänd"}
Tidpunkt: ${payload.timestamp ?? "okänd"}
Felmeddelande: ${payload.message}

STACK TRACE:
${(payload.stack ?? "Ej tillgänglig").slice(0, 3500)}

KOMPONENTSTACK:
${(payload.componentStack ?? "Ej tillgänglig").slice(0, 2000)}

SENASTE ANVÄNDARAKTIONER:
${breadcrumbsText}

Anropa submit_fix_analysis med din analys och föreslagna fix.`;

  let aiResp: Response;
  try {
    aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [FIX_TOOL],
        tool_choice: { type: "function", function: { name: "submit_fix_analysis" } },
      }),
    });
  } catch (err) {
    await supabase
      .from("error_logs")
      .update({ fix_status: "failed" })
      .eq("error_id", payload.errorId);
    return corsError(`AI gateway request failed: ${String(err)}`, 502);
  }

  if (!aiResp.ok) {
    await supabase
      .from("error_logs")
      .update({ fix_status: "failed" })
      .eq("error_id", payload.errorId);

    if (aiResp.status === 429) {
      return corsError("AI är överbelastad just nu. Försök igen om en stund.", 429);
    }
    if (aiResp.status === 402) {
      return corsError("AI-krediterna är slut. Lägg till mer i Workspace → Usage.", 402);
    }
    const text = await aiResp.text().catch(() => "");
    console.error("[fix-error] AI gateway error:", aiResp.status, text);
    return corsError("AI-tjänsten kunde inte svara.", 502);
  }

  const aiJson = await aiResp.json();
  const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
  const argsRaw = toolCall?.function?.arguments;

  let fixData: {
    analysis?: string;
    rootCause?: string;
    fixDescription?: string;
    fixedCode?: string;
    filename?: string;
    affectedLines?: string;
    confidence?: number;
    requiresManualReview?: boolean;
  } | null = null;

  if (typeof argsRaw === "string") {
    try {
      fixData = JSON.parse(argsRaw);
    } catch (e) {
      console.error("[fix-error] tool args parse failed:", e);
    }
  }

  if (!fixData?.analysis) {
    await supabase
      .from("error_logs")
      .update({ fix_status: "failed" })
      .eq("error_id", payload.errorId);
    return corsJson(
      { status: "failed", analysis: "AI kunde inte analysera felet." },
      200,
    );
  }

  const finalStatus = fixData.requiresManualReview ? "manual" : "fixed";

  const { error: upErr } = await supabase
    .from("error_logs")
    .update({
      fix_status: finalStatus,
      fix_analysis: fixData.analysis ?? null,
      fix_root_cause: fixData.rootCause ?? null,
      fix_description: fixData.fixDescription ?? null,
      fix_code: fixData.fixedCode ?? null,
      fix_filename: fixData.filename ?? null,
      fix_affected_lines: fixData.affectedLines ?? null,
      fix_confidence:
        typeof fixData.confidence === "number"
          ? Math.max(0, Math.min(100, Math.round(fixData.confidence)))
          : null,
      fix_requires_manual_review: !!fixData.requiresManualReview,
    })
    .eq("error_id", payload.errorId);

  if (upErr) {
    console.error("[fix-error] update failed:", upErr);
    return corsError(upErr.message, 500);
  }

  return corsJson({
    status: "complete",
    analysis: fixData.analysis,
    fixDescription: fixData.fixDescription,
    confidence: fixData.confidence,
    requiresManualReview: fixData.requiresManualReview,
    filename: fixData.filename,
  });
});
