// ar-copilot-stream — SSE chat for the AR v2 right-panel co-pilot.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface Msg { role: "user" | "assistant" | "system"; content: string }

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { annualReportId, companyId, messages } = (await req.json()) as {
      annualReportId: string; companyId: string; messages: Msg[];
    };
    if (!annualReportId || !companyId) return corsError("annualReportId och companyId krävs", 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Build minimal context
    const { data: report } = await sb
      .from("annual_reports")
      .select("fiscal_year, report_type, total_assets, total_equity, total_liabilities, revenue, net_profit")
      .eq("id", annualReportId)
      .single();

    const { data: validations } = await sb
      .from("ar_validations")
      .select("rule_code, severity, message")
      .eq("annual_report_id", annualReportId)
      .is("resolved_at", null)
      .limit(20);

    const systemPrompt = `Du är en svensk AI-assistent specialiserad på årsredovisningar enligt ${report?.report_type ?? "K2"} och ÅRL.
Hjälp användaren förstå och förbättra deras årsredovisning för räkenskapsår ${report?.fiscal_year ?? ""}.

NUVARANDE NYCKELTAL:
- Omsättning: ${report?.revenue ?? "okänt"} SEK
- Årets resultat: ${report?.net_profit ?? "okänt"} SEK
- Tillgångar: ${report?.total_assets ?? "okänt"} SEK
- Eget kapital: ${report?.total_equity ?? "okänt"} SEK

AKTIVA VARNINGAR (${validations?.length ?? 0}):
${(validations || []).map((v: { severity: string; message: string }) => `- [${v.severity}] ${v.message}`).join("\n")}

REGLER:
- Svara på svenska, formell men koncis.
- När du refererar till ett block, använd format: [block:UUID].
- Föreslå konkreta åtgärder.
- Om du inte vet, säg det istället för att gissa.`;

    // Annual report copilot uses longContext chain (Gemini 2.5 Pro primary)
    // for whole-document reasoning + Swedish K2/K3 nuance.
    try {
      const { callAIStreamWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
      const { body, modelUsed } = await callAIStreamWithFallback({
        ...MODEL_CHAINS.longContext,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.3,
      });
      console.log(`[ar-copilot-stream] modelUsed=${modelUsed}`);
      return new Response(body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return corsError(msg, 402);
      if (msg.includes("autentiseras")) return corsError(msg, 401);
      console.error("[ar-copilot-stream] all models failed", e);
      return corsError("AI-tjänsten är överbelastad. Försök igen om en stund.", 503);
    }
  } catch (e) {
    console.error("ar-copilot-stream error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
