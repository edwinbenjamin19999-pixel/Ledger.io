// supabase/functions/generate-annual-report-ai/index.ts
// Generates a full annual report draft using Lovable AI:
// - Förvaltningsberättelse (verksamhet, händelser, framtid, disposition)
// - Note content for required K2/K3 notes
// - Key-figure commentary
// Tone-mode: 'business_owner' (simple) | 'accountant' (technical)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIWithFallback, MODEL_CHAINS } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  annual_report_id: string;
  company_id: string;
  fiscal_year: number;
  framework: "K2" | "K3";
  tone_mode?: "business_owner" | "accountant";
  financials: {
    revenue: number;
    ebit: number;
    netResult: number;
    sumEK: number;
    rörelsemarginal: number;
    soliditet: number;
    balansomslutning: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as ReqBody;
    if (!body.annual_report_id || !body.company_id || !body.fiscal_year) {
      return new Response(JSON.stringify({ error: "missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPA_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPA_URL, SUPA_KEY);

    const { data: company } = await supa
      .from("companies")
      .select("name, org_number, business_description, industry")
      .eq("id", body.company_id)
      .maybeSingle();

    const tone = body.tone_mode || "accountant";
    const toneInstr = tone === "business_owner"
      ? "Skriv lättförståeligt på svenska. Förklara siffror i klartext. Undvik jargong."
      : "Skriv professionellt och formellt på svenska, anpassat för en revisor. Använd korrekt redovisningsterminologi.";

    const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");
    const f = body.financials;

    const systemPrompt = `Du är expert på svenska årsredovisningar enligt ${body.framework}.
${toneInstr}
Generera utkast till förvaltningsberättelse och kommentarer baserat på företagets siffror.
Var saklig — uppfinn aldrig siffror eller händelser. Om data saknas, skriv en neutral standardformulering.`;

    const userPrompt = `Företag: ${company?.name || "—"} (org. ${company?.org_number || "—"})
Bransch: ${company?.industry || "—"}
Beskrivning: ${company?.business_description || "—"}
Räkenskapsår: ${body.fiscal_year}
Regelverk: ${body.framework}

Nyckeltal:
- Nettoomsättning: ${fmt(f.revenue)} kr
- Rörelseresultat (EBIT): ${fmt(f.ebit)} kr (${f.rörelsemarginal.toFixed(1)}% marginal)
- Årets resultat: ${fmt(f.netResult)} kr
- Eget kapital: ${fmt(f.sumEK)} kr
- Balansomslutning: ${fmt(f.balansomslutning)} kr
- Soliditet: ${f.soliditet.toFixed(1)}%

Generera följande sektioner.`;

    const tools = [{
      type: "function",
      function: {
        name: "submit_annual_report_draft",
        description: "Returnera utkast för årsredovisningens textsektioner",
        parameters: {
          type: "object",
          properties: {
            forvaltning_verksamhet: { type: "string", description: "Allmänt om verksamheten — 2-4 meningar" },
            forvaltning_handelser: { type: "string", description: "Väsentliga händelser under räkenskapsåret — 2-3 meningar" },
            forvaltning_framtid: { type: "string", description: "Förväntad framtida utveckling — 1-2 meningar" },
            forvaltning_disposition: { type: "string", description: "Förslag till resultatdisposition — formellt format" },
            nyckeltal_kommentar: { type: "string", description: "Kort kommentar till nyckeltalsutvecklingen — 2-3 meningar" },
            note_redovisningsprinciper: { type: "string", description: "Standardtext för redovisningsprinciper enligt " + body.framework },
            note_avskrivningsprinciper: { type: "string", description: "Beskrivning av tillämpade avskrivningsprinciper" },
          },
          required: [
            "forvaltning_verksamhet",
            "forvaltning_handelser",
            "forvaltning_framtid",
            "forvaltning_disposition",
            "nyckeltal_kommentar",
            "note_redovisningsprinciper",
            "note_avskrivningsprinciper",
          ],
          additionalProperties: false,
        },
      },
    }];

    const result = await callAIWithFallback({
      primary: MODEL_CHAINS.complexReasoning.primary,
      fallbacks: [...MODEL_CHAINS.complexReasoning.fallbacks],
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "submit_annual_report_draft" } },
    });

    const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI returnerade inget utkast");
    const draft = JSON.parse(toolCall.function.arguments);

    // Persist into annual_reports.notes
    const { data: existing } = await supa.from("annual_reports").select("notes").eq("id", body.annual_report_id).maybeSingle();
    const merged = { ...((existing?.notes as any) || {}), ...draft, _ai_generated_at: new Date().toISOString(), _ai_model: result.modelUsed, _ai_tone: tone };
    const { error: upErr } = await supa.from("annual_reports").update({ notes: merged }).eq("id", body.annual_report_id);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, draft, model: result.modelUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-annual-report-ai", e);
    const msg = String(e?.message || e);
    const status = msg.includes("krediter slut") ? 402 : msg.includes("autentiseras") ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
