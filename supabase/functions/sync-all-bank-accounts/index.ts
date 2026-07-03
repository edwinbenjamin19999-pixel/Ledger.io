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

  try {
    // Fetch all active accounts that haven't synced in the last 15 min
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: accounts, error } = await supabase
      .from("bank_accounts")
      .select("id, company_id, bank_connection_id, last_synced_at")
      .eq("is_active", true)
      .not("bank_connection_id", "is", null)
      .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`);

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

        await supabase
          .from("company_bank_sync_status")
          .update({
            connection_status: "healthy",
            last_error_message: null,
            consecutive_failures: 0,
            last_sync_at: new Date().toISOString(),
          })
          .eq("company_id", acc.company_id);

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

        // Bump consecutive failures
        const { data: status } = await supabase
          .from("company_bank_sync_status")
          .select("consecutive_failures")
          .eq("company_id", acc.company_id)
          .maybeSingle();

        const newFailures = (status?.consecutive_failures ?? 0) + 1;
        await supabase
          .from("company_bank_sync_status")
          .update({
            connection_status: newFailures >= 3 ? "failed" : "degraded",
            last_error_message: msg,
            consecutive_failures: newFailures,
          })
          .eq("company_id", acc.company_id);

        results.push({ id: acc.id, status: "failed", error: msg });
      }
    }

    return new Response(JSON.stringify({ ok: true, synced: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
