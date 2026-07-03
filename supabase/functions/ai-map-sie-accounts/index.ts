// AI-driven account mapper for SIE imports.
// Pipeline per account: history → SRU → BAS range → AI semantic → unmapped.
// Returns confidence + source per account.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AccountInput {
  number: string;
  name: string;
  sruCode?: string;
  sampleTexts?: string[];
}

interface AccountMapping {
  account_number: string;
  account_name: string;
  mapped_row_code: string | null;
  mapped_row_id: string | null;
  confidence: number;
  source: "rule" | "sru" | "history" | "ai" | "unmapped";
  reason: string;
}

interface RowDef {
  id: string;
  code: string;
  label: string;
  template_code: string;
}

function basRangeMap(num: string): { code: string; label: string } | null {
  const n = parseInt(num.slice(0, 4), 10);
  if (isNaN(n)) return null;
  // Highly simplified BAS K2 ranges
  if (n >= 1000 && n <= 1099) return { code: "BR.intangible_assets", label: "Immateriella anläggningstillgångar" };
  if (n >= 1100 && n <= 1199) return { code: "BR.tangible_assets", label: "Materiella anläggningstillgångar" };
  if (n >= 1200 && n <= 1299) return { code: "BR.machinery", label: "Maskiner och inventarier" };
  if (n >= 1300 && n <= 1399) return { code: "BR.financial_assets", label: "Finansiella anläggningstillgångar" };
  if (n >= 1400 && n <= 1499) return { code: "BR.inventory", label: "Lager" };
  if (n >= 1500 && n <= 1599) return { code: "BR.accounts_receivable", label: "Kundfordringar" };
  if (n >= 1600 && n <= 1899) return { code: "BR.other_receivables", label: "Övriga fordringar" };
  if (n >= 1900 && n <= 1999) return { code: "BR.cash", label: "Kassa och bank" };
  if (n >= 2000 && n <= 2099) return { code: "BR.equity", label: "Eget kapital" };
  if (n >= 2100 && n <= 2399) return { code: "BR.untaxed_reserves", label: "Obeskattade reserver" };
  if (n >= 2400 && n <= 2499) return { code: "BR.accounts_payable", label: "Leverantörsskulder" };
  if (n >= 2500 && n <= 2899) return { code: "BR.other_liabilities", label: "Övriga skulder" };
  if (n >= 2900 && n <= 2999) return { code: "BR.accrued_expenses", label: "Upplupna kostnader" };
  if (n >= 3000 && n <= 3799) return { code: "RR.revenue.net", label: "Nettoomsättning" };
  if (n >= 3800 && n <= 3999) return { code: "RR.other_revenue", label: "Övriga rörelseintäkter" };
  if (n >= 4000 && n <= 4999) return { code: "RR.cogs", label: "Råvaror och förnödenheter" };
  if (n >= 5000 && n <= 6999) return { code: "RR.other_external_costs", label: "Övriga externa kostnader" };
  if (n >= 7000 && n <= 7699) return { code: "RR.personnel_costs", label: "Personalkostnader" };
  if (n >= 7700 && n <= 7899) return { code: "RR.depreciation", label: "Avskrivningar" };
  if (n >= 8000 && n <= 8499) return { code: "RR.financial_items", label: "Finansiella poster" };
  if (n >= 8500 && n <= 8999) return { code: "RR.tax", label: "Skatt på årets resultat" };
  return null;
}

function sruMap(sru: string): { code: string; label: string } | null {
  // SRU → report row mapping (representative subset)
  const map: Record<string, { code: string; label: string }> = {
    "7410": { code: "RR.revenue.net", label: "Nettoomsättning" },
    "7411": { code: "RR.revenue.net", label: "Nettoomsättning" },
    "7412": { code: "RR.other_revenue", label: "Övriga rörelseintäkter" },
    "7510": { code: "RR.cogs", label: "Råvaror och förnödenheter" },
    "7511": { code: "RR.other_external_costs", label: "Övriga externa kostnader" },
    "7512": { code: "RR.personnel_costs", label: "Personalkostnader" },
    "7513": { code: "RR.depreciation", label: "Avskrivningar" },
    "7710": { code: "RR.financial_items", label: "Finansiella poster" },
    "7810": { code: "RR.tax", label: "Skatt på årets resultat" },
  };
  return map[sru] ?? null;
}

async function aiSemanticMap(
  accounts: AccountInput[],
  rowOptions: { code: string; label: string }[],
  apiKey: string,
): Promise<Record<string, { code: string; confidence: number; reason: string }>> {
  if (accounts.length === 0) return {};
  const result: Record<string, { code: string; confidence: number; reason: string }> = {};

  const systemPrompt = `Du är en svensk redovisningsexpert. Mappa BAS-konton till rapportrader (RR/BR) enligt K2-strukturen. Returnera ett objekt med ett "mappings"-fält. Varje mapping ska ha: account_number, mapped_row_code (en av: ${rowOptions.map((r) => r.code).join(", ")}, eller "unmapped"), confidence (0-1), reason (kort svensk förklaring).`;

  const userPrompt = JSON.stringify({
    accounts: accounts.map((a) => ({
      number: a.number,
      name: a.name,
      sample_texts: a.sampleTexts?.slice(0, 3),
    })),
    available_rows: rowOptions,
  });

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_mappings",
              description: "Returnera mappningar för alla konton.",
              parameters: {
                type: "object",
                properties: {
                  mappings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        account_number: { type: "string" },
                        mapped_row_code: { type: "string" },
                        confidence: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["account_number", "mapped_row_code", "confidence", "reason"],
                    },
                  },
                },
                required: ["mappings"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_mappings" } },
      }),
    });

    if (resp.status === 429 || resp.status === 402) {
      console.warn("AI rate-limit/quota:", resp.status);
      return {};
    }
    if (!resp.ok) {
      console.error("AI gateway error:", resp.status, await resp.text());
      return {};
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) return {};
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    for (const m of parsed.mappings ?? []) {
      result[m.account_number] = {
        code: m.mapped_row_code,
        confidence: Math.min(1, Math.max(0, Number(m.confidence) || 0.5)),
        reason: m.reason ?? "",
      };
    }
  } catch (e) {
    console.error("AI mapping failed:", e);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const companyId: string = body.companyId;
    const accounts: AccountInput[] = body.accounts ?? [];

    if (!companyId || !Array.isArray(accounts)) {
      return new Response(JSON.stringify({ error: "companyId och accounts krävs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Membership check
    const { data: memberCheck } = await admin.rpc("is_company_member", {
      _user_id: userId,
      _company_id: companyId,
    });
    if (!memberCheck) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load report rows for resolution
    const { data: rowsData } = await admin
      .from("report_rows")
      .select("id, code, label, template_id, report_templates!inner(code)");
    const rowMap = new Map<string, RowDef>();
    for (const r of (rowsData as any[]) ?? []) {
      rowMap.set(r.code, {
        id: r.id,
        code: r.code,
        label: r.label,
        template_code: r.report_templates?.code,
      });
    }
    const rowOptions = Array.from(rowMap.values()).map((r) => ({ code: r.code, label: r.label }));

    // Load history
    const accountNumbers = accounts.map((a) => a.number);
    const { data: historyRows } = await admin
      .from("sie_account_mapping_history")
      .select("account_number, mapped_row_code, confidence, source, reason, created_at")
      .eq("company_id", companyId)
      .in("account_number", accountNumbers)
      .order("created_at", { ascending: false });

    const historyByAcc = new Map<string, any>();
    for (const h of historyRows ?? []) {
      if (!historyByAcc.has(h.account_number)) historyByAcc.set(h.account_number, h);
    }

    const mappings: AccountMapping[] = [];
    const needsAI: AccountInput[] = [];

    for (const acc of accounts) {
      // 1) History (user-corrected wins)
      const hist = historyByAcc.get(acc.number);
      if (hist && hist.source === "user") {
        const row = rowMap.get(hist.mapped_row_code);
        mappings.push({
          account_number: acc.number,
          account_name: acc.name,
          mapped_row_code: hist.mapped_row_code,
          mapped_row_id: row?.id ?? null,
          confidence: 0.95,
          source: "history",
          reason: "Tidigare användarkorrigering",
        });
        continue;
      }

      // 2) SRU
      if (acc.sruCode) {
        const sru = sruMap(acc.sruCode);
        if (sru) {
          const row = rowMap.get(sru.code);
          mappings.push({
            account_number: acc.number,
            account_name: acc.name,
            mapped_row_code: sru.code,
            mapped_row_id: row?.id ?? null,
            confidence: 0.95,
            source: "sru",
            reason: `SRU-kod ${acc.sruCode} → ${sru.label}`,
          });
          continue;
        }
      }

      // 3) BAS range
      const bas = basRangeMap(acc.number);
      if (bas) {
        const row = rowMap.get(bas.code);
        mappings.push({
          account_number: acc.number,
          account_name: acc.name,
          mapped_row_code: bas.code,
          mapped_row_id: row?.id ?? null,
          confidence: 0.85,
          source: "rule",
          reason: `BAS-intervall → ${bas.label}`,
        });
        continue;
      }

      // 4) Defer to AI
      needsAI.push(acc);
    }

    // 5) AI semantic batch
    if (needsAI.length > 0 && lovableApiKey) {
      const BATCH = 50;
      for (let i = 0; i < needsAI.length; i += BATCH) {
        const batch = needsAI.slice(i, i + BATCH);
        const aiResult = await aiSemanticMap(batch, rowOptions, lovableApiKey);
        for (const acc of batch) {
          const r = aiResult[acc.number];
          if (r && r.code && r.code !== "unmapped") {
            const row = rowMap.get(r.code);
            mappings.push({
              account_number: acc.number,
              account_name: acc.name,
              mapped_row_code: r.code,
              mapped_row_id: row?.id ?? null,
              confidence: r.confidence,
              source: "ai",
              reason: r.reason,
            });
          } else {
            mappings.push({
              account_number: acc.number,
              account_name: acc.name,
              mapped_row_code: null,
              mapped_row_id: null,
              confidence: 0,
              source: "unmapped",
              reason: "Kräver manuell mappning",
            });
          }
        }
      }
    } else {
      for (const acc of needsAI) {
        mappings.push({
          account_number: acc.number,
          account_name: acc.name,
          mapped_row_code: null,
          mapped_row_id: null,
          confidence: 0,
          source: "unmapped",
          reason: lovableApiKey ? "Kräver manuell mappning" : "AI-tjänst ej konfigurerad",
        });
      }
    }

    const summary = {
      total: mappings.length,
      auto: mappings.filter((m) => m.confidence >= 0.9).length,
      review: mappings.filter((m) => m.confidence > 0 && m.confidence < 0.9).length,
      manual: mappings.filter((m) => m.confidence === 0).length,
    };

    return new Response(JSON.stringify({ mappings, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-map-sie-accounts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
