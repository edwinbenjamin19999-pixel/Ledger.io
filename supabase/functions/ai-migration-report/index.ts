/**
 * ai-migration-report
 * Generates a Swedish AI-written migration report (text) for a completed migration_job.
 * Uses Lovable AI Gateway (no API key needed).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error: jobErr } = await supabase
      .from("migration_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quality observations from data
    const [{ count: noOrgCustomers }, { count: invalidInvoices }] = await Promise.all([
      supabase
        .from("imported_customers")
        .select("*", { count: "exact", head: true })
        .eq("migration_job_id", jobId)
        .is("org_number", null),
      supabase
        .from("imported_customer_invoices")
        .select("*", { count: "exact", head: true })
        .eq("migration_job_id", jobId)
        .is("invoice_date", null),
    ]);

    const stats = job.stats || {};
    const dataSummary = `
Källsystem: ${job.source_system} (${job.source_format})
Datum: ${job.created_at}
Status: ${job.status}
Antal importerade poster:
- Kunder: ${stats.customers ?? 0}
- Leverantörer: ${stats.suppliers ?? 0}
- Kundfakturor: ${stats.customerInvoices ?? stats.invoices ?? 0}
- Leverantörsfakturor: ${stats.supplierInvoices ?? 0}
Datakvalitet:
- Kunder utan organisationsnummer: ${noOrgCustomers ?? 0}
- Kundfakturor med ogiltigt datum (hoppades över): ${invalidInvoices ?? 0}
- Errors loggade: ${Array.isArray(job.errors) ? job.errors.length : 0}
`.trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let report = "";

    if (LOVABLE_API_KEY) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Du är en svensk redovisningsexpert. Skriv en kort, professionell migreringsrapport på svenska. Använd tre tydliga sektioner: 'Sammanfattning', 'Observationer' (punktlista) och 'Rekommendationer' (punktlista). Var konkret, använd datan, undvik fluff. Max 350 ord.",
            },
            {
              role: "user",
              content: `Skapa en migreringsrapport baserat på följande data:\n\n${dataSummary}`,
            },
          ],
        }),
      });
      if (aiResp.ok) {
        const j = await aiResp.json();
        report = j.choices?.[0]?.message?.content?.trim() ?? "";
      } else {
        console.error("AI gateway error:", aiResp.status, await aiResp.text());
      }
    }

    if (!report) {
      // Fallback heuristic report
      const obs: string[] = [];
      if ((noOrgCustomers ?? 0) > 0)
        obs.push(`${noOrgCustomers} kunder saknade org.nummer och importerades utan`);
      if ((invalidInvoices ?? 0) > 0)
        obs.push(`${invalidInvoices} kundfakturor hade ogiltigt datum och hoppades över`);
      if (Array.isArray(job.errors) && job.errors.length)
        obs.push(`${job.errors.length} fel loggades under importen`);
      if (!obs.length) obs.push("Inga avvikelser upptäcktes — importen ser ren ut");

      report = [
        "Sammanfattning:",
        `Migrering från ${job.source_system} (${job.source_format}) genomfördes med status "${job.status}".`,
        `Totalt importerades ${stats.customers ?? 0} kunder, ${stats.suppliers ?? 0} leverantörer och ${
          (stats.customerInvoices ?? 0) + (stats.supplierInvoices ?? 0)
        } fakturor.`,
        "",
        "Observationer:",
        ...obs.map((o) => `• ${o}`),
        "",
        "Rekommendationer:",
        "• Granska kunder utan org.nummer — komplettera i kundregistret",
        "• Verifiera ingående balanser mot senaste bokslut",
        "• Stäm av första månadens transaktioner mot källsystemet innan ni går vidare",
      ].join("\n");
    }

    await supabase.from("migration_jobs").update({ ai_report: report }).eq("id", jobId);

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-migration-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
