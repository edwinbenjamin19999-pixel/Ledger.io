import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth — require valid JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { company_id, bank_account_id } = await req.json();
    if (!company_id) throw new Error("company_id required");

    // Fetch accounts to sync (one specific or all for company)
    const query = supabase
      .from("bank_accounts")
      .select("id, company_id, bank_connection_id")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .not("bank_connection_id", "is", null);

    if (bank_account_id) query.eq("id", bank_account_id);

    const { data: accounts, error } = await query;
    if (error) throw error;

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const acc of accounts ?? []) {
      const start = Date.now();
      try {
        const { error: invokeErr } = await supabase.functions.invoke("fetch-bank-transactions", {
          body: { bank_account_id: acc.id, company_id: acc.company_id },
        });
        if (invokeErr) throw invokeErr;

        await supabase.from("bank_sync_log").insert({
          company_id: acc.company_id,
          bank_account_id: acc.id,
          status: "success",
          duration_ms: Date.now() - start,
        });

        results.push({ id: acc.id, status: "success" });
      } catch (e) {
        const msg = (e as Error).message;
        await supabase.from("bank_sync_log").insert({
          company_id: acc.company_id,
          bank_account_id: acc.id,
          status: "failed",
          error_message: msg,
          duration_ms: Date.now() - start,
        });
        results.push({ id: acc.id, status: "failed", error: msg });
      }
    }

    // Update aggregate status
    const allOk = results.every((r) => r.status === "success");
    await supabase
      .from("company_bank_sync_status")
      .update({
        connection_status: allOk ? "healthy" : "degraded",
        last_sync_at: new Date().toISOString(),
        consecutive_failures: allOk ? 0 : undefined,
      })
      .eq("company_id", company_id);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
