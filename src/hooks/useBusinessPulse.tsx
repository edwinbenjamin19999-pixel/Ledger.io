import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InsightSeverity = "red" | "yellow" | "green";

export interface PulseInsight { id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  navigateTo: string;
  category: "liquidity" | "receivables" | "deadlines" | "costs" | "verifications";
}

export interface PulseIndicator { label: string;
  status: InsightSeverity;
}

export interface BusinessPulseData { insights: PulseInsight[];
  indicators: PulseIndicator[];
  updatedAt: Date;
  loading: boolean;
}

export function useBusinessPulse(companyId: string | undefined): BusinessPulseData { const [insights, setInsights] = useState<PulseInsight[]>([]);
  const [indicators, setIndicators] = useState<PulseIndicator[]>([]);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const analyze = useCallback(async () => { if (!companyId) return;
    setLoading(true);

    try { const now = new Date();
      const today = now.toISOString().split("T")[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0];

      // Parallel data fetches
      const [
        cashRes, 
        arOverdueRes, 
        apDueSoonRes,
        currentPeriodRes,
        prevPeriodRes,
        threeMonthRes,
        verificationsRes,
        paidInvoicesRes,
      ] = await Promise.all([
        // Cash balance (1910-1949)
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(status, company_id)")
          .eq("journal_entries.company_id", companyId)
          .eq("chart_of_accounts.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("chart_of_accounts.account_number", "1910")
          .lte("chart_of_accounts.account_number", "1949"),

        // Overdue customer invoices
        supabase.from("invoices")
          .select("id, counterparty_name, total_amount, due_date")
          .eq("company_id", companyId)
          .eq("invoice_type", "outgoing")
          .in("status", ["sent", "overdue"])
          .lt("due_date", today)
          .order("due_date")
          .limit(50),

        // AP due within 7 days
        supabase.from("invoices")
          .select("id, counterparty_name, total_amount, due_date")
          .eq("company_id", companyId)
          .eq("invoice_type", "incoming")
          .in("status", ["sent", "overdue", "attested"])
          .lte("due_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0])
          .order("due_date")
          .limit(50),

        // Current month revenue + costs
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(entry_date, status, company_id)")
          .eq("journal_entries.company_id", companyId)
          .eq("chart_of_accounts.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", monthStart)
          .lte("journal_entries.entry_date", today),

        // Previous month revenue + costs
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(entry_date, status, company_id)")
          .eq("journal_entries.company_id", companyId)
          .eq("chart_of_accounts.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", prevMonthStart)
          .lte("journal_entries.entry_date", prevMonthEnd),

        // 3-month data för margin trend
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(entry_date, status, company_id)")
          .eq("journal_entries.company_id", companyId)
          .eq("chart_of_accounts.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", threeMonthsAgo)
          .lt("journal_entries.entry_date", monthStart),

        // Verifications without receipt
        supabase.from("journal_entries")
          .select("id, description, entry_date, document_id")
          .eq("company_id", companyId)
          .eq("status", "approved")
          .is("document_id", null)
          .order("entry_date", { ascending: false })
          .limit(20),

        // DSO data
        supabase.from("invoices")
          .select("invoice_date, paid_at")
          .eq("company_id", companyId)
          .eq("status", "paid")
          .not("paid_at", "is", null)
          .limit(100),
      ]);

      const newInsights: PulseInsight[] = [];
      const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

      // ── Cash analysis ──
      let cash = 0;
      for (const l of cashRes.data || []) cash += (l.debit || 0) - (l.credit || 0);

      // ── Revenue/Cost analysis ──
      const calcRR = (lines: { debit: number; credit: number; chart_of_accounts: { account_number: string } }[]) => { let rev = 0, cost = 0;
        for (const l of lines || []) { const acc = l.chart_of_accounts?.account_number || "";
          if (acc >= "3000" && acc <= "3999") rev += (l.credit || 0) - (l.debit || 0);
          else if (acc >= "4000" && acc <= "7999") cost += (l.debit || 0) - (l.credit || 0);
        }
        return { rev, cost, result: rev - cost, margin: rev > 0 ? ((rev - cost) / rev) * 100 : 0 };
      };

      const cur = calcRR(currentPeriodRes.data || []);
      const prev = calcRR(prevPeriodRes.data || []);
      const threeMonth = calcRR(threeMonthRes.data || []);
      const avgMonthCost = threeMonth.cost > 0 ? threeMonth.cost / 3 : prev.cost || 1;
      const runway = avgMonthCost > 0 ? cash / avgMonthCost : 99;

      // ── Overdue AR ──
      const overdueInvoices = arOverdueRes.data || [];
      const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const overdue30d = overdueInvoices.filter(i => { const days = Math.ceil((Date.now() - new Date(i.due_date).getTime()) / 86400000);
        return days > 30;
      });

      // ── AP due soon ──
      const apDueSoon = apDueSoonRes.data || [];
      const apDueTotal = apDueSoon.reduce((s, i) => s + (i.total_amount || 0), 0);

      // ── DSO ──
      let dso = 0;
      const paidInv = paidInvoicesRes.data || [];
      if (paidInv.length > 0) { const vals = paidInv.map((inv: any) => Math.max(0, Math.ceil((new Date(inv.paid_at).getTime() - new Date(inv.invoice_date).getTime()) / 86400000)));
        dso = Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
      }

      // ── Verifications without receipt ──
      const missingReceipts = (verificationsRes.data || []);

      // ── Deadlines ──
      const dayOfMonth = now.getDate();
      const agiDeadline = 12;
      const daysToAGI = agiDeadline - dayOfMonth;

      // ═══ BUILD INSIGHTS ═══

      // RED: Overdue invoices > 30d
      if (overdue30d.length > 0) { const worst = overdue30d[0];
        const worstDays = Math.ceil((Date.now() - new Date(worst.due_date).getTime()) / 86400000);
        newInsights.push({ id: "ar_overdue_30d",
          severity: "red",
          title: `${overdue30d.length} kundfakturor förfallna >30d`,
          detail: `${fmt(overdueTotal)} kr utestående. Följ upp ${worst.counterparty_name} (${fmt(worst.total_amount)} kr, ${worstDays}d).`,
          navigateTo: "/invoices",
          category: "receivables",
        });
      }

      // RED: Runway < 3 months
      if (runway < 3 && avgMonthCost > 0) { const displayRunway = cash < 0 ? 0 : Math.max(0, runway);
        newInsights.push({ id: "low_runway",
          severity: "red",
          title: cash < 0 ? `Negativt kassasaldo` : `Runway ${displayRunway.toFixed(1)} månader`,
          detail: `Kassasaldo ${fmt(cash)} kr vid genomsnittlig månadskostnad ${fmt(avgMonthCost)} kr.`,
          navigateTo: "/cashflow",
          category: "liquidity",
        });
      }

      // RED: AGI deadline within 3 days
      if (daysToAGI >= 0 && daysToAGI <= 3) { newInsights.push({ id: "agi_deadline",
          severity: "red",
          title: `AGI förfaller om ${daysToAGI} dag${daysToAGI !== 1 ? "ar" : ""}`,
          detail: `Arbetsgivardeklaration ska lämnas senast den 12:e.`,
          navigateTo: "/agi-submission",
          category: "deadlines",
        });
      }

      // YELLOW: Cost increase > 20%
      if (prev.cost > 0 && cur.cost > prev.cost * 1.2) { const pctIncrease = ((cur.cost - prev.cost) / prev.cost * 100).toFixed(0);
        newInsights.push({ id: "cost_increase",
          severity: "yellow",
          title: `Kostnader +${pctIncrease}% vs föreg. månad`,
          detail: `${fmt(cur.cost)} kr denna månad vs ${fmt(prev.cost)} kr förra.`,
          navigateTo: "/reports",
          category: "costs",
        });
      }

      // YELLOW: AP due within 7 days
      if (apDueSoon.length > 0) { const apOverdue = apDueSoon.filter(i => i.due_date < today);
        const apUpcoming = apDueSoon.filter(i => i.due_date >= today);
        if (apOverdue.length > 0) { newInsights.push({ id: "ap_overdue",
            severity: "red",
            title: `${apOverdue.length} förfallna leverantörsfakturor`,
            detail: `${fmt(apOverdue.reduce((s, i) => s + (i.total_amount || 0), 0))} kr att betala omgående.`,
            navigateTo: "/invoices?tab=incoming",
            category: "receivables",
          });
        }
        if (apUpcoming.length > 0) { newInsights.push({ id: "ap_due_soon",
            severity: "yellow",
            title: `${apUpcoming.length} leverantörsfakturor förfaller inom 7d`,
            detail: `${fmt(apUpcoming.reduce((s, i) => s + (i.total_amount || 0), 0))} kr.`,
            navigateTo: "/invoices?tab=incoming",
            category: "receivables",
          });
        }
      }

      // YELLOW: DSO > 45 days
      if (dso > 45) { newInsights.push({ id: "high_dso",
          severity: "yellow",
          title: `DSO ${dso} dagar`,
          detail: `Genomsnittlig betalningstid överstiger 45 dagar.`,
          navigateTo: "/invoices",
          category: "receivables",
        });
      }

      // YELLOW: Margin deviation
      const threeMonthMargin = threeMonth.rev > 0 ? ((threeMonth.rev - threeMonth.cost) / threeMonth.rev) * 100 : 0;
      if (threeMonthMargin > 0 && Math.abs(cur.margin - threeMonthMargin) > 15) { newInsights.push({ id: "margin_deviation",
          severity: "yellow",
          title: `Bruttomarginal ${cur.margin.toFixed(0)}%`,
          detail: `Avviker från 3-månaderssnitt ${threeMonthMargin.toFixed(0)}%.`,
          navigateTo: "/reports",
          category: "costs",
        });
      }

      // YELLOW: Missing receipts on entries > 5000 kr
      // We'd need line amounts but simplify: count missing receipts
      if (missingReceipts.length > 3) { newInsights.push({ id: "missing_receipts",
          severity: "yellow",
          title: `${missingReceipts.length} verifikationer saknar bilaga`,
          detail: `Granska och bifoga underlag.`,
          navigateTo: "/verifications",
          category: "verifications",
        });
      }

      // GREEN: if no red or yellow
      if (newInsights.filter(i => i.severity !== "green").length === 0) { if (overdueInvoices.length === 0) { newInsights.push({ id: "all_paid",
            severity: "green",
            title: "Alla kundfakturor betalda i tid",
            detail: "Inga förfallna fordringar.",
            navigateTo: "/invoices",
            category: "receivables",
          });
        }
        if (cash > 0 && cur.result >= 0) { newInsights.push({ id: "healthy",
            severity: "green",
            title: "Bra ekonomisk hälsa",
            detail: `Positivt resultat och kassasaldo ${fmt(cash)} kr.`,
            navigateTo: "/reports",
            category: "liquidity",
          });
        }
      }

      // Sort by severity: red first, then yellow, then green
      const order: Record<InsightSeverity, number> = { red: 0, yellow: 1, green: 2 };
      newInsights.sort((a, b) => order[a.severity] - order[b.severity]);

      // Build indicators
      const liqStatus: InsightSeverity = runway < 3 ? "red" : cash < 0 ? "red" : runway < 6 ? "yellow" : "green";
      const arStatus: InsightSeverity = overdue30d.length > 0 ? "red" : overdueInvoices.length > 0 ? "yellow" : "green";
      const deadlineStatus: InsightSeverity = daysToAGI >= 0 && daysToAGI <= 3 ? "red" : daysToAGI >= 0 && daysToAGI <= 7 ? "yellow" : "green";

      setInsights(newInsights.slice(0, 6));
      setIndicators([
        { label: "Likviditet", status: liqStatus },
        { label: "Fordringar", status: arStatus },
        { label: "Deadlines", status: deadlineStatus },
      ]);
      setUpdatedAt(new Date());
    } catch (e) { console.error("[BusinessPulse] Error:", e);
    } finally { setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { analyze();
  }, [analyze]);

  return { insights, indicators, updatedAt, loading };
}
