import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RillionInvoice {
  invoice_number: string;
  supplier_name: string;
  supplier_org_number?: string;
  amount: number;
  currency?: string;
  due_date?: string;
  invoice_date?: string;
  description?: string;
  lines?: {
    account_number?: string;
    amount: number;
    description?: string;
    vat_code?: string;
  }[];
  rillion_id: string;
  approved_by?: string;
  approved_at?: string;
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return corsError("Method not allowed", 405);
  }

  try {
    // Validate API key from header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return corsError("Missing x-api-key header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate the API key against stored keys
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("company_id, is_active, scopes")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyError || !keyData || !keyData.is_active) {
      return corsError("Invalid or inactive API key", 401);
    }

    // Check write scope
    const scopes: string[] = keyData.scopes || [];
    if (!scopes.includes("write") && !scopes.includes("admin")) {
      return corsError("Insufficient permissions — write scope required", 403);
    }

    const companyId = keyData.company_id;
    if (!UUID_RE.test(companyId)) {
      return corsError("Invalid company reference", 400);
    }

    // Parse body
    const body = await req.json() as { invoice?: RillionInvoice; invoices?: RillionInvoice[] };
    const invoices: RillionInvoice[] = body.invoices || (body.invoice ? [body.invoice] : []);

    if (invoices.length === 0) {
      return corsError("No invoice data provided", 400);
    }

    const results: { rillion_id: string; journal_entry_id?: string; status: string; error?: string }[] = [];

    for (const inv of invoices) {
      try {
        if (!inv.invoice_number || !inv.supplier_name || !inv.amount || !inv.rillion_id) {
          results.push({ rillion_id: inv.rillion_id || "unknown", status: "error", error: "Missing required fields" });
          continue;
        }

        // Find or create supplier account (2410 Leverantörsskulder)
        const { data: supplierAccount } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", companyId)
          .eq("account_number", "2410")
          .maybeSingle();

        if (!supplierAccount) {
          results.push({ rillion_id: inv.rillion_id, status: "error", error: "Account 2410 not found" });
          continue;
        }

        // Determine expense account — default 4010 or from lines
        const expenseAccountNumber = inv.lines?.[0]?.account_number || "4010";
        const { data: expenseAccount } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", companyId)
          .eq("account_number", expenseAccountNumber)
          .maybeSingle();

        if (!expenseAccount) {
          results.push({ rillion_id: inv.rillion_id, status: "error", error: `Account ${expenseAccountNumber} not found` });
          continue;
        }

        // Create journal entry
        const { data: je, error: jeError } = await supabase
          .from("journal_entries")
          .insert({
            company_id: companyId,
            entry_date: inv.invoice_date || new Date().toISOString().split("T")[0],
            description: `Leverantörsfaktura ${inv.invoice_number} — ${inv.supplier_name} (Inkommen från Rillion)`,
            status: "draft",
            created_by: companyId, // system-created
            series_code: "L",
          })
          .select("id")
          .maybeSingle();

        if (jeError || !je) {
          results.push({ rillion_id: inv.rillion_id, status: "error", error: jeError?.message || "Failed to create journal entry" });
          continue;
        }

        // Create journal lines (debit expense, credit supplier liability)
        const { error: lineError } = await supabase
          .from("journal_entry_lines")
          .insert([
            { journal_entry_id: je.id, account_id: expenseAccount.id, debit: Math.abs(inv.amount), credit: 0 },
            { journal_entry_id: je.id, account_id: supplierAccount.id, debit: 0, credit: Math.abs(inv.amount) },
          ]);

        if (lineError) {
          results.push({ rillion_id: inv.rillion_id, status: "error", error: lineError.message });
          continue;
        }

        // Log the integration event
        await supabase.from("integration_logs").insert({
          company_id: companyId,
          integration_type: "rillion",
          method: "POST",
          path: "/rillion-webhook",
          status_code: 200,
          request_body: JSON.stringify(inv),
          response_body: JSON.stringify({ journal_entry_id: je.id }),
        });

        results.push({ rillion_id: inv.rillion_id, journal_entry_id: je.id, status: "created" });
      } catch (invErr) {
        results.push({ rillion_id: inv.rillion_id || "unknown", status: "error", error: String(invErr) });
      }
    }

    return corsJson({ success: true, results });
  } catch (err) {
    console.error("Rillion webhook error:", err);
    return corsError("Internal server error", 500);
  }
});
