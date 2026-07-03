import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface AlertItem {
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  action_path: string;
  category: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active companies
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, org_number")
      .in("subscription_status", ["active", "trialing"]);

    if (!companies?.length) {
      return new Response(JSON.stringify({ message: "Inga aktiva företag" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const results = [];

    for (const company of companies.slice(0, 10)) {
      try {
        const alerts: AlertItem[] = [];
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const threeMonthsAgo = new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0];
        const oneMonthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
        const twoMonthsAgo = new Date(now.getTime() - 60 * 86400000).toISOString().split("T")[0];
        const threeDaysAhead = new Date(now.getTime() + 3 * 86400000).toISOString().split("T")[0];
        const sevenDaysAhead = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];

        // Parallel data fetches
        const [
          cashRes, overdueARRes, overdueAPRes, upcomingAPRes,
          currentMonthRes, prevMonthRes, prev2MonthRes,
          pendingRes, recentEntriesRes, bankUnmatchedRes
        ] = await Promise.all([
          // Cash balance (accounts 19xx)
          supabase.from("journal_entry_lines")
            .select("debit, credit, chart_of_accounts!inner(account_number), journal_entries!inner(company_id, status)")
            .eq("journal_entries.company_id", company.id)
            .eq("journal_entries.status", "approved")
            .like("chart_of_accounts.account_number", "19%"),
          // Overdue AR
          supabase.from("invoices")
            .select("total_amount, due_date, counterparty_name, invoice_number")
            .eq("company_id", company.id)
            .eq("status", "overdue")
            .eq("invoice_direction", "outgoing"),
          // Overdue AP
          supabase.from("invoices")
            .select("total_amount, due_date, counterparty_name")
            .eq("company_id", company.id)
            .eq("status", "overdue")
            .eq("invoice_direction", "incoming"),
          // Upcoming AP (due within 3 days)
          supabase.from("invoices")
            .select("total_amount, due_date, counterparty_name")
            .eq("company_id", company.id)
            .in("status", ["sent", "draft"])
            .eq("invoice_direction", "incoming")
            .gte("due_date", todayStr)
            .lte("due_date", threeDaysAhead),
          // Current month expenses by account
          supabase.from("journal_entry_lines")
            .select("debit, credit, chart_of_accounts!inner(account_number, account_name, account_type), journal_entries!inner(company_id, status, entry_date)")
            .eq("journal_entries.company_id", company.id)
            .eq("journal_entries.status", "approved")
            .gte("journal_entries.entry_date", oneMonthAgo),
          // Previous month
          supabase.from("journal_entry_lines")
            .select("debit, credit, chart_of_accounts!inner(account_number, account_name, account_type), journal_entries!inner(company_id, status, entry_date)")
            .eq("journal_entries.company_id", company.id)
            .eq("journal_entries.status", "approved")
            .gte("journal_entries.entry_date", twoMonthsAgo)
            .lt("journal_entries.entry_date", oneMonthAgo),
          // Month before that
          supabase.from("journal_entry_lines")
            .select("debit, credit, chart_of_accounts!inner(account_number, account_name, account_type), journal_entries!inner(company_id, status, entry_date)")
            .eq("journal_entries.company_id", company.id)
            .eq("journal_entries.status", "approved")
            .gte("journal_entries.entry_date", threeMonthsAgo)
            .lt("journal_entries.entry_date", twoMonthsAgo),
          // Pending approvals
          supabase.from("journal_entries")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("status", "pending_approval"),
          // Recent entries (last 14 days)
          supabase.from("journal_entries")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("status", "approved")
            .gte("entry_date", new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0]),
          // Unmatched bank transactions
          supabase.from("bank_transactions")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("status", "pending"),
        ]);

        // === LIKVIDITET & KASSA ===
        const cashBalance = (cashRes.data || []).reduce((s: number, l: any) => s + ((l.debit || 0) - (l.credit || 0)), 0);
        
        // Calculate monthly burn rate
        const calcExpenses = (lines: any[]) => (lines || []).reduce((s: number, l: any) => {
          const num = l.chart_of_accounts?.account_number || "";
          if (num.startsWith("4") || num.startsWith("5") || num.startsWith("6") || num.startsWith("7")) {
            return s + ((l.debit || 0) - (l.credit || 0));
          }
          return s;
        }, 0);
        
        const calcRevenue = (lines: any[]) => (lines || []).reduce((s: number, l: any) => {
          const num = l.chart_of_accounts?.account_number || "";
          if (num.startsWith("3")) return s + ((l.credit || 0) - (l.debit || 0));
          return s;
        }, 0);

        const currentExpenses = calcExpenses(currentMonthRes.data || []);
        const prevExpenses = calcExpenses(prevMonthRes.data || []);
        const prev2Expenses = calcExpenses(prev2MonthRes.data || []);
        const avgMonthlyExpenses = (currentExpenses + prevExpenses + prev2Expenses) / 3;
        
        const currentRevenue = calcRevenue(currentMonthRes.data || []);
        const prevRevenue = calcRevenue(prevMonthRes.data || []);

        if (cashBalance < 0) {
          alerts.push({
            title: "Negativ kassa",
            message: `Kassasaldot är ${Math.round(cashBalance).toLocaleString("sv-SE")} kr — akut likviditetsbrist.`,
            severity: "critical",
            action_path: "/reports",
            category: "liquidity",
          });
        } else if (avgMonthlyExpenses > 0) {
          const runwayMonths = cashBalance / avgMonthlyExpenses;
          if (runwayMonths < 3) {
            alerts.push({
              title: "Låg likviditet",
              message: `Baserat på nuvarande burn rate räcker kassan ${runwayMonths.toFixed(1)} månader.`,
              severity: runwayMonths < 1 ? "critical" : "warning",
              action_path: "/cash-flow",
              category: "liquidity",
            });
          }
        }

        // === KUNDFORDRINGAR (AR) ===
        const overdueAR = overdueARRes.data || [];
        if (overdueAR.length > 0) {
          const totalOverdue = overdueAR.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
          // Group by customer
          const byCustomer = new Map<string, { count: number; total: number }>();
          overdueAR.forEach((inv: any) => {
            const name = inv.counterparty_name || "Okänd";
            const existing = byCustomer.get(name) || { count: 0, total: 0 };
            byCustomer.set(name, { count: existing.count + 1, total: existing.total + (inv.total_amount || 0) });
          });
          
          // Alert per customer with multiple overdue
          for (const [name, data] of byCustomer) {
            if (data.count >= 2 || data.total > 50000) {
              alerts.push({
                title: "Förfallna kundfakturor",
                message: `${name} har ${data.count} fakturor förfallna, totalt ${Math.round(data.total).toLocaleString("sv-SE")} kr.`,
                severity: data.total > 100000 ? "critical" : "warning",
                action_path: "/invoices",
                category: "ar",
              });
            }
          }
          
          if (byCustomer.size > 3) {
            alerts.push({
              title: "Många förfallna fakturor",
              message: `Totalt ${Math.round(totalOverdue).toLocaleString("sv-SE")} kr i förfallna kundfakturor. Skicka påminnelser.`,
              severity: "warning",
              action_path: "/invoices",
              category: "ar",
            });
          }
        }

        // === LEVERANTÖRSSKULDER (AP) ===
        const overdueAP = overdueAPRes.data || [];
        if (overdueAP.length > 0) {
          const totalOverdueAP = overdueAP.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
          alerts.push({
            title: "Förfallna leverantörsfakturor",
            message: `${overdueAP.length} leverantörsfakturor förfallna, totalt ${Math.round(totalOverdueAP).toLocaleString("sv-SE")} kr.`,
            severity: "critical",
            action_path: "/invoices",
            category: "ap",
          });
        }

        const upcomingAP = upcomingAPRes.data || [];
        if (upcomingAP.length > 0) {
          const totalUpcoming = upcomingAP.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
          alerts.push({
            title: "Leverantörsfakturor förfaller snart",
            message: `${Math.round(totalUpcoming).toLocaleString("sv-SE")} kr förfaller inom 3 dagar.`,
            severity: "warning",
            action_path: "/invoices",
            category: "ap",
          });
        }

        // === SKATTEDEADLINES ===
        const dayOfMonth = now.getDate();
        const currentMonth = now.getMonth(); // 0-indexed
        
        // Moms: 12:e varje månad (eller 26:e för stora företag)
        if (dayOfMonth <= 12 && dayOfMonth >= 5) {
          const daysLeft = 12 - dayOfMonth;
          alerts.push({
            title: "Momsdeklaration",
            message: `Momsdeklaration förfaller om ${daysLeft} dagar (den 12:e). Kontrollera att allt är bokfört.`,
            severity: daysLeft <= 3 ? "critical" : "warning",
            action_path: "/vat-reports",
            category: "tax",
          });
        }

        // AGI: 12:e varje månad
        if (dayOfMonth <= 12 && dayOfMonth >= 5) {
          const daysLeft = 12 - dayOfMonth;
          alerts.push({
            title: "AGI-deadline",
            message: `Arbetsgivardeklaration ska lämnas senast den 12:e (om ${daysLeft} dagar).`,
            severity: daysLeft <= 3 ? "critical" : "warning",
            action_path: "/automation",
            category: "tax",
          });
        }

        // F-skatt: 12:e varje månad
        if (dayOfMonth <= 12 && dayOfMonth >= 8) {
          alerts.push({
            title: "F-skatt",
            message: `F-skatt förfaller den 12:e denna månad.`,
            severity: "info",
            action_path: "/tax-rules",
            category: "tax",
          });
        }

        // === OVANLIGA TRANSAKTIONER ===
        // Calculate per-account expenses for current vs average of prev 2 months
        const accountExpenses = (lines: any[]) => {
          const map = new Map<string, { total: number; name: string }>();
          (lines || []).forEach((l: any) => {
            const num = l.chart_of_accounts?.account_number || "";
            if (num.startsWith("4") || num.startsWith("5") || num.startsWith("6") || num.startsWith("7")) {
              const amount = (l.debit || 0) - (l.credit || 0);
              if (amount > 0) {
                const existing = map.get(num) || { total: 0, name: l.chart_of_accounts?.account_name || num };
                map.set(num, { total: existing.total + amount, name: existing.name });
              }
            }
          });
          return map;
        };

        const currentAccounts = accountExpenses(currentMonthRes.data || []);
        const prevAccounts = accountExpenses(prevMonthRes.data || []);
        const prev2Accounts = accountExpenses(prev2MonthRes.data || []);

        for (const [accNum, current] of currentAccounts) {
          const prevTotal = (prevAccounts.get(accNum)?.total || 0);
          const prev2Total = (prev2Accounts.get(accNum)?.total || 0);
          const avg = (prevTotal + prev2Total) / 2;
          
          if (avg > 1000 && current.total > avg * 1.5) {
            const pctIncrease = Math.round(((current.total / avg) - 1) * 100);
            alerts.push({
              title: "Ovanlig kostnad",
              message: `${current.name} (${accNum}): ${Math.round(current.total).toLocaleString("sv-SE")} kr — normalt ca ${Math.round(avg).toLocaleString("sv-SE")} kr/mån (+${pctIncrease}%).`,
              severity: pctIncrease > 100 ? "warning" : "info",
              action_path: "/reports",
              category: "anomaly",
            });
          }
        }

        // === MARGINAL & RESULTAT ===
        if (prevRevenue > 0 && currentRevenue > 0) {
          const currentMargin = ((currentRevenue - currentExpenses) / currentRevenue) * 100;
          const prevMargin = ((prevRevenue - prevExpenses) / prevRevenue) * 100;
          const marginDrop = prevMargin - currentMargin;
          
          if (marginDrop > 10) {
            alerts.push({
              title: "Marginalfall",
              message: `Marginalen sjönk ${marginDrop.toFixed(0)} procentenheter (${prevMargin.toFixed(0)}% → ${currentMargin.toFixed(0)}%).`,
              severity: marginDrop > 20 ? "critical" : "warning",
              action_path: "/reports",
              category: "margin",
            });
          }
        }

        if (prevRevenue > 0 && currentRevenue > 0) {
          const revenueChange = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
          if (revenueChange < -15) {
            alerts.push({
              title: "Intäktsminskning",
              message: `Intäkterna minskade ${Math.abs(revenueChange).toFixed(0)}% jämfört med föregående månad.`,
              severity: revenueChange < -30 ? "critical" : "warning",
              action_path: "/reports",
              category: "revenue",
            });
          }
        }

        // === KOSTNADSÖKNING ===
        if (prevExpenses > 0 && currentExpenses > prevExpenses * 1.3) {
          const pct = Math.round(((currentExpenses / prevExpenses) - 1) * 100);
          alerts.push({
            title: "Kostnadsökning",
            message: `Kostnaderna ökade ${pct}% jämfört med föregående månad. Kontrollera budgeten.`,
            severity: pct > 50 ? "warning" : "info",
            action_path: "/reports",
            category: "expenses",
          });
        }

        // === MISC ===
        const pendingCount = pendingRes.count || 0;
        if (pendingCount > 5) {
          alerts.push({
            title: "Väntande verifikationer",
            message: `${pendingCount} verifikationer väntar på godkännande.`,
            severity: pendingCount > 20 ? "warning" : "info",
            action_path: "/verifications",
            category: "bookkeeping",
          });
        }

        const recentCount = recentEntriesRes.count || 0;
        if (recentCount === 0) {
          alerts.push({
            title: "Ingen bokföring",
            message: `Inga bokföringar senaste 14 dagarna. Håll bokföringen aktuell.`,
            severity: "warning",
            action_path: "/bookkeep",
            category: "bookkeeping",
          });
        }

        const unmatchedBank = bankUnmatchedRes.count || 0;
        if (unmatchedBank > 10) {
          alerts.push({
            title: "Bankavstämning",
            message: `${unmatchedBank} banktransaktioner att stämma av.`,
            severity: unmatchedBank > 50 ? "warning" : "info",
            action_path: "/bank",
            category: "bank",
          });
        }

        // Store alerts (deduplicated)
        if (alerts.length > 0) {
          const oneDayAgo = new Date(now.getTime() - 24 * 3600000).toISOString();
          
          for (const alert of alerts) {
            // Check dedup
            const { data: existing } = await supabase
              .from("bank_notifications")
              .select("id")
              .eq("company_id", company.id)
              .eq("notification_type", "proactive_insight")
              .gte("created_at", oneDayAgo)
              .ilike("title", alert.title)
              .limit(1);

            if (existing && existing.length > 0) continue;

            await supabase.from("bank_notifications").insert({
              company_id: company.id,
              notification_type: "proactive_insight",
              title: alert.title,
              message: alert.message,
              severity: alert.severity === "critical" ? "critical" : alert.severity,
            });
          }
          
          results.push({ company: company.name, alert_count: alerts.length });
        }
      } catch (err) {
        console.error(`Error for ${company.name}:`, err);
      }
    }

    return new Response(JSON.stringify({ processed: companies.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Proactive insights error:", error);
    return new Response(JSON.stringify({ error: "Fel" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
