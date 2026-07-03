// Bureau-wide risk scoring engine.
// Computes risk_score 0-100 with signals per active firm client.
// Auth: caller must be a member of the firm (verified via RLS through user-scoped client).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface Signal {
  code: string;
  message: string;
  severity: "info" | "warning" | "critical";
  action_url: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const { firm_id } = await req.json();
    if (!firm_id) return json({ error: "firm_id required" }, 400);

    // Verify membership via RLS-scoped query
    const { data: member, error: mErr } = await userClient
      .from("firm_members")
      .select("id")
      .eq("firm_id", firm_id)
      .eq("user_id", claims.claims.sub)
      .eq("is_active", true)
      .maybeSingle();
    if (mErr || !member) return json({ error: "Forbidden" }, 403);

    // Service-role client to write
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: clients } = await admin
      .from("firm_clients")
      .select("id, company_id, companies:company_id (id, name)")
      .eq("firm_id", firm_id)
      .eq("is_active", true);

    const results = [];
    for (const fc of clients ?? []) {
      const score = await scoreClient(admin, fc.company_id);
      const level = levelFor(score.total);
      const { error } = await admin
        .from("bureau_client_risk")
        .upsert(
          {
            firm_id,
            firm_client_id: fc.id,
            company_id: fc.company_id,
            score: score.total,
            level,
            signals: score.signals,
            calculated_at: new Date().toISOString(),
          },
          { onConflict: "firm_client_id" },
        );
      if (error) console.error("upsert err", error);
      results.push({ firm_client_id: fc.id, score: score.total, level, signals_count: score.signals.length });
    }

    return json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error("risk engine error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function levelFor(s: number): "safe" | "watch" | "warning" | "critical" {
  if (s <= 20) return "safe";
  if (s <= 40) return "watch";
  if (s <= 65) return "warning";
  return "critical";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function scoreClient(admin: ReturnType<typeof createClient>, company_id: string) {
  const signals: Signal[] = [];
  let total = 0;
  const today = new Date();
  const url = (path: string) => `/clients/${company_id}/${path}`;

  // ---- FINANCIAL HEALTH (40%) ----
  // Soliditet via journal lines (account 2010-2099 = equity, asset accounts 1xxx)
  try {
    const { data: balances } = await admin.rpc("get_account_balances" as never, { p_company_id: company_id }).select?.() ?? { data: null };
    let equity = 0, assets = 0;
    if (Array.isArray(balances)) {
      for (const b of balances as Array<{ account_number: string; balance: number }>) {
        const n = parseInt(b.account_number, 10);
        if (n >= 2010 && n < 2100) equity += -Number(b.balance ?? 0);
        if (n >= 1000 && n < 2000) assets += Number(b.balance ?? 0);
      }
    }
    if (assets > 0) {
      const soliditet = (equity / assets) * 100;
      if (soliditet < 15) {
        total += 20;
        signals.push({
          code: "LOW_SOLIDARITY",
          message: `Soliditet ${soliditet.toFixed(1)}% — under kritisk gräns 15%`,
          severity: "warning",
          action_url: url("reports"),
        });
      }
    }
  } catch (e) { console.warn("soliditet skip", e); }

  // ---- COMPLIANCE HEALTH (35%) ----
  // VAT overdue — simple check on vat_declarations
  try {
    const { data: vat } = await admin
      .from("vat_declarations")
      .select("period_end, status, deadline")
      .eq("company_id", company_id)
      .order("period_end", { ascending: false })
      .limit(1);
    const v = vat?.[0];
    if (v?.deadline && v.status !== "filed") {
      const overdueDays = Math.floor((today.getTime() - new Date(v.deadline).getTime()) / 86_400_000);
      if (overdueDays > 0) {
        total += 25;
        signals.push({
          code: "VAT_OVERDUE",
          message: `Moms ej inlämnad — förfallen ${overdueDays} dagar`,
          severity: "critical",
          action_url: url("vat"),
        });
      }
    }
  } catch (e) { console.warn("vat skip", e); }

  // Missing receipts
  try {
    const { count } = await admin
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company_id)
      .is("attachment_url", null);
    if ((count ?? 0) > 20) {
      total += 10;
      signals.push({
        code: "MISSING_RECEIPTS",
        message: `${count} verifikationer saknar bilaga`,
        severity: "warning",
        action_url: url("verifikationer"),
      });
    }
  } catch (e) { console.warn("receipts skip", e); }

  // Bank reconciliation freshness
  try {
    const { data: bt } = await admin
      .from("bank_transactions")
      .select("transaction_date, reconciled")
      .eq("company_id", company_id)
      .eq("reconciled", true)
      .order("transaction_date", { ascending: false })
      .limit(1);
    if (bt?.[0]?.transaction_date) {
      const days = Math.floor((today.getTime() - new Date(bt[0].transaction_date).getTime()) / 86_400_000);
      if (days > 30) {
        total += 15;
        signals.push({
          code: "BANK_STALE",
          message: `Bankavstämning ej uppdaterad på ${days} dagar`,
          severity: "warning",
          action_url: url("bankintegration"),
        });
      }
    }
  } catch (e) { console.warn("bank skip", e); }

  // ---- ACTIVITY HEALTH (25%) ----
  try {
    const { data: lastJe } = await admin
      .from("journal_entries")
      .select("entry_date")
      .eq("company_id", company_id)
      .order("entry_date", { ascending: false })
      .limit(1);
    if (lastJe?.[0]?.entry_date) {
      const days = Math.floor((today.getTime() - new Date(lastJe[0].entry_date).getTime()) / 86_400_000);
      if (days > 14) {
        total += 10;
        signals.push({
          code: "INACTIVE_BOOKKEEPING",
          message: `Ingen bokföring på ${days} dagar`,
          severity: "info",
          action_url: url("verifikationer"),
        });
      }
    }
  } catch (e) { console.warn("activity skip", e); }

  return { total: Math.min(100, total), signals };
}
