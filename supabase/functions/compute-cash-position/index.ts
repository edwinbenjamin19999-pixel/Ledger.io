import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CashPosition {
  currentBalance: number;
  expectedInflows30d: number;
  committedOutflows30d: number;
  netCashFlow30d: number;
  runwayDays: number | null;
  burnRateMonthly: number;
  accounts: Array<{
    id: string;
    bank_name: string;
    balance: number;
    last_synced_at: string | null;
    freshness_seconds: number | null;
    connection_status: "live" | "stale" | "manual";
  }>;
  dataFreshness: {
    oldest_sync_seconds: number | null;
    newest_sync_seconds: number | null;
    has_stale_data: boolean;
  };
  computed_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  try {
    const { company_id, horizon_days = 30 } = await req.json();
    if (!company_id) throw new Error("company_id required");

    const now = Date.now();
    const horizonDate = new Date(now + horizon_days * 86400_000).toISOString().slice(0, 10);

    // 1. Bank accounts → current balance
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select("id, bank_name, balance, last_synced_at, bank_connection_id")
      .eq("company_id", company_id)
      .eq("is_active", true);

    let currentBalance = (accounts ?? []).reduce((s, a) => s + (Number(a.balance) || 0), 0);

    // Canonical fallback: if bank_accounts sum is 0 (no bank linked, manual books),
    // derive liquid cash from the general ledger (BAS 1910-1930, posted/approved).
    // This keeps Likviditet-live / Cash Command in sync with cashflow forecast.
    if (!currentBalance) {
      const { data: cashAccounts } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", company_id)
        .gte("account_number", "1910")
        .lte("account_number", "1930");
      const ids = (cashAccounts ?? []).map((a: { id: string }) => a.id);
      if (ids.length) {
        const { data: ledgerLines } = await supabase
          .from("journal_entry_lines")
          .select("debit, credit, journal_entries!inner(company_id, status)")
          .eq("journal_entries.company_id", company_id)
          .in("journal_entries.status", ["posted", "approved", "pending_approval"])
          .in("account_id", ids);
        currentBalance = (ledgerLines ?? []).reduce(
          (s: number, l: { debit: number | null; credit: number | null }) =>
            s + Number(l.debit ?? 0) - Number(l.credit ?? 0),
          0,
        );
      }
    }

    const accountFresh = (accounts ?? []).map((a) => {
      const synced = a.last_synced_at ? new Date(a.last_synced_at).getTime() : null;
      const freshness = synced ? Math.round((now - synced) / 1000) : null;
      const isManual = !a.bank_connection_id;
      return {
        id: a.id,
        bank_name: a.bank_name,
        balance: Number(a.balance) || 0,
        last_synced_at: a.last_synced_at,
        freshness_seconds: freshness,
        connection_status: (isManual
          ? "manual"
          : freshness !== null && freshness < 30 * 60
            ? "live"
            : "stale") as "live" | "stale" | "manual",
      };
    });

    const freshnesses = accountFresh
      .filter((a) => a.connection_status !== "manual" && a.freshness_seconds !== null)
      .map((a) => a.freshness_seconds!);
    const oldest = freshnesses.length ? Math.max(...freshnesses) : null;
    const newest = freshnesses.length ? Math.min(...freshnesses) : null;

    // 2. Expected inflows: outstanding outgoing invoices due within horizon
    const { data: arInvoices } = await supabase
      .from("invoices")
      .select("total_amount, due_date, status, invoice_direction")
      .eq("company_id", company_id)
      .eq("invoice_direction", "outgoing")
      .in("status", ["sent", "overdue"])
      .lte("due_date", horizonDate);

    const expectedInflows30d = (arInvoices ?? []).reduce(
      (s, i) => s + (Number(i.total_amount) || 0),
      0,
    );

    // 3. Committed outflows: incoming (supplier) invoices due within horizon
    const { data: apInvoices } = await supabase
      .from("invoices")
      .select("total_amount, due_date, status, invoice_direction")
      .eq("company_id", company_id)
      .eq("invoice_direction", "incoming")
      .in("status", ["sent", "overdue", "attested"])
      .lte("due_date", horizonDate);

    const committedOutflows30d = (apInvoices ?? []).reduce(
      (s, i) => s + (Number(i.total_amount) || 0),
      0,
    );

    // 4. Burn rate (last 90 days of outflows from bank_transactions)
    const ninetyAgo = new Date(now - 90 * 86400_000).toISOString().slice(0, 10);
    const { data: recentOutflows } = await supabase
      .from("bank_transactions")
      .select("amount")
      .eq("company_id", company_id)
      .lt("amount", 0)
      .gte("booking_date", ninetyAgo);

    const totalBurn90d = (recentOutflows ?? []).reduce(
      (s, t) => s + Math.abs(Number(t.amount) || 0),
      0,
    );
    const burnRateMonthly = totalBurn90d / 3;
    const burnRateDaily = totalBurn90d / 90;

    // 5. Runway = projected balance / daily burn
    const projectedBalance = currentBalance + expectedInflows30d - committedOutflows30d;
    const runwayDays = burnRateDaily > 0 ? Math.round(projectedBalance / burnRateDaily) : null;

    const result: CashPosition = {
      currentBalance,
      expectedInflows30d,
      committedOutflows30d,
      netCashFlow30d: expectedInflows30d - committedOutflows30d,
      runwayDays,
      burnRateMonthly,
      accounts: accountFresh,
      dataFreshness: {
        oldest_sync_seconds: oldest,
        newest_sync_seconds: newest,
        has_stale_data: oldest !== null && oldest > 30 * 60,
      },
      computed_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
