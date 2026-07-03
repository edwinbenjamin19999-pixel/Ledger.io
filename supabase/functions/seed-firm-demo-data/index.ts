// Seed demo data across all clients of the calling advisor's firm so the
// WL orchestration views (VAT, Tax, AGI, Invoices, Supplier invoices) are
// populated with realistic rows in different lifecycle stages.
//
// Respects RLS by using the caller's JWT, but for inserts we use the
// service role to bypass insert constraints that require specific user
// contexts (created_by). All inserts are scoped to companies the caller
// is verified to have firm-level access to.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Surface = "vat" | "tax" | "agi" | "invoices" | "supplier_invoices";

interface Body {
  surface: Surface;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) {
      return json({ error: "Missing authorization" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Invalid session" }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as Body;
    const surface = body.surface;
    if (!surface) {
      return json({ error: "surface required" }, 400);
    }

    // Find the advisor's firm + linked clients.
    const { data: membership } = await admin
      .from("firm_members")
      .select("firm_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      return json({ error: "Inte medlem i någon byrå" }, 403);
    }

    const { data: mandates } = await admin
      .from("firm_client_mandates")
      .select("client_company_id, status")
      .eq("firm_id", membership.firm_id)
      .eq("status", "active");

    const companyIds = (mandates ?? []).map((m: any) => m.client_company_id);
    if (companyIds.length === 0) {
      return json({ error: "Inga klienter kopplade till byrån" }, 400);
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = today.getMonth() + 1;

    let inserted = 0;
    const errors: string[] = [];

    for (const companyId of companyIds) {
      try {
        if (surface === "vat") {
          inserted += await seedVAT(admin, companyId, yyyy, mm);
        } else if (surface === "agi") {
          inserted += await seedAGI(admin, companyId, yyyy, mm);
        } else if (surface === "invoices") {
          inserted += await seedInvoices(admin, companyId, userId, today);
        } else if (surface === "supplier_invoices") {
          inserted += await seedSupplierInvoices(admin, companyId, userId, today);
        } else if (surface === "tax") {
          // tax_calculations table may not exist; skip gracefully.
          inserted += 0;
        }
      } catch (e: any) {
        errors.push(`${companyId}: ${e.message ?? e}`);
      }
    }

    return json({ ok: true, inserted, clients: companyIds.length, errors });
  } catch (e: any) {
    console.error("[seed-firm-demo-data] fatal", e);
    return json({ error: e.message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function seedVAT(
  admin: any,
  companyId: string,
  year: number,
  month: number,
) {
  const stages = ["draft", "review", "ready", "submitted"];
  let count = 0;
  for (let i = 0; i < stages.length; i++) {
    const periodMonth = ((month - 1 - i + 12) % 12) + 1;
    const periodYear = month - 1 - i < 0 ? year - 1 : year;
    const start = `${periodYear}-${pad(periodMonth)}-01`;
    const endDate = new Date(periodYear, periodMonth, 0);
    const end = isoDate(endDate);

    const { error } = await admin.from("vat_periods").insert({
      company_id: companyId,
      period_start: start,
      period_end: end,
      period_type: "monthly",
      status: stages[i],
      ruta_values: { "05": 100000 + i * 25000, "10": 25000 + i * 5000 },
      submitted_at: stages[i] === "submitted" ? new Date().toISOString() : null,
    });
    if (!error) count++;
  }
  return count;
}

async function seedAGI(
  admin: any,
  companyId: string,
  year: number,
  month: number,
) {
  const stages = ["draft", "ready", "submitted"];
  let count = 0;
  for (let i = 0; i < stages.length; i++) {
    const periodMonth = ((month - 1 - i + 12) % 12) + 1;
    const periodYear = month - 1 - i < 0 ? year - 1 : year;
    const { error } = await admin.from("agi_periods").insert({
      company_id: companyId,
      period_year: periodYear,
      period_month: periodMonth,
      period_type: "monthly",
      status: stages[i],
    });
    if (!error) count++;
  }
  return count;
}

async function seedInvoices(
  admin: any,
  companyId: string,
  userId: string,
  today: Date,
) {
  const items = [
    { status: "draft", offsetDays: 5, amount: 12500 },
    { status: "sent", offsetDays: 14, amount: 24800 },
    { status: "sent", offsetDays: -8, amount: 18200 }, // overdue
    { status: "paid", offsetDays: -22, amount: 31450 },
  ];
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const due = new Date(today);
    due.setDate(due.getDate() + it.offsetDays);
    const issue = new Date(due);
    issue.setDate(issue.getDate() - 30);
    const { error } = await admin.from("invoices").insert({
      company_id: companyId,
      invoice_type: "outgoing",
      invoice_direction: "outgoing",
      invoice_number: `DEMO-${Date.now().toString().slice(-6)}-${i}`,
      invoice_date: isoDate(issue),
      due_date: isoDate(due),
      counterparty_name: `Demo Kund ${i + 1} AB`,
      total_amount: it.amount,
      vat_amount: Math.round(it.amount * 0.2),
      currency: "SEK",
      status: it.status as any,
      created_by: userId,
      reminder_count: 0,
    });
    if (!error) count++;
    else console.warn("invoice insert", error.message);
  }
  return count;
}

async function seedSupplierInvoices(
  admin: any,
  companyId: string,
  userId: string,
  today: Date,
) {
  const items = [
    { status: "draft", offsetDays: 18, amount: 8400, approval_step: 0 },
    { status: "draft", offsetDays: 7, amount: 14300, approval_step: 1 },
    { status: "approved", offsetDays: 3, amount: 6750, approval_step: 2 },
    { status: "paid", offsetDays: -15, amount: 22100, approval_step: 2 },
  ];
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const due = new Date(today);
    due.setDate(due.getDate() + it.offsetDays);
    const issue = new Date(due);
    issue.setDate(issue.getDate() - 30);
    const { error } = await admin.from("invoices").insert({
      company_id: companyId,
      invoice_type: "incoming",
      invoice_direction: "incoming",
      invoice_number: `LEV-DEMO-${Date.now().toString().slice(-6)}-${i}`,
      invoice_date: isoDate(issue),
      due_date: isoDate(due),
      counterparty_name: `Demo Leverantör ${i + 1} AB`,
      total_amount: it.amount,
      vat_amount: Math.round(it.amount * 0.2),
      currency: "SEK",
      status: it.status as any,
      created_by: userId,
      reminder_count: 0,
      approval_step: it.approval_step,
    });
    if (!error) count++;
    else console.warn("supplier invoice insert", error.message);
  }
  return count;
}
