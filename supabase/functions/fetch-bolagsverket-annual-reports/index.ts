import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Fetches the 3 most recent annual reports from Bolagsverket for a company,
 * downloads the PDFs and stores them in the `documents` storage bucket plus
 * metadata rows in `bolagsverket_documents`.
 *
 * Called automatically when a new company is added (fire-and-forget).
 */
const TOKEN_URL = "https://portal.api.bolagsverket.se/oauth2/token";
const API_BASE = "https://gw.api.bolagsverket.se/vardefulla-datamangder/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const clientId = Deno.env.get("BOLAGSVERKET_CLIENT_ID");
  const clientSecret = Deno.env.get("BOLAGSVERKET_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Bolagsverket credentials not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });
  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyId, orgNumber } = await req.json();
    if (!companyId || !orgNumber) throw new Error("companyId and orgNumber required");

    const cleanOrgNr = String(orgNumber).replace(/\D/g, "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = await getToken();

    // 1) Fetch document list
    const listRes = await fetch(`${API_BASE}/dokumentlista`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ identitetsbeteckning: cleanOrgNr }),
    });

    if (!listRes.ok) {
      if (listRes.status === 404) {
        return new Response(JSON.stringify({ ok: true, count: 0, message: "Inga dokument" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Bolagsverket list error ${listRes.status}: ${await listRes.text()}`);
    }

    const listData = await listRes.json();
    const docs: any[] = Array.isArray(listData?.dokument) ? listData.dokument : [];

    // Filter annual reports & sort by period descending, take top 3
    const annualReports = docs
      .filter((d) => {
        const t = String(d?.dokumenttyp || d?.typ || "").toLowerCase();
        return t.includes("årsred") || t.includes("annual") || t.includes("ar ");
      })
      .sort((a, b) => String(b?.periodSlut || "").localeCompare(String(a?.periodSlut || "")))
      .slice(0, 3);

    let saved = 0;
    for (const doc of annualReports) {
      const documentId = doc.dokumentid || doc.dokumentId;
      const periodEnd = doc.periodSlut || doc.periodEnd || null;
      const fiscalYear = periodEnd ? Number(String(periodEnd).slice(0, 4)) : null;
      if (!documentId) continue;

      try {
        // Skip if already saved
        const { data: existing } = await supabase
          .from("bolagsverket_documents")
          .select("id")
          .eq("company_id", companyId)
          .eq("document_id", documentId)
          .maybeSingle();
        if (existing) continue;

        // Download PDF
        const pdfRes = await fetch(`${API_BASE}/dokument/${documentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pdfRes.ok) continue;
        const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());

        const filePath = `${companyId}/bolagsverket/arsred-${fiscalYear || documentId}.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from("documents")
          .upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true });
        if (uploadErr) {
          console.error("Upload failed", uploadErr);
          continue;
        }

        await supabase.from("bolagsverket_documents").insert({
          company_id: companyId,
          document_id: documentId,
          document_type: "annual_report",
          fiscal_year: fiscalYear,
          period_end: periodEnd,
          storage_path: filePath,
          source: "bolagsverket",
        });

        saved++;
      } catch (e) {
        console.error(`Doc ${documentId} failed:`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, count: saved, total_found: annualReports.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-bolagsverket-annual-reports error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
