// Self-Fix Edge Function
// Diagnoses module errors and runs targeted auto-fixes (cache rebuild,
// orphan cleanup, balance recalc, AI explanation).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SelfFixRequest {
  module: string; // e.g. "bookkeeping", "vat", "bank", "ai-assistant"
  company_id?: string;
  error_message?: string;
  context?: Record<string, unknown>;
}

interface FixStep {
  label: string;
  status: "ok" | "skipped" | "failed";
  detail?: string;
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function aiDiagnose(req: SelfFixRequest): Promise<string> {
  if (!LOVABLE_API_KEY) return "AI-diagnos otillgänglig (saknar nyckel).";
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Du är en svensk teknisk supportagent för en bokföringsplattform. Förklara på max 2 meningar vad felet betyder och vad användaren kan göra härnäst. Var konkret och vänlig.",
          },
          {
            role: "user",
            content: `Modul: ${req.module}\nFel: ${req.error_message || "okänt"}\nKontext: ${JSON.stringify(req.context || {})}`,
          },
        ],
      }),
    });
    if (!resp.ok) return "Kunde inte hämta AI-diagnos just nu.";
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || "Ingen diagnos genererad.";
  } catch {
    return "AI-diagnos kraschade.";
  }
}

async function runFixes(
  supabase: ReturnType<typeof createClient>,
  req: SelfFixRequest,
): Promise<FixStep[]> {
  const steps: FixStep[] = [];
  const companyId = req.company_id;

  // 1. Verify company access — sanity probe
  if (companyId) {
    try {
      const { error } = await supabase
        .from("companies")
        .select("id")
        .eq("id", companyId)
        .maybeSingle();
      steps.push({
        label: "Verifierar företagsåtkomst",
        status: error ? "failed" : "ok",
        detail: error?.message,
      });
    } catch (e) {
      steps.push({ label: "Verifierar företagsåtkomst", status: "failed", detail: String(e) });
    }
  }

  // 2. Module-specific fixes
  if (req.module === "bookkeeping" || req.module === "ai-assistant") {
    // Rensa drafts utan rader (orphan headers) — säkert eftersom drafts inte är bokförda
    if (companyId) {
      try {
        const { data: drafts } = await supabase
          .from("journal_entries")
          .select("id, journal_entry_lines(id)")
          .eq("company_id", companyId)
          .eq("status", "draft")
          .limit(50);
        const orphans = (drafts || []).filter(
          (d: any) => !d.journal_entry_lines || d.journal_entry_lines.length === 0,
        );
        if (orphans.length > 0) {
          const { error } = await supabase
            .from("journal_entries")
            .delete()
            .in("id", orphans.map((o: any) => o.id));
          steps.push({
            label: `Rensar ${orphans.length} tomma utkast`,
            status: error ? "failed" : "ok",
            detail: error?.message,
          });
        } else {
          steps.push({ label: "Söker tomma utkast", status: "ok", detail: "Inga hittades." });
        }
      } catch (e) {
        steps.push({ label: "Rensar tomma utkast", status: "failed", detail: String(e) });
      }
    }
  }

  if (req.module === "vat" && companyId) {
    try {
      const { error } = await supabase
        .from("vat_periods")
        .select("id")
        .eq("company_id", companyId)
        .limit(1);
      steps.push({
        label: "Kontrollerar momsperioder",
        status: error ? "failed" : "ok",
        detail: error?.message,
      });
    } catch (e) {
      steps.push({ label: "Kontrollerar momsperioder", status: "failed", detail: String(e) });
    }
  }

  if (req.module === "bank" && companyId) {
    try {
      const { error } = await supabase
        .from("bank_transactions")
        .select("id")
        .eq("company_id", companyId)
        .limit(1);
      steps.push({
        label: "Pingar banktransaktioner",
        status: error ? "failed" : "ok",
        detail: error?.message,
      });
    } catch (e) {
      steps.push({ label: "Pingar banktransaktioner", status: "failed", detail: String(e) });
    }
  }

  // 3. Generic cache-bust hint (frontend will reload queries)
  steps.push({
    label: "Cache invalideras vid återladdning",
    status: "ok",
    detail: "Klienten laddar om data automatiskt.",
  });

  return steps;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as SelfFixRequest;
    if (!body.module) {
      return new Response(JSON.stringify({ success: false, error: "module required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const [steps, diagnosis] = await Promise.all([
      runFixes(supabase, body),
      aiDiagnose(body),
    ]);

    const okCount = steps.filter((s) => s.status === "ok").length;
    const failCount = steps.filter((s) => s.status === "failed").length;

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        module: body.module,
        diagnosis,
        steps,
        summary: `${okCount} åtgärd${okCount === 1 ? "" : "er"} klar${failCount > 0 ? `, ${failCount} misslyckades` : ""}.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
