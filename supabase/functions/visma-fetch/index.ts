/**
 * visma-fetch
 * Fetches customers, suppliers, customer/supplier invoices from Visma eEkonomi
 * for the given company and inserts into imported_* tables.
 * Refreshes access token automatically when expired.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { VismaFetcher } from "./vismaFetcher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VISMA_TOKEN_URL = "https://identity.vismaonline.com/connect/token";

async function refreshIfNeeded(supabase: any, conn: any) {
  if (new Date(conn.expires_at).getTime() > Date.now() + 30_000) {
    return conn.access_token;
  }
  const CLIENT_ID = Deno.env.get("VISMA_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("VISMA_CLIENT_SECRET")!;
  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const r = await fetch(VISMA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Visma refresh failed: ${JSON.stringify(j)}`);
  const expiresAt = new Date(Date.now() + (Number(j.expires_in ?? 3600) - 60) * 1000).toISOString();
  await supabase
    .from("visma_connections")
    .update({
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? conn.refresh_token,
      expires_at: expiresAt,
    })
    .eq("company_id", conn.company_id);
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { companyId, fromDate } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn, error: connErr } = await supabase
      .from("visma_connections")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    if (connErr || !conn) {
      return new Response(
        JSON.stringify({ error: "Ingen aktiv Visma-anslutning" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await refreshIfNeeded(supabase, conn);
    const fetcher = new VismaFetcher(accessToken);

    const { data: job, error: jobErr } = await supabase
      .from("migration_jobs")
      .insert({
        company_id: companyId,
        source_system: "visma",
        source_format: "api",
        status: "importing",
        created_by: userData.user.id,
        stats: {},
      })
      .select()
      .single();
    if (jobErr) throw jobErr;

    const stats: Record<string, number> = {};
    try {
      const customers = await fetcher.fetchAllCustomers((n) => (stats.customers = n));
      const suppliers = await fetcher.fetchAllSuppliers((n) => (stats.suppliers = n));
      const invoices = await fetcher.fetchCustomerInvoices(fromDate, (n) => (stats.customerInvoices = n));
      const supplierInvoices = await fetcher.fetchSupplierInvoices(fromDate, (n) => (stats.supplierInvoices = n));

      const insertBatch = async (table: string, rows: any[]) => {
        if (!rows.length) return;
        const sized = 500;
        for (let i = 0; i < rows.length; i += sized) {
          const slice = rows.slice(i, i + sized).map((r) => ({
            ...r,
            company_id: companyId,
            migration_job_id: job.id,
          }));
          const { error } = await supabase.from(table).insert(slice);
          if (error) throw error;
        }
      };

      await insertBatch("imported_customers", customers);
      await insertBatch("imported_suppliers", suppliers);
      await insertBatch("imported_customer_invoices", invoices);
      await insertBatch("imported_supplier_invoices", supplierInvoices);

      await supabase
        .from("migration_jobs")
        .update({ status: "complete", stats, completed_at: new Date().toISOString() })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({ jobId: job.id, stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (innerErr) {
      await supabase
        .from("migration_jobs")
        .update({
          status: "failed",
          errors: [{ message: innerErr instanceof Error ? innerErr.message : String(innerErr) }],
          stats,
        })
        .eq("id", job.id);
      throw innerErr;
    }
  } catch (e) {
    console.error("visma-fetch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
