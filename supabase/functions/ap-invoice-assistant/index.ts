// AP Invoice Assistant — streaming AI chat scoped to a single supplier invoice.
// Uses Lovable AI Gateway. Builds context from the invoice + supplier history
// and streams Markdown answers back to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  invoice_id: string;
  messages: ChatMsg[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate caller session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.invoice_id || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "invoice_id and messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load invoice + lines
    const { data: invoice } = await admin
      .from("invoices")
      .select(
        "id, company_id, invoice_number, counterparty_name, counterparty_org_number, total_amount, vat_amount, invoice_date, due_date, status, workflow_state, ai_confidence, vat_code, bg_pg, supplier_id, notes, risk_level, risk_score, is_blocked",
      )
      .eq("id", body.invoice_id)
      .maybeSingle();

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lines } = await admin
      .from("invoice_lines")
      .select("description, quantity, unit_price, vat_rate, vat_amount, account_id, chart_of_accounts:chart_of_accounts(account_number, account_name)")
      .eq("invoice_id", invoice.id);

    // Supplier history (last 12 invoices excluding this one)
    const { data: history } = await admin
      .from("invoices")
      .select("invoice_number, invoice_date, total_amount, status")
      .eq("company_id", invoice.company_id)
      .eq("counterparty_name", invoice.counterparty_name)
      .neq("id", invoice.id)
      .order("invoice_date", { ascending: false })
      .limit(12);

    const fmt = (n: number | null | undefined) =>
      typeof n === "number" ? n.toLocaleString("sv-SE") : "—";

    const linesText = (lines ?? [])
      .map(
        (l: any, i: number) =>
          `  ${i + 1}. ${l.description ?? "—"} — ${fmt(l.quantity)} × ${fmt(l.unit_price)} kr (moms ${l.vat_rate ?? "?"}%) → konto ${l.chart_of_accounts?.account_number ?? "—"} ${l.chart_of_accounts?.account_name ?? ""}`,
      )
      .join("\n");

    const historyText = (history ?? [])
      .map(
        (h: any) =>
          `  · ${h.invoice_date} #${h.invoice_number} — ${fmt(h.total_amount)} kr (${h.status})`,
      )
      .join("\n");

    const contextBlock = `KONTEXT (denna faktura):
- Leverantör: ${invoice.counterparty_name} (org.nr ${invoice.counterparty_org_number ?? "okänt"})
- Fakturanummer: ${invoice.invoice_number}
- Belopp: ${fmt(invoice.total_amount)} kr (varav moms ${fmt(invoice.vat_amount)} kr)
- Fakturadatum: ${invoice.invoice_date} · Förfaller: ${invoice.due_date}
- BG/PG: ${invoice.bg_pg ?? "—"} · Momskod: ${invoice.vat_code ?? "—"}
- Status: ${invoice.status} · Workflow: ${invoice.workflow_state}
- AI-konfidens vid extraktion: ${invoice.ai_confidence != null ? Math.round(invoice.ai_confidence * 100) + "%" : "—"}
- Riskbedömning: ${invoice.risk_level ?? "—"} (score ${invoice.risk_score ?? "—"})${invoice.is_blocked ? " · BLOCKERAD" : ""}
- Noteringar: ${invoice.notes ?? "—"}

KONTERINGSRADER:
${linesText || "  (inga rader registrerade)"}

LEVERANTÖRSHISTORIK (senaste ${history?.length ?? 0} fakturor):
${historyText || "  (ingen historik)"}`;

    const systemPrompt = `Du är NorthLedger Assistent — en svensk AI-redovisningsexpert som hjälper en ekonom att granska en specifik leverantörsfaktura. Svara alltid på svenska, kort och konkret (max 5–7 meningar om inte användaren ber om mer). Använd Markdown med rubriker (## H2) för tydlighet. Var faktabaserad: hänvisa till värden i kontexten ovan. Om frågan inte kan besvaras med tillgänglig data — säg det rakt ut. Föreslå nästa åtgärd när det är relevant.

${contextBlock}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...body.messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI-tjänsten är tillfälligt överbelastad. Prova igen om en stund." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter slut. Lägg till krediter i Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errTxt = await aiResp.text();
      console.error("Lovable AI error", aiResp.status, errTxt);
      return new Response(JSON.stringify({ error: "AI-anrop misslyckades" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ap-invoice-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
