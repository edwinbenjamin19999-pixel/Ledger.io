import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTRACTION_PROMPT = `Du är en expert på att analysera svenska affärsdokument. Du ska:

1. KLASSIFICERA dokumenttypen som exakt en av: contract, bank_statement, employment_agreement, annual_report, invoice, insurance_policy, price_list, other
2. EXTRAHERA strukturerad data baserat på dokumenttypen.

Returnera ALLTID data via tool-anropet extract_document_data.

EXTRAKTIONSSCHEMAN PER TYP:

**contract** (avtal/kontrakt):
- parties: array av {name, org_number}
- contract_value: sträng med belopp
- start_date, end_date: YYYY-MM-DD
- notice_period: uppsägningstid som text
- payment_terms: betalningsvillkor
- auto_renewal: true/false
- key_obligations: array av 3 punkter (svenska)

**bank_statement** (kontoutdrag):
- bank_name, account_last4, period
- transactions: array av {date, description, amount}
- opening_balance, closing_balance

**employment_agreement** (anställningsavtal):
- employee_name, personal_number_masked (visa bara sista 4)
- position, salary, start_date, notice_period
- vacation_days, working_hours_per_week

**annual_report** (årsredovisning):
- company_name, org_number, fiscal_year
- revenue, operating_result, net_result
- solidity_percent, quick_ratio

**invoice** (faktura):
- supplier_name, invoice_number, invoice_date, due_date
- total_amount, vat_amount, currency

**insurance_policy** (försäkringsbrev):
- insurer, policy_number, insured_party
- coverage_type, premium, start_date, end_date

**price_list** (prislista):
- supplier_name, valid_from, valid_to
- items: array av {name, price, unit}

**other**: 
- summary: kort sammanfattning på svenska

Sätt confidence (0.0-1.0) för varje fält. Övergripande confidence är genomsnittet.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id, file_content_base64, file_name, mime_type } = await req.json();

    if (!file_content_base64 || !file_name) {
      return new Response(JSON.stringify({ error: "file_content_base64 and file_name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isImage = mime_type?.startsWith("image/");
    const isPdf = mime_type === "application/pdf";

    // Build messages for AI
    const messages: any[] = [
      { role: "system", content: EXTRACTION_PROMPT },
    ];

    if (isImage) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: `Analysera detta dokument (filnamn: ${file_name}). Klassificera typen och extrahera all relevant data.` },
          { type: "image_url", image_url: { url: `data:${mime_type};base64,${file_content_base64}` } },
        ],
      });
    } else {
      // For PDFs and text, decode and send as text
      let textContent: string;
      try {
        const bytes = Uint8Array.from(atob(file_content_base64), (c) => c.charCodeAt(0));
        textContent = new TextDecoder("utf-8").decode(bytes);
      } catch {
        textContent = `[Binärt dokument: ${file_name}. Kunde inte avkoda som text.]`;
      }
      messages.push({
        role: "user",
        content: `Analysera detta dokument (filnamn: ${file_name}):\n\n${textContent.slice(0, 30000)}`,
      });
    }

    // Call AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_data",
              description: "Return the classified document type and extracted structured data.",
              parameters: {
                type: "object",
                properties: {
                  document_type: {
                    type: "string",
                    enum: ["contract", "bank_statement", "employment_agreement", "annual_report", "invoice", "insurance_policy", "price_list", "other"],
                  },
                  confidence: { type: "number", description: "Overall confidence 0.0-1.0" },
                  extracted_data: {
                    type: "object",
                    description: "The extracted fields based on document type",
                    additionalProperties: true,
                  },
                  summary: { type: "string", description: "En kort sammanfattning på svenska (2-3 meningar)" },
                },
                required: ["document_type", "confidence", "extracted_data", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en stund." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-krediter slut. Kontakta administratören." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI-analys misslyckades" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    
    // Extract tool call result
    let result: any = null;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    if (!result) {
      // Fallback: try to parse from content
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          result = JSON.parse(content);
        } catch {
          result = {
            document_type: "other",
            confidence: 0.3,
            extracted_data: { raw_response: content },
            summary: "Kunde inte extrahera strukturerad data.",
          };
        }
      } else {
        result = {
          document_type: "other",
          confidence: 0,
          extracted_data: {},
          summary: "AI returnerade inget svar.",
        };
      }
    }

    // Update document record if document_id provided
    if (document_id) {
      const adminClient = createClient(supabaseUrl, supabaseKey);
      const updateData: any = {
        extracted_data: result.extracted_data,
        ai_document_type: result.document_type,
        ai_confidence: result.confidence,
        analyzed_at: new Date().toISOString(),
        processing_status: "analyzed",
      };

      // Extract contract expiry for alerting
      if (result.document_type === "contract" && result.extracted_data?.end_date) {
        updateData.contract_expiry_date = result.extracted_data.end_date;
        updateData.contract_notice_period = result.extracted_data.notice_period || null;
      }

      await adminClient
        .from("documents")
        .update(updateData)
        .eq("id", document_id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
