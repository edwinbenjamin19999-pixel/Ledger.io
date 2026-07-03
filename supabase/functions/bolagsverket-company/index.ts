import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Bolagsverket Värdefulla Datamängder API - FREE
const TOKEN_URL = "https://portal.api.bolagsverket.se/oauth2/token"
const API_BASE = "https://gw.api.bolagsverket.se/vardefulla-datamangder/v1"

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

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
    const errorText = await response.text()
    throw new Error(`Token request failed [${response.status}]: ${errorText}`)
  }

  const data: TokenResponse = await response.json()

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

async function fetchCompany(cleanOrgNr: string, token: string) {
  const response = await fetch(`${API_BASE}/organisationer`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identitetsbeteckning: cleanOrgNr }),
  })

  if (!response.ok) {
    if (response.status === 404) return { found: false, raw: null }
    const errText = await response.text()
    throw new Error(`Bolagsverket API error [${response.status}]: ${errText}`)
  }

  const data = await response.json()
  const orgs = data?.organisationer
  if (!orgs || orgs.length === 0) return { found: false, raw: null }
  return { found: true, raw: orgs[0] }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { orgNumber, action = "company" } = body

    if (!orgNumber) {
      return new Response(
        JSON.stringify({ error: "Organisationsnummer krävs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const cleanOrgNr = orgNumber.replace(/[\s-]/g, "")

    if (!/^\d{10}$/.test(cleanOrgNr)) {
      return new Response(
        JSON.stringify({ error: "Ogiltigt format. Använd 10 siffror." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const token = await getAccessToken()

    if (action === "company") {
      const { found, raw } = await fetchCompany(cleanOrgNr, token)
      if (!found) {
        return new Response(
          JSON.stringify({ orgNumber: cleanOrgNr, found: false, message: "Företaget hittades inte" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      const parsed = parseCompanyData(raw, cleanOrgNr)
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "full") {
      // Combined: company + engagements + signatories in ONE response
      const { found, raw } = await fetchCompany(cleanOrgNr, token)
      if (!found) {
        return new Response(
          JSON.stringify({
            orgNumber: cleanOrgNr,
            found: false,
            message: "Företaget hittades inte",
            engagementsAvailable: false,
            engagements: [],
            signatories: null,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const parsed = parseCompanyData(raw, cleanOrgNr)
      const apiKey = Deno.env.get("BOLAGSVERKET_FORETAGSINFO_API_KEY")
      const engagementsAvailable = !!apiKey

      // No paid API → no engagements. Inga gissningar.
      const result = {
        ...parsed,
        rawBolagsverket: raw,
        engagementsAvailable,
        engagementsMessage: engagementsAvailable
          ? "Engagemangs-API är konfigurerat men inte implementerat ännu."
          : "Ledamöter & firmatecknare kräver Bolagsverkets betalda API – kontakta support för aktivering.",
        engagements: [],
        signatories: null,
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "documents") {
      const response = await fetch(`${API_BASE}/dokumentlista`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identitetsbeteckning: cleanOrgNr }),
      })

      if (!response.ok) {
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ orgNumber: cleanOrgNr, documents: [], message: "Inga dokument hittades" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        const errText = await response.text()
        throw new Error(`Bolagsverket documents API error [${response.status}]: ${errText}`)
      }

      const data = await response.json()
      const documents = parseDocumentList(data)

      return new Response(JSON.stringify({ orgNumber: cleanOrgNr, documents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "document") {
      const { documentId } = body
      if (!documentId) {
        return new Response(
          JSON.stringify({ error: "documentId krävs" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const response = await fetch(`${API_BASE}/dokument/${documentId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/zip, application/pdf",
        },
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Document download failed [${response.status}]: ${errText}`)
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream"
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      return new Response(
        JSON.stringify({ documentId, contentType, data: base64, size: arrayBuffer.byteLength }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (action === "engagements" || action === "signatories") {
      const apiKey = Deno.env.get("BOLAGSVERKET_FORETAGSINFO_API_KEY")
      if (!apiKey) {
        return new Response(JSON.stringify({
          orgNumber: cleanOrgNr,
          engagements: [],
          signatories: null,
          available: false,
          message: "Engagemangs-API (betalt) är inte konfigurerat. Konfigurera BOLAGSVERKET_FORETAGSINFO_API_KEY för att aktivera.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      return new Response(JSON.stringify({
        orgNumber: cleanOrgNr,
        engagements: [],
        signatories: null,
        available: true,
        message: "Engagemangs-API är konfigurerat men inte implementerat ännu.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(
      JSON.stringify({ error: "Ogiltig action. Använd: company, full, documents, document, engagements, signatories" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Bolagsverket API error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Ett fel uppstod",
        requiresManualEntry: true,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

function parseCompanyData(org: any, orgNumber: string) {
  let companyName = ""
  const allNames: { name: string; type: string }[] = []
  let businessDescription = ""

  const namnData = org.organisationsnamn
  if (namnData?.organisationsnamnLista) {
    for (const nameObj of namnData.organisationsnamnLista) {
      const name = nameObj.namn || ""
      const type = nameObj.organisationsnamntyp?.kod || "FORETAGSNAMN"
      allNames.push({ name, type })
      if (!companyName || type === "FORETAGSNAMN") {
        companyName = name
      }
      if (nameObj.verksamhetsbeskrivningSarskiltForetagsnamn) {
        businessDescription = nameObj.verksamhetsbeskrivningSarskiltForetagsnamn
      }
    }
  }

  const addrData = org.postadressOrganisation?.postadress
  const address = addrData?.utdelningsadress || ""
  const postalCode = addrData?.postnummer || ""
  const city = addrData?.postort || ""

  const sniCodes: { code: string; description: string }[] = []
  const sniData = org.naringsgrenOrganisation?.sni
  if (Array.isArray(sniData)) {
    for (const s of sniData) {
      const code = (s.kod || "").trim()
      if (code) {
        sniCodes.push({ code, description: s.klartext || "" })
      }
    }
  }

  const orgFormParsed = org.organisationsform
    ? { code: org.organisationsform.kod || "", description: org.organisationsform.klartext || "" }
    : null

  const legalForm = org.juridiskForm
    ? { code: org.juridiskForm.kod || "", description: org.juridiskForm.klartext || "" }
    : null

  const isDeregistered = !!org.avregistreradOrganisation
  const deregistrationDate = org.avregistreradOrganisation?.datum || null
  const deregistrationReason = org.avregistreringsorsak?.klartext || null
  const isActive = org.verksamOrganisation?.kod === "JA"
  const registrationDate = org.organisationsdatum?.registreringsdatum || null

  if (!businessDescription && org.verksamhetsbeskrivning?.beskrivning) {
    businessDescription = org.verksamhetsbeskrivning.beskrivning
  }

  const adBlock = org.reklamsparr?.kod === "JA"

  return {
    found: true,
    orgNumber,
    name: companyName,
    allNames,
    address,
    postalCode,
    city,
    vatNumber: `SE${orgNumber}01`,
    sniCodes,
    organizationForm: orgFormParsed,
    legalForm,
    businessDescription,
    isActive: !isDeregistered && isActive,
    isDeregistered,
    deregistrationDate,
    deregistrationReason,
    registrationDate,
    adBlock,
    source: "bolagsverket",
    requiresManualEntry: false,
  }
}

function parseDocumentList(data: any) {
  const documents: any[] = []
  const docList = data?.dokument
  if (!Array.isArray(docList)) return documents

  for (const doc of docList) {
    documents.push({
      documentId: doc.dokumentid || doc.dokumentId,
      fileFormat: doc.filformat || "application/pdf",
      periodEnd: doc.rapporteringsperiodtom || null,
      registeredAt: doc.registreringstidpunkt || null,
    })
  }

  documents.sort((a, b) => {
    if (!a.periodEnd || !b.periodEnd) return 0
    return b.periodEnd.localeCompare(a.periodEnd)
  })

  return documents
}
