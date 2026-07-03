import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function loadSession(token: string) {
  const { data, error } = await supabase
    .from("auditor_access")
    .select("*, companies(id, name, org_number)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at) return { invalid: "revoked", session: data };
  if (new Date(data.valid_until) < new Date()) return { invalid: "expired", session: data };
  if (new Date(data.valid_from) > new Date()) return { invalid: "not_yet_active", session: data };
  return { session: data };
}

function dateRange(s: any): { from?: string; to?: string } {
  if (s.scope_type === "fiscal_year" && s.scope_year) {
    return { from: `${s.scope_year}-01-01`, to: `${s.scope_year}-12-31` };
  }
  if (s.scope_type === "custom" && s.scope_from && s.scope_to) {
    return { from: s.scope_from, to: s.scope_to };
  }
  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, action, payload } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: "missing token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const result = await loadSession(token);
    if (!result) return new Response(JSON.stringify({ error: "invalid token" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (result.invalid) return new Response(JSON.stringify({ error: result.invalid, session: { email: result.session.email, valid_until: result.session.valid_until } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const session = result.session;
    const company = session.companies;
    const range = dateRange(session);

    // Update last_accessed_at (fire & forget)
    supabase.from("auditor_access").update({ last_accessed_at: new Date().toISOString() }).eq("id", session.id).then(() => {});

    if (action === "session") {
      return new Response(JSON.stringify({ session: { id: session.id, email: session.email, valid_until: session.valid_until, scope_type: session.scope_type }, company, range }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "journal_entries") {
      let q = supabase.from("journal_entries")
        .select("id, journal_number, entry_date, description, status, ai_confidence")
        .eq("company_id", company.id)
        .in("status", ["posted", "approved"])
        .order("entry_date", { ascending: false })
        .limit(500);
      if (range.from) q = q.gte("entry_date", range.from);
      if (range.to) q = q.lte("entry_date", range.to);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ entries: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ledger") {
      let q = supabase.from("journal_entry_lines")
        .select("id, account_number, debit, credit, description, journal_entries!inner(entry_date, journal_number, status, company_id)")
        .eq("journal_entries.company_id", company.id)
        .in("journal_entries.status", ["posted", "approved"])
        .order("account_number")
        .limit(2000);
      if (range.from) q = q.gte("journal_entries.entry_date", range.from);
      if (range.to) q = q.lte("journal_entries.entry_date", range.to);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ lines: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "chart_of_accounts") {
      const { data, error } = await supabase.from("chart_of_accounts")
        .select("account_number, account_name, account_type")
        .eq("company_id", company.id)
        .order("account_number");
      if (error) throw error;
      return new Response(JSON.stringify({ accounts: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ai_activity") {
      const { data } = await supabase.from("ai_actions")
        .select("id, action_type, description, created_at, status")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return new Response(JSON.stringify({ actions: data ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_comments") {
      const { data } = await supabase.from("auditor_comments")
        .select("*")
        .eq("auditor_access_id", session.id)
        .order("created_at", { ascending: false });
      return new Response(JSON.stringify({ comments: data ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_comment") {
      const { entity_type, entity_id, comment } = payload ?? {};
      if (!entity_type || !entity_id || !comment) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data, error } = await supabase.from("auditor_comments").insert({
        auditor_access_id: session.id,
        company_id: company.id,
        entity_type,
        entity_id: String(entity_id),
        comment: String(comment).slice(0, 2000),
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ comment: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
