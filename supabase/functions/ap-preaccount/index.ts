// AP Ledger v5 — AI pre-accounting (account, VAT code, periodization)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface Payload {
  invoice_id: string;
}

interface PreAccountingProposal {
  account: string;
  vat_code: string;
  cost_center: string | null;
  project_code: string | null;
  confidence: number;
  source: "history" | "ai" | "default";
  periodization_plan: { start: string; end: string; months: { month: string; amount: number }[] } | null;
}

const PERIODIZATION_RE = /abonnemang|prenumeration|årslicens|forsäkring|försäkring|hyra\s+q\d|annual subscription|yearly/i;

function looksRecurring(description: string | null): boolean {
  if (!description) return false;
  return PERIODIZATION_RE.test(description);
}

function buildMonthlySchedule(
  totalAmount: number,
  invoiceDate: string,
  monthsCount = 12,
): PreAccountingProposal["periodization_plan"] {
  const start = new Date(invoiceDate);
  const months: { month: string; amount: number }[] = [];
  const monthly = Math.round((totalAmount / monthsCount) * 100) / 100;
  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    months.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      amount: monthly,
    });
  }
  const end = new Date(start);
  end.setMonth(end.getMonth() + monthsCount - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    months,
  };
}

async function callAIGateway(
  invoice: Record<string, unknown>,
): Promise<Partial<PreAccountingProposal> | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const prompt = `Du är en svensk redovisningsekonom. Föreslå BAS-konto och momskod (S/M25/M12/M6/0) för denna leverantörsfaktura.
Leverantör: ${invoice.counterparty_name}
Belopp: ${invoice.total_amount} kr (varav moms ${invoice.vat_amount})
Beskrivning: ${invoice.notes ?? "-"}
Faktura nr: ${invoice.invoice_number}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            type: "function",
            function: {
              name: "propose_preaccounting",
              description: "Föreslå konto och momskod",
              parameters: {
                type: "object",
                properties: {
                  account: { type: "string", description: "BAS-konto, t.ex. 5410, 6230, 4010" },
                  vat_code: { type: "string", enum: ["M25", "M12", "M6", "0", "S"] },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  reason: { type: "string" },
                },
                required: ["account", "vat_code", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "propose_preaccounting" } },
      }),
    });

    if (!resp.ok) {
      console.warn("AI gateway non-ok", resp.status);
      return null;
    }
    const json = await resp.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!call) return null;
    const parsed = JSON.parse(call);
    return {
      account: parsed.account,
      vat_code: parsed.vat_code,
      confidence: Number(parsed.confidence ?? 0.6),
      source: "ai",
    };
  } catch (e) {
    console.error("AI gateway error", e);
    return null;
  }
}

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsError("Missing Authorization header", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return corsError("Unauthorized", 401);
    const userId = userData.user.id;

    const body = (await req.json()) as Payload;
    if (!body.invoice_id) return corsError("invoice_id required", 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select(
        "id, company_id, supplier_id, counterparty_name, total_amount, vat_amount, invoice_number, invoice_date, notes, workflow_state, approval_step",
      )
      .eq("id", body.invoice_id)
      .single();
    if (invErr || !invoice) return corsError("Invoice not found", 404);

    const { data: hasAccess } = await admin.rpc("has_company_access", {
      _user_id: userId,
      _company_id: invoice.company_id,
    });
    if (!hasAccess) return corsError("Forbidden", 403);

    // 1. Try supplier history first (≥3 prior bookings, same account)
    let proposal: PreAccountingProposal | null = null;

    if (invoice.supplier_id) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: history } = await admin
        .from("invoice_preaccounting")
        .select("account, vat_code, cost_center, project_code, invoice_id")
        .gte("created_at", sixMonthsAgo.toISOString())
        .in(
          "invoice_id",
          (
            await admin
              .from("invoices")
              .select("id")
              .eq("supplier_id", invoice.supplier_id)
              .eq("company_id", invoice.company_id)
          ).data?.map((r: { id: string }) => r.id) ?? [],
        );

      if (history && history.length >= 3) {
        const tally: Record<string, number> = {};
        for (const h of history) tally[(h as { account: string }).account] = (tally[(h as { account: string }).account] ?? 0) + 1;
        const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 3) {
          const matching = history.find((h) => (h as { account: string }).account === top[0]) as {
            account: string;
            vat_code: string | null;
            cost_center: string | null;
            project_code: string | null;
          };
          proposal = {
            account: matching.account,
            vat_code: matching.vat_code ?? "M25",
            cost_center: matching.cost_center,
            project_code: matching.project_code,
            confidence: 0.96,
            source: "history",
            periodization_plan: null,
          };
        }
      }
    }

    // 2. Fallback to AI
    if (!proposal) {
      const ai = await callAIGateway(invoice as Record<string, unknown>);
      proposal = {
        account: ai?.account ?? "5410",
        vat_code: ai?.vat_code ?? "M25",
        cost_center: null,
        project_code: null,
        confidence: ai?.confidence ?? 0.5,
        source: ai ? "ai" : "default",
        periodization_plan: null,
      };
    }

    // 3. Periodization heuristic
    if (looksRecurring(invoice.notes as string | null) && (invoice.total_amount as number) >= 6000) {
      proposal.periodization_plan = buildMonthlySchedule(
        invoice.total_amount as number,
        invoice.invoice_date as string,
        12,
      );
    }

    // 4. Upsert into invoice_preaccounting
    const { error: upErr } = await admin
      .from("invoice_preaccounting")
      .upsert(
        {
          invoice_id: invoice.id,
          company_id: invoice.company_id,
          account: proposal.account,
          vat_code: proposal.vat_code,
          cost_center: proposal.cost_center,
          project_code: proposal.project_code,
          periodization_plan: proposal.periodization_plan,
          confidence: proposal.confidence,
          source: proposal.source,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "invoice_id" } as never,
      );
    if (upErr) return corsError(`Preaccounting upsert failed: ${upErr.message}`, 500);

    // 5. Advance state if not already past PRE_ACCOUNTED
    const stage = invoice.workflow_state as string;
    const advanceFrom = ["INVOICE_LOGGED", "AI_VERIFIED", "SUPPLIER_REVIEW_REQUIRED", "PRE_ACCOUNTED"];
    if (advanceFrom.includes(stage) && (invoice.approval_step ?? 0) === 0) {
      await admin
        .from("invoices")
        .update({ workflow_state: "IN_APPROVAL_FLOW" } as never)
        .eq("id", invoice.id);
    }

    return corsJson({ ok: true, proposal });
  } catch (e) {
    console.error("ap-preaccount error:", e);
    return corsError(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
