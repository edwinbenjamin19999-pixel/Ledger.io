import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { corsHeaders } from "../_shared/cors.ts"

// Fetches annual reports from Bolagsverket and stores them in Supabase Storage
// Called after company creation during onboarding

const TOKEN_URL = "https://portal.api.bolagsverket.se/oauth2/token"
const API_BASE = "https://gw.api.bolagsverket.se/vardefulla-datamangder/v1"

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }

  const clientId = Deno.env.get("BOLAGSVERKET_CLIENT_ID")
  const clientSecret = Deno.env.get("BOLAGSVERKET_CLIENT_SECRET")

  if (!clientId || !clientSecret) {
    throw new Error("BOLAGSVERKET_CLIENT_ID and BOLAGSVERKET_CLIENT_SECRET must be configured")
  }

  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "NorthLedger/1.0",
      "Accept": "application/json",
    },
    body: "grant_type=client_credentials&scope=vardefulla-datamangder:read",
  })

  if (!response.ok) {
    throw new Error(`Token request failed [${response.status}]`)
  }

  const data = await response.json()
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { companyId, orgNumber, maxReports = 3 } = await req.json()

    if (!companyId || !orgNumber) {
      return new Response(JSON.stringify({ error: "companyId and orgNumber required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const cleanOrgNr = orgNumber.replace(/[\s-]/g, "")
    console.log(`[FETCH-REPORTS] Fetching reports for ${cleanOrgNr}, company ${companyId}`)

    // Step 1: Get document list from Bolagsverket
    const token = await getAccessToken()
    const docListResponse = await fetch(`${API_BASE}/dokumentlista`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identitetsbeteckning: cleanOrgNr }),
    })

    if (!docListResponse.ok) {
      if (docListResponse.status === 404) {
        return new Response(JSON.stringify({ 
          success: true, reports: [], message: "Inga dokument hittades hos Bolagsverket" 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      throw new Error(`Document list failed [${docListResponse.status}]`)
    }

    const docListData = await docListResponse.json()
    const documents = docListData?.dokument || []

    if (!Array.isArray(documents) || documents.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, reports: [], message: "Inga årsredovisningar hittades" 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Sort by period end (newest first) and take top N
    const sorted = documents
      .filter((d: any) => d.dokumentid || d.dokumentId)
      .sort((a: any, b: any) => {
        const aPeriod = a.rapporteringsperiodtom || ""
        const bPeriod = b.rapporteringsperiodtom || ""
        return bPeriod.localeCompare(aPeriod)
      })
      .slice(0, maxReports)

    console.log(`[FETCH-REPORTS] Found ${documents.length} documents, processing top ${sorted.length}`)

    const results: any[] = []

    for (const doc of sorted) {
      const documentId = doc.dokumentid || doc.dokumentId
      const periodEnd = doc.rapporteringsperiodtom || "unknown"
      const registeredAt = doc.registreringstidpunkt || null
      const fileFormat = doc.filformat || "application/pdf"

      try {
        // Check if already fetched
        const { data: existing } = await supabaseAdmin
          .from("company_annual_reports")
          .select("id, fetch_status")
          .eq("company_id", companyId)
          .eq("document_id", documentId)
          .maybeSingle()

        if (existing && existing.fetch_status === "completed") {
          console.log(`[FETCH-REPORTS] Document ${documentId} already fetched, skipping`)
          results.push({ documentId, status: "already_exists", periodEnd })
          continue
        }

        // Insert or update metadata record
        const { data: reportRecord, error: upsertError } = await supabaseAdmin
          .from("company_annual_reports")
          .upsert({
            company_id: companyId,
            document_id: documentId,
            fiscal_year_end: periodEnd,
            file_format: fileFormat,
            registered_at: registeredAt,
            fetch_status: "fetching",
          }, { onConflict: "company_id,document_id" })
          .select("id")
          .maybeSingle()

        if (upsertError) {
          console.error(`[FETCH-REPORTS] Upsert error for ${documentId}:`, upsertError)
          results.push({ documentId, status: "error", error: upsertError.message })
          continue
        }

        // Step 2: Download the document
        const docResponse = await fetch(`${API_BASE}/dokument/${documentId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/zip, application/pdf, */*",
          },
        })

        if (!docResponse.ok) {
          await supabaseAdmin
            .from("company_annual_reports")
            .update({ fetch_status: "error", error_message: `Download failed: ${docResponse.status}` })
            .eq("id", reportRecord.id)

          results.push({ documentId, status: "download_failed", periodEnd })
          continue
        }

        const contentType = docResponse.headers.get("content-type") || "application/octet-stream"
        const blob = await docResponse.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const fileBytes = new Uint8Array(arrayBuffer)

        // Determine file extension
        const ext = contentType.includes("zip") ? "zip" : contentType.includes("pdf") ? "pdf" : "bin"
        const storagePath = `${companyId}/annual-reports/${periodEnd}-${documentId}.${ext}`

        // Step 3: Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("documents")
          .upload(storagePath, fileBytes, {
            contentType,
            upsert: true,
          })

        if (uploadError) {
          console.error(`[FETCH-REPORTS] Upload error:`, uploadError)
          await supabaseAdmin
            .from("company_annual_reports")
            .update({ fetch_status: "error", error_message: `Upload failed: ${uploadError.message}` })
            .eq("id", reportRecord.id)

          results.push({ documentId, status: "upload_failed", periodEnd })
          continue
        }

        // Step 4: Update record with storage path and size
        await supabaseAdmin
          .from("company_annual_reports")
          .update({
            storage_path: storagePath,
            file_size: fileBytes.length,
            fetch_status: "completed",
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reportRecord.id)

        console.log(`[FETCH-REPORTS] Successfully stored ${documentId} (${periodEnd}) - ${fileBytes.length} bytes`)
        results.push({ documentId, status: "completed", periodEnd, size: fileBytes.length })

      } catch (docError) {
        console.error(`[FETCH-REPORTS] Error processing ${documentId}:`, docError)
        results.push({ documentId, status: "error", periodEnd, error: String(docError) })
      }
    }

    const completed = results.filter(r => r.status === "completed").length
    console.log(`[FETCH-REPORTS] Done: ${completed}/${results.length} reports fetched`)

    return new Response(JSON.stringify({
      success: true,
      totalDocuments: documents.length,
      processed: results.length,
      completed,
      reports: results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error) {
    console.error("[FETCH-REPORTS] Error:", error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Ett fel uppstod",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
