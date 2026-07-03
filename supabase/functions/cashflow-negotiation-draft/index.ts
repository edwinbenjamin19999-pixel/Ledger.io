// AI-genererat förhandlingsmail till leverantör (svenska, professionell ton).
// Anropar Lovable AI Gateway (google/gemini-2.5-flash) — ingen extern API-nyckel krävs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface Body {
  company_id: string;
  supplier_name?: string;
  supplier_id?: string;
  outstanding_amount?: number;
  invoice_ids?: string[];
  goal?: "extend_terms" | "discount" | "installment";
  tone?: "friendly" | "firm";
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    if (!LOVABLE_API_KEY) return corsError("LOVABLE_API_KEY saknas", 500);

    const body = (await req.json()) as Body;
    if (!body.company_id) return corsError("company_id krävs", 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Hämta bolagsnamn för avsändare
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", body.company_id)
      .maybeSingle();

    // Hämta fakturadata om invoice_ids skickats
    let invoiceContext = "";
    let supplierName = body.supplier_name ?? "Leverantör";
    let total = body.outstanding_amount ?? 0;

    if (body.invoice_ids && body.invoice_ids.length > 0) {
      const { data: invs } = await supabase
        .from("invoices")
        .select("invoice_number, total_amount, due_date, counterparty_name")
        .in("id", body.invoice_ids);
      if (invs && invs.length) {
        supplierName = invs[0].counterparty_name ?? supplierName;
        total = invs.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
        invoiceContext = invs
          .map(
            (i) =>
              `- Faktura ${i.invoice_number ?? "?"} på ${Number(i.total_amount).toLocaleString("sv-SE")} kr, förfallodag ${i.due_date}`
          )
          .join("\n");
      }
    }

    const goalText =
      body.goal === "discount"
        ? "Förhandla en kontantrabatt på 2-3% mot snabbare betalning."
        : body.goal === "installment"
        ? "Föreslå en avbetalningsplan över 2-3 månader."
        : "Begär förlängd betalningsfrist med 30 dagar.";

    const toneText = body.tone === "firm" ? "bestämd men respektfull" : "vänlig och professionell";

    const prompt = `Du är CFO på företaget "${company?.name ?? "Vårt bolag"}". Skriv ett kort, ${toneText} mail på svenska till ${supplierName}.

MÅL: ${goalText}

KONTEXT:
- Total utestående: ${total.toLocaleString("sv-SE")} kr
${invoiceContext ? `- Berörda fakturor:\n${invoiceContext}` : ""}

KRAV:
- Max 150 ord
- Inled med "Hej,"
- Förklara situationen kortfattat (utan att be om ursäkt)
- Föreslå konkret lösning
- Avsluta med "Med vänliga hälsningar,\\n${company?.name ?? ""}"
- Returnera ENDAST mailtexten, inga rubriker eller meta-kommentarer.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return corsError("AI-tjänsten är upptagen, försök igen om en stund", 429);
      if (aiResp.status === 402) return corsError("AI-krediter slut — fyll på i Lovable", 402);
      return corsError(`AI-fel: ${t}`, 500);
    }

    const data = await aiResp.json();
    const draft: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    const subject = `Förfrågan om betalningsvillkor — ${supplierName}`;

    return corsJson({
      ok: true,
      subject,
      body: draft,
      supplier_name: supplierName,
      total_amount: total,
    });
  } catch (e) {
    return corsError((e as Error).message, 500);
  }
});
