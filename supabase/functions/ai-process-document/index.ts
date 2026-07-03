import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Input validation schema
const inputSchema = z.object({
  documentId: z.string().uuid("Ogiltigt dokument-ID format"),
  companyId: z.string().uuid("Ogiltigt företags-ID format"),
  source: z.string().optional(),
});

// Helper to create safe error response
function safeErrorResponse(error: unknown, status = 500) {
  console.error("Error in ai-process-document:", error);
  
  // Log detailed error but return generic message
  const genericMessage = "Ett fel uppstod vid dokumentbehandling. Försök igen senare.";
  
  // Only expose specific messages for known validation errors
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ error: error.errors.map(e => e.message).join(", ") }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // For 404-type errors, return appropriate message
  const errorMessage = error instanceof Error ? error.message : "";
  if (errorMessage.includes("not found") || errorMessage.includes("hittades inte")) {
    return new Response(
      JSON.stringify({ error: "Dokumentet hittades inte." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  return new Response(
    JSON.stringify({ error: genericMessage }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Validation functions
const VALID_VAT_RATES = [0, 6, 12, 25];

// VAT account → rate mapping for validation
const VAT_ACCOUNT_RATES: Record<string, number> = {
  "2610": 25, "2611": 25, "2612": 25, "2614": 25, "2615": 25,
  "2620": 12, "2621": 12, "2622": 12,
  "2630": 6, "2631": 6, "2632": 6,
  "2640": 0, "2641": 0, "2642": 0, "2645": 0, "2646": 0, // Input VAT (rate varies)
};

function validateJournalEntry(lines: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Debit = Credit
  const totalDebit = lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);

  if (difference > 0.01) {
    errors.push(`Debet och kredit balanserar inte. Differens: ${difference.toFixed(2)} kr`);
  }

  // 2. Validate account numbers
  lines.forEach((line: any, index: number) => {
    const accountNum = parseInt(line.account);
    if (isNaN(accountNum) || accountNum < 1000 || accountNum > 8999) {
      errors.push(`Rad ${index + 1}: Ogiltigt kontonummer ${line.account}`);
    }

    // 3. Validate VAT — using GROSS formula: moms = brutto * sats / (100 + sats)
    if (line.vatCode) {
      const vatRate = parseInt(line.vatCode);
      if (!VALID_VAT_RATES.includes(vatRate)) {
        errors.push(`Rad ${index + 1}: Ogiltig momssats ${vatRate}%`);
      }
      // VAT amount validation is informational — the AI might compute slightly differently
      if (line.vatAmount && vatRate > 0) {
        const grossAmount = line.debit || line.credit || 0;
        const expectedVatFromGross = Math.round(grossAmount * vatRate / (100 + vatRate));
        const vatDiff = Math.abs(expectedVatFromGross - (line.vatAmount || 0));
        if (vatDiff > 2) {
          errors.push(
            `Rad ${index + 1}: Momsbelopp avviker. Brutto ${grossAmount} kr × ${vatRate}% → förväntad moms ${expectedVatFromGross} kr (angivet: ${line.vatAmount} kr)`
          );
        }
      }
    }
  });

  // 4. At least 2 lines
  if (lines.length < 2) {
    errors.push("Verifikat måste ha minst 2 rader");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input with Zod
    const rawInput = await req.json();
    const { documentId, companyId } = inputSchema.parse(rawInput);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (docError) throw docError;
    if (!document) throw new Error('Document not found');

    console.log(`=== START processing document ${documentId} ===`);
    console.log("File:", document.file_name, "MIME:", document.mime_type, "URL:", document.file_url);

    // Check if document already has a processed journal entry
    const { data: existingEntry } = await supabase
      .from("journal_entries")
      .select("id, status, description, entry_date, receipt_matched")
      .eq("document_id", documentId)
      .maybeSingle();

    if (existingEntry) {
      console.log("Document already has journal entry:", existingEntry.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: existingEntry.status === "approved" 
            ? "Dokumentet är redan bokfört och godkänt" 
            : "Dokumentet har redan ett verifikat",
          journalEntry: existingEntry,
          alreadyProcessed: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Content-based deduplication: check ALL time, not just 24h
    // Phase 1: filename match (catches re-uploads of same camera photo)
    // Phase 2: after AI extraction, we'll also check amount+date+supplier match
    if (document.file_name) {
      const { data: existingDocs } = await supabase
        .from("documents")
        .select("id, created_at, file_size")
        .eq("company_id", companyId)
        .eq("file_name", document.file_name)
        .neq("id", documentId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (existingDocs && existingDocs.length > 0) {
        // Check if any of these have a linked journal entry (i.e. already booked)
        for (const existingDoc of existingDocs) {
          const { data: dupEntry } = await supabase
            .from("journal_entries")
            .select("id, description, entry_date")
            .eq("document_id", existingDoc.id)
            .maybeSingle();

          if (dupEntry) {
            // Same filename + already booked = likely duplicate
            // Extra confidence if file size matches
            const sameSize = document.file_size && existingDoc.file_size 
              ? Math.abs(Number(document.file_size) - Number(existingDoc.file_size)) < 100
              : false;
            const daysSince = Math.floor((Date.now() - new Date(existingDoc.created_at).getTime()) / (1000 * 60 * 60 * 24));
            
            console.log(`Duplicate detected: ${document.file_name} matches doc ${existingDoc.id} (${daysSince} days ago, same size: ${sameSize})`);
            
            await supabase
              .from("documents")
              .update({ processing_status: "duplicate" })
              .eq("id", documentId);
            return new Response(
              JSON.stringify({ 
                success: false, 
                duplicate: true,
                message: sameSize
                  ? `Dubblett: ${document.file_name} redan bokförd (${dupEntry.description}, ${dupEntry.entry_date}).`
                  : `Möjlig dubblett: ${document.file_name} matchar befintlig verifikation (${dupEntry.description}). Kontrollera manuellt.`,
                duplicateEntryId: dupEntry.id,
                alreadyProcessed: true,
                confidence: sameSize ? "high" : "medium",
                daysSinceOriginal: daysSince,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // Försök hitta matchande befintlig bokning (för manuellt skapade poster)
    try {
      const { data: potentialMatches } = await supabase.rpc("find_matching_entry_for_receipt", {
        p_document_id: documentId,
        p_company_id: companyId,
        p_amount: 0,
        p_date: new Date().toISOString().split("T")[0]
      });

      if (potentialMatches && potentialMatches.length > 0) {
        const bestMatch = potentialMatches[0];
        if (bestMatch.match_score >= 0.9) {
          console.log("Found high-confidence match, linking instead of creating new:", bestMatch.journal_entry_id);
          
          await supabase.rpc("link_receipt_to_entry", {
            p_document_id: documentId,
            p_journal_entry_id: bestMatch.journal_entry_id,
            p_confidence: bestMatch.match_score,
            p_method: "auto_match"
          });

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Kvitto kopplat till befintligt verifikat",
              journalEntryId: bestMatch.journal_entry_id,
              matchReason: bestMatch.match_reason,
              linked: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (rpcError) {
      console.warn("Receipt matching RPC failed (non-critical):", rpcError);
      // Continue with normal processing
    }

    // Download the file from storage to send to AI
    let base64File: string;
    let mimeType: string;
    try {
      // Resolve storage path: file_url may be a full public URL or just a storage path
      let filePath: string;
      const fileUrl = document.file_url || '';
      if (fileUrl.includes('/documents/')) {
        // Extract path after bucket name from full URL
        filePath = fileUrl.split('/documents/').pop() || '';
        // URL-decode the path
        filePath = decodeURIComponent(filePath);
      } else if (fileUrl && !fileUrl.startsWith('http')) {
        // Already a storage path like "companyId/filename.jpg"
        filePath = fileUrl;
      } else {
        // Fallback: construct from companyId + file_name
        filePath = `${companyId}/${document.file_name}`;
      }

      console.log("Downloading from storage path:", filePath);

      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(filePath);

      if (downloadError || !fileData) {
        console.error("Failed to download file:", downloadError, "path:", filePath);
        throw new Error("Kunde inte ladda ner dokumentfilen. Försök ladda upp igen.");
      }

      // Determine correct mime type: always prefer extension-based detection
      const fileName = (document.file_name || '').toLowerCase();
      if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (fileName.endsWith('.png')) mimeType = 'image/png';
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (fileName.endsWith('.webp')) mimeType = 'image/webp';
      else mimeType = document.mime_type || 'application/octet-stream';

      console.log("File mime type:", mimeType, "File name:", document.file_name);

      // Convert file to base64
      const arrayBuffer = await fileData.arrayBuffer();
      base64File = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
    } catch (dlError) {
      // Update document status to failed
      await supabase
        .from("documents")
        .update({ processing_status: "failed" })
        .eq("id", documentId);
      throw dlError;
    }

    // Get company's learning data (feedback from previous corrections)
    let learningContext = "";
    try {
      const { data: learningData } = await supabase.rpc("get_ai_learning_data", {
        _company_id: companyId,
        _limit: 50,
      });

      if (learningData && learningData.length > 0) {
        learningContext = "\n\nHISTORISK DATA (lär från tidigare korrigeringar):\n";
        learningData.forEach((item: any) => {
          learningContext += `- När ${item.pattern}: använd konto ${item.suggested_account} (förekommit ${item.correction_count} gånger)\n`;
        });
      }
    } catch (learningError) {
      console.warn("Learning data fetch failed (non-critical):", learningError);
    }

    // System prompt with comprehensive VAT category knowledge
    const systemPrompt = `Du är en svensk redovisningsexpert som analyserar BILDER av dokument.

STEG 1 — KLASSIFICERA DOKUMENTTYPEN:
Avgör FÖRST om dokumentet är:
- "receipt" — kvitto (redan betalat, kort/kontant)
- "invoice" — faktura (ska betalas, har förfallodatum)
- "bank_statement" — kontoutdrag, banktransaktioner
- "contract" — avtal, kontrakt
- "other" — övrigt underlag som ej ska bokföras

Om dokumentet INTE är ett kvitto eller en faktura → returnera JSON med:
{
  "documentCategory": "bank_statement" | "contract" | "other",
  "description": "kort beskrivning av dokumentet",
  "confidence": 0.0-1.0,
  "explanation": "Varför dokumentet inte kan bokföras"
}
Inkludera INTE journalLines för icke-bokförbara dokument.

STEG 2 — OM KVITTO/FAKTURA, ANALYSERA NOGGRANT:
- Läs ALLA siffror, datum och text från bilden
- Identifiera typ av verifikat (restaurang, kontor, transport, etc.)
- Hitta totalsumman (ofta längst ner)
- Leta efter momsinformation — VIKTIGAST!
- Läs faktiskt datum från kvittot/fakturan
- IDENTIFIERA VALUTA: Läs vilken valuta som anges (SEK, EUR, USD, GBP, NOK, DKK etc).

## SVENSKA MOMSSATSER (Mervärdesskattelagen):

### 25% — Standard
De flesta varor och tjänster: kontorsmaterial, datorer, programvara, möbler, konsulttjänster, reparationer, drivmedel, parkering, hyrbil, reklam, SaaS-licenser.

### 12% — Reducerad
- Livsmedel/matvaror (ICA, Coop, Willys, Lidl)
- Restaurang/café (lunch, middag, fika, take-away — OBS: alkohol på notan = 25% separat)
- Hotell/logi (Scandic, Elite, Clarion)
- Catering

### 6% — Låg
- Böcker, e-böcker, tidningar, tidskrifter
- Persontransport: tåg (SJ), buss (SL), flyg (inrikes), taxi, Uber
- Kultur: bio, teater, konsert, museum, idrottsevenemang

### 0% — Momsfritt
- Bankavgifter, räntor, courtage
- Försäkringspremier (företags-, fordons-, ansvarsförsäkring)
- Sjukvård, tandvård, apotek (receptbelagt)
- Porto/frimärken
- Utbildning
- Föreningsavgifter/medlemsavgifter
- Hyra av bostad (ej lokaler)

### AUTOMATISK MOMSSATS BASERAT PÅ TYP:
Du MÅSTE välja rätt momssats baserat på vad kvittot/fakturan avser:
- Lunch på restaurang → 12% (INTE 25%)
- Tågbiljett → 6% (INTE 25%)
- Hotellnatt → 12% (INTE 25%)
- Bankavgift → 0% (INTE 25%)
- Försäkring → 0% (INTE 25%)
- Bok/tidning → 6% (INTE 25%)

## BERÄKNING:
- Momsberäkning för bruttobelopp (inkl moms): moms = belopp × momssats / (100 + momssats)
- Exempel: restauranglunch 500 kr inkl moms → moms = 500 × 12 / 112 = 53,57 → avrunda 54 kr
- Exempel: kontorsmaterial 1250 kr inkl moms → moms = 1250 × 25 / 125 = 250 kr

KRITISKA REGLER:
1. Debet MÅSTE alltid vara lika med kredit
2. Använd endast giltiga BAS 2026-konton (1000-8999)
3. Giltiga momssatser: 0%, 6%, 12%, 25%
4. Minst 2 rader i varje verifikat
5. För INKÖP: Ingående moms på 2640
6. För FÖRSÄLJNING: Utgående moms på 2610/2620/2630
7. VALUTA: Returnera ALLTID belopp i fakturans originalvaluta (€, $, £, NOK etc) — räkna ALDRIG om själv. Sätt currency till exakt valutakod. Systemet konverterar till SEK med dagskurs.

${learningContext}

VIKTIGT: Svara ENDAST med giltig JSON. Kort "explanation" (max 2 meningar).

JSON-SCHEMA FÖR KVITTO/FAKTURA:
{
  "documentCategory": "receipt" | "invoice",
  "supplier": "string",
  "buyer": "string (köparens/mottagarens namn EXAKT som det står på kvittot/fakturan — t.ex. 'RE Equity Partners AB')",
  "buyerOrgNumber": "string eller null (köparens organisationsnummer om synligt, format XXXXXX-XXXX)",
  "amount": number (exkl moms — i ORIGINALVALUTAN på fakturan),
  "vatAmount": number (i ORIGINALVALUTAN),
  "totalAmount": number (inkl moms — i ORIGINALVALUTAN),
  "vatRate": number (0, 6, 12, or 25 — baserat på typ av köp!),
  "currency": "SEK" | "EUR" | "USD" | "GBP" | "NOK" | "DKK" | etc (EXAKT som anges på fakturan — gissa ALDRIG SEK om symbol/kod säger annat!),
  "originalAmount": number | null (totalAmount när currency != SEK),
  "exchangeRate": number | null (kurs till SEK om angiven på fakturan, annars null — gissa ALDRIG),
  "invoiceNumber": "string",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "description": "kort beskrivning",
  "journalLines": [
    {
      "account": "4-siffrigt BAS-konto",
      "accountName": "kontonamn",
      "debit": number (i ORIGINALVALUTAN — systemet räknar om till SEK),
      "credit": number (i ORIGINALVALUTAN — systemet räknar om till SEK),
      "vatCode": "25" | "12" | "6" | null,
      "vatAmount": number (i ORIGINALVALUTAN)
    }
  ],
  "confidence": 0.0-1.0,
  "explanation": "Max 2 meningar"
}

VANLIGA KONTON PER MOMSSATS:
25%: 4010 Varuinköp, 5010 Lokalhyra, 6040 Inventarier, 6071 Representation, 6110 Kontorsmaterial, 6550 Konsult
12%: 6071 Representation (restaurang), 6720 Hotell
6%: 6710/6711/6712 Resebiljetter, 6740 Taxi, 6970 Facklitteratur
0%: 6310 Försäkring, 6570 Bankavgifter, 6250 Porto, 6980 Föreningsavgift

VIKTIGT:
- Restaurang/lunch = konto 6071 + momssats 12%
- Kontant/kortköp = kredit på 1930 (inte 2440)
- Faktura = kredit på 2440 (Leverantörsskulder)
- Försäkring = 0% moms, INGEN momsrad
- Bankavgift = 0% moms, INGEN momsrad`;

    // Try up to 2 times if validation fails (self-correction)
    let parsedData;
    let validation;
    let attemptCount = 0;
    const maxAttempts = 2;

    while (attemptCount < maxAttempts) {
      attemptCount++;
      console.log(`AI attempt ${attemptCount}/${maxAttempts}`);

      // Build the content parts based on mime type
      const userContent: any[] = [
        {
          type: "text",
          text: `Analysera detta dokument (${mimeType === 'application/pdf' ? 'PDF-fil' : 'bild'}) av ett kvitto/faktura MYCKET NOGGRANT. Läs ALLA detaljer:
- Exakt datum från kvittot/fakturan
- Exakt totalbelopp 
- Leverantörens namn
- Typ av köp (restaurang, kontor, etc)

KONTROLLERA sedan att debet = kredit och att alla valideringsregler följs!${attemptCount > 1 ? '\n\nFÖREGÅENDE FÖRSÖK MISSLYCKADES VALIDERING - var extra noggrann med siffrorna!' : ''}`
        }
      ];

      // Use image_url format with data URI for all file types (including PDF)
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64File}`
        }
      });

      // Hard timeout — never let AI hang the function
      const aiController = new AbortController();
      const aiTimeout = setTimeout(() => aiController.abort(), 90_000);

      let aiResponse: Response;
      try {
        aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash", // hybrid: flash for speed/timeout safety on PDFs; pro reserved for complex multi-page
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            temperature: 0.1,
          }),
          signal: aiController.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(aiTimeout);
        const isAbort = fetchErr?.name === "AbortError";
        console.error(`AI fetch failed (attempt ${attemptCount}):`, isAbort ? "TIMEOUT after 90s" : fetchErr?.message);
        if (attemptCount < maxAttempts) continue;
        // Mark document as failed so it can be retried manually
        await supabase
          .from("documents")
          .update({ processing_status: "failed" })
          .eq("id", documentId);
        throw new Error(isAbort ? "AI-tjänsten svarade inte i tid (90s timeout)." : `AI-anrop misslyckades: ${fetchErr?.message}`);
      }
      clearTimeout(aiTimeout);

      if (!aiResponse.ok) {
        const errorBody = await aiResponse.text().catch(() => "Could not read body");
        console.error(`AI API error: status=${aiResponse.status}, body=${errorBody}`);
        
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "AI rate limit exceeded" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits depleted" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI processing failed: ${aiResponse.status} - ${errorBody.substring(0, 200)}`);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content;

      if (!aiContent) {
        throw new Error("No AI response");
      }

      console.log("AI response:", aiContent);

      try {
        const cleanedContent = aiContent
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsedData = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error("Failed to parse AI response:", aiContent);
        if (attemptCount >= maxAttempts) {
          throw new Error("AI returned invalid JSON");
        }
        continue; // Try again
      }

      // VALIDATE the AI's suggestion
      validation = validateJournalEntry(parsedData.journalLines || []);
      
      if (!validation.isValid) {
        console.error(`AI validation failed (attempt ${attemptCount}):`, validation.errors);
        if (attemptCount < maxAttempts) {
          console.log("Retrying with stricter instructions...");
          continue; // Try again with self-correction
        }
        // Final attempt failed - lower confidence
        parsedData.confidence = Math.min(parsedData.confidence || 0, 0.5);
        parsedData.validationErrors = validation.errors;
      }

      // Validation passed or max attempts reached
      break;
    }

    // Check if document is non-bookable (bank statement, contract, other)
    const docCategory = parsedData.documentCategory || "receipt";
    if (["bank_statement", "contract", "other"].includes(docCategory)) {
      console.log(`Document categorized as '${docCategory}' — skipping journal entry creation`);
      
      // Map category to document_type enum
      const typeMap: Record<string, string> = {
        bank_statement: "bank_statement",
        contract: "other",
        other: "other",
      };

      await supabase
        .from("documents")
        .update({
          processing_status: "processed",
          document_type: typeMap[docCategory] || "other",
        })
        .eq("id", documentId);

      return new Response(
        JSON.stringify({
          success: true,
          noBooking: true,
          message: docCategory === "bank_statement"
            ? "Kontoutdrag sparat som underlag"
            : docCategory === "contract"
            ? "Avtal sparat som underlag"
            : "Dokument sparat — inget att bokföra",
          documentCategory: docCategory,
          description: parsedData.description || parsedData.explanation || "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === BUYER MISMATCH DETECTION ===
    // Compare buyer name/orgnr on receipt with the active company
    let buyerMismatchWarning = "";
    let buyerMismatchDetected = false;
    try {
      const { data: companyRow } = await supabase
        .from("companies")
        .select("name, org_number")
        .eq("id", companyId)
        .maybeSingle();

      if (companyRow && parsedData.buyer) {
        const normalize = (s: string) =>
          s.toLowerCase()
            .replace(/\s+(ab|aktiebolag|hb|kb|ek\.?\s*för\.?)\b/g, "")
            .replace(/[^\w\d]/g, "")
            .trim();
        const normalizedBuyer = normalize(parsedData.buyer);
        const normalizedCompany = normalize(companyRow.name);

        const orgMatches =
          parsedData.buyerOrgNumber && companyRow.org_number
            ? parsedData.buyerOrgNumber.replace(/\D/g, "") ===
              companyRow.org_number.replace(/\D/g, "")
            : null;

        const nameMatches =
          normalizedBuyer === normalizedCompany ||
          normalizedBuyer.includes(normalizedCompany) ||
          normalizedCompany.includes(normalizedBuyer);

        if (orgMatches === false || (orgMatches === null && !nameMatches)) {
          buyerMismatchDetected = true;
          buyerMismatchWarning = ` ⚠️ FEL BOLAG PÅ KVITTOT: Kvittot är ställt till "${parsedData.buyer}"${parsedData.buyerOrgNumber ? ` (${parsedData.buyerOrgNumber})` : ""}, men du bokför i "${companyRow.name}"${companyRow.org_number ? ` (${companyRow.org_number})` : ""}. Granska innan godkännande — kvittot kan tillhöra annat bolag i koncernen.`;
          console.warn("Buyer mismatch detected:", parsedData.buyer, "vs", companyRow.name);
          parsedData.confidence = Math.min(parsedData.confidence || 0, 0.6);
        }
      }
    } catch (mismatchErr) {
      console.warn("Buyer mismatch check failed (non-critical):", mismatchErr);
    }

    const highConfidence = parsedData.confidence >= 0.95;
    const passedValidation = validation?.isValid ?? false;

    let finalStatus = "draft";
    if (passedValidation && highConfidence && !buyerMismatchDetected) {
      finalStatus = "approved";
      console.log("✅ Will AUTO-APPROVE: High confidence (>95%) + validation passed");
    } else if (passedValidation && parsedData.confidence >= 0.80) {
      finalStatus = "pending_approval";
    } else if (buyerMismatchDetected) {
      finalStatus = "pending_approval";
    }

    const entryDate = parsedData.invoiceDate || new Date().toISOString().split("T")[0];

    // === CURRENCY CONVERSION TO SEK ===
    // AI returns amounts in original currency. Convert all journalLines to SEK before inserting.
    let fxRate = 1;
    let fxNote = "";
    const rawCurrency = (parsedData.currency || "SEK").toUpperCase();
    if (rawCurrency && rawCurrency !== "SEK") {
      // 1) Use AI-provided exchangeRate if explicitly on the invoice
      if (typeof parsedData.exchangeRate === "number" && parsedData.exchangeRate > 0) {
        fxRate = parsedData.exchangeRate;
        fxNote = `kurs ${fxRate} ${rawCurrency}/SEK (från faktura)`;
      } else {
        // 2) Otherwise fetch daily rate (ECB via exchangerate.host — free, no key)
        try {
          const fxUrl = `https://api.exchangerate.host/convert?from=${rawCurrency}&to=SEK&date=${entryDate}`;
          const fxRes = await fetch(fxUrl);
          const fxJson = await fxRes.json();
          if (fxJson?.result && Number.isFinite(fxJson.result) && fxJson.result > 0) {
            fxRate = fxJson.result;
            fxNote = `kurs ${fxRate.toFixed(4)} ${rawCurrency}/SEK (${entryDate})`;
          } else {
            throw new Error("invalid fx response");
          }
        } catch (fxErr) {
          console.error("FX fetch failed:", fxErr);
          // No reliable rate → force manual review, do NOT auto-approve
          finalStatus = "pending_approval";
          fxNote = `⚠️ KURS SAKNAS för ${rawCurrency} — granska och justera SEK-belopp manuellt`;
          fxRate = 1; // keep AI numbers as-is so user sees them, but flag clearly
        }
      }

      // Apply conversion to all journal lines
      if (Array.isArray(parsedData.journalLines)) {
        parsedData.journalLines = parsedData.journalLines.map((l: any) => ({
          ...l,
          debit: l.debit ? Number((Number(l.debit) * fxRate).toFixed(2)) : 0,
          credit: l.credit ? Number((Number(l.credit) * fxRate).toFixed(2)) : 0,
          vatAmount: l.vatAmount ? Number((Number(l.vatAmount) * fxRate).toFixed(2)) : 0,
        }));
      }
      // Foreign currency always requires human review
      if (finalStatus === "approved") finalStatus = "pending_approval";
    }

    let entryDescription = parsedData.description || "AI-bokföring";
    if (rawCurrency !== "SEK" && parsedData.originalAmount) {
      entryDescription += ` (Original: ${parsedData.originalAmount} ${rawCurrency})`;
    }
    if (buyerMismatchDetected) {
      entryDescription = `⚠️ ${entryDescription}`;
    }

    const { data: journalEntry, error: journalError } = await supabase
      .from("journal_entries")
      .insert({
        company_id: companyId,
        document_id: documentId,
        entry_date: entryDate,
        description: entryDescription,
        status: "draft",
        ai_confidence: parsedData.confidence,
        ai_explanation: (parsedData.explanation || "") +
          buyerMismatchWarning +
          (validation?.isValid ? "" : ` ⚠️ ${validation?.errors?.join("; ") || ""}`) +
          (rawCurrency !== "SEK" ? ` | ${fxNote}` : ""),
        created_by: document.uploaded_by,
        receipt_matched: true,
        receipt_match_confidence: parsedData.confidence,
        receipt_match_method: "ai_ocr"
      })
      .select()
      .maybeSingle();

    if (journalError) throw journalError;
    if (!journalEntry) throw new Error('Failed to create journal entry');

    console.log("Journal entry created (draft):", journalEntry.id);

    // Get chart of accounts to map account numbers to IDs
    const { data: accounts, error: accountsError } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number, account_name")
      .eq("company_id", companyId);

    if (accountsError) throw accountsError;

    // Create journal entry lines with proper account mapping
    const linesToInsert = [];
    for (const line of (parsedData.journalLines || [])) {
      let account = accounts?.find(a => a.account_number === line.account);
      
      // If account doesn't exist, create it
      if (!account) {
        console.log(`Creating missing account ${line.account}: ${line.accountName}`);
        const { data: newAccount, error: createError } = await supabase
          .from("chart_of_accounts")
          .insert({
            company_id: companyId,
            account_number: line.account,
            account_name: line.accountName || `Konto ${line.account}`,
            account_type: line.account.startsWith('1') ? 'asset' : 
                         line.account.startsWith('2') ? 'liability' :
                         line.account.startsWith('3') ? 'revenue' : 'expense',
            is_active: true
          })
          .select("id, account_number, account_name")
          .maybeSingle();
        
        if (createError || !newAccount) {
          console.error(`Failed to create account ${line.account}:`, createError);
          throw createError || new Error("Failed to create account");
        }
        account = newAccount;
      }

      if (!account) {
        console.error(`Account ${line.account} could not be resolved`);
        continue;
      }

      linesToInsert.push({
        journal_entry_id: journalEntry.id,
        account_id: account.id,
        debit: line.debit || 0,
        credit: line.credit || 0,
        vat_code: line.vatCode || null,
        vat_amount: line.vatAmount || 0,
      });
    }

    const { error: linesError } = await supabase
      .from("journal_entry_lines")
      .insert(linesToInsert);

    if (linesError) {
      console.error("Failed to create journal lines:", linesError);
      // Rollback: delete the journal entry we just created
      await supabase
        .from("journal_entries")
        .delete()
        .eq("id", journalEntry.id);
      throw linesError;
    }

    console.log(`Created ${linesToInsert.length} journal entry lines`);

    // Now update status from draft → final (trigger will validate lines exist)
    if (finalStatus !== "draft") {
      const { error: statusError } = await supabase
        .from("journal_entries")
        .update({ 
          status: finalStatus,
          approved_by: finalStatus === "approved" ? document.uploaded_by : null,
        })
        .eq("id", journalEntry.id);
      
      if (statusError) {
        console.error("Failed to update status to", finalStatus, ":", statusError);
        // Non-fatal — entry stays as draft
      } else {
        console.log(`Status updated to: ${finalStatus}`);
      }
    }

    // Update document status
    await supabase
      .from("documents")
      .update({ processing_status: "processed" })
      .eq("id", documentId);

    return new Response(
      JSON.stringify({
        success: true,
        journalEntry,
        aiAnalysis: parsedData,
        validation: validation?.isValid ? { valid: true } : { valid: false, errors: validation?.errors || [] },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return safeErrorResponse(error);
  }
});
