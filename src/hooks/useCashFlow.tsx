import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildActionableInsights } from "@/lib/cashflow/buildActionableInsights";
import { getLiquidCash } from "@/lib/cash/getLiquidCash";
import { computeUnifiedRunway } from "@/lib/cash/getRunway";
import type { ActionableInsight, ARInvoiceLite, APInvoiceLite } from "@/lib/cashflow/types";

export type { ActionableInsight, ARInvoiceLite, APInvoiceLite } from "@/lib/cashflow/types";

export interface CashFlowKPI { cashBalance: number;
  netCashFlowMTD: number;
  netCashFlowPrevMTD: number;
  runwayDays: number;
  runwayDate: string;
  expectedInflows30d: number;
  expectedInflowsCount: number;
  expectedOutflows30d: number;
  vatDueDate: string | null;
  vatDueAmount: number;
  avgDailyOutflow: number;
}

export interface CashFlowPeriod { label: string;
  period: string;
  inflows: number;
  outflows: number;
  net: number;
  openingBalance: number;
  closingBalance: number;
  operatingIn: number;
  operatingOut: number;
  investingIn: number;
  investingOut: number;
  financingIn: number;
  financingOut: number;
  largestItem: string;
  details?: CashFlowDetail[];
}

export interface CashFlowDetail { date: string;
  account: string;
  counterpart: string;
  verificationId: string;
  amount: number;
  category: "operating" | "investing" | "financing";
}

export interface CashFlowAlert { id: string;
  type: "risk" | "due" | "overdue" | "concentration" | "info";
  title: string;
  description: string;
  action?: string;
  navigateTo?: string;
}

export interface ScenarioEvent { id: string;
  type: string;
  amount: number;
  date: string;
  description: string;
}

type ViewMode = "month" | "week" | "day";
type PeriodPreset = "ytd" | "this_month" | "q1" | "q2" | "q3" | "q4" | "last_12" | "custom";

export function useCashFlow(companyId: string | undefined) { const [kpi, setKpi] = useState<CashFlowKPI | null>(null);
  const [periods, setPeriods] = useState<CashFlowPeriod[]>([]);
  const [alerts, setAlerts] = useState<CashFlowAlert[]>([]);
  const [arInvoices, setArInvoices] = useState<ARInvoiceLite[]>([]);
  const [apInvoices, setApInvoices] = useState<APInvoiceLite[]>([]);
  const [actionableInsights, setActionableInsights] = useState<ActionableInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showForecast, setShowForecast] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("ytd");
  const [scenarios, setScenarios] = useState<ScenarioEvent[]>([]);
  const [appliedScenarios, setAppliedScenarios] = useState<ScenarioEvent[]>([]);

  const loadData = useCallback(async () => { if (!companyId) return;
    setLoading(true);

    try { const now = new Date();
      const today = now.toISOString().split("T")[0];
      const year = now.getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const monthStart = new Date(year, now.getMonth(), 1).toISOString().split("T")[0];
      const prevMonthStart = new Date(year, now.getMonth() - 1, 1).toISOString().split("T")[0];
      const prevMonthEnd = new Date(year, now.getMonth(), 0).toISOString().split("T")[0];
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0];
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];

      // Parallel fetches
      const entriesRes = await (supabase.from("journal_entries").select("id, entry_date")
          .eq("company_id", companyId).eq("status", "approved")
          .gte("entry_date", startDate).lte("entry_date", endDate));
      const bankRes = await (supabase.from("bank_accounts").select("balance")
          .eq("company_id", companyId).eq("is_active", true));
      const arQuery = supabase
        .from("invoices")
        .select("id, total_amount, due_date, status, counterparty_name, reminder_count, invoice_number")
        .eq("company_id", companyId)
        .eq("invoice_direction", "outgoing") as any;
      const arRes = await arQuery.in("status", ["sent", "overdue"]);
      const apQuery = supabase
        .from("invoices")
        .select("id, total_amount, due_date, status, counterparty_name, invoice_number")
        .eq("company_id", companyId)
        .eq("invoice_direction", "incoming") as any;
      const apRes = await apQuery.in("status", ["attested", "overdue", "approved"]);

      const entries = entriesRes.data || [];
      let bankBalance = (bankRes.data || []).reduce((s: number, a: any) => s + (a.balance || 0), 0);
      // Canonical fallback: ledger 1910-1930 when bank_accounts is empty/zero.
      if (!bankBalance) {
        bankBalance = await getLiquidCash(companyId);
      }

      // Fetch journal lines
      const entryIds = entries.map(e => e.id);
      let allLines: any[] = [];
      for (let i = 0; i < entryIds.length; i += 100) { const batch = entryIds.slice(i, i + 100);
        const { data: lines } = await supabase
          .from("journal_entry_lines")
          .select("journal_entry_id, debit, credit, account_id, chart_of_accounts(account_number, account_name)")
          .in("journal_entry_id", batch);
        allLines.push(...(lines || []));
      }

      const entryDateMap = new Map(entries.map(e => [e.id, e.entry_date]));

      // Categorize cash movements
      const cashMovements: Array<{ date: string; amount: number; category: "operating" | "investing" | "financing";
        counterAccount: string; counterName: string; entryId: string;
      }> = [];

      const entryMap = new Map<string, { entry_date: string; lines: any[] }>();
      for (const line of allLines) { const eid = line.journal_entry_id;
        const ed = entryDateMap.get(eid);
        if (!eid || !ed) continue;
        if (!entryMap.has(eid)) entryMap.set(eid, { entry_date: ed as string, lines: [] });
        entryMap.get(eid)!.lines.push(line);
      }

      for (const [entryId, entry] of entryMap) { const cashLines = entry.lines.filter((l: any) => { const n = l.chart_of_accounts?.account_number;
          return n && (n.startsWith("19"));
        });
        if (!cashLines.length) continue;

        const counterparts = entry.lines.filter((l: any) => { const n = l.chart_of_accounts?.account_number;
          return n && !n.startsWith("19");
        });

        let category: "operating" | "investing" | "financing" = "operating";
        let counterAccount = "";
        let counterName = "";
        let largestCounter = 0;
        for (const cp of counterparts) { const n = cp.chart_of_accounts?.account_number || "";
          const amt = Math.max(cp.debit || 0, cp.credit || 0);
          if (amt > largestCounter) { largestCounter = amt;
            counterAccount = n;
            counterName = cp.chart_of_accounts?.account_name || "";
          }
          if (n.match(/^1[0-3]/)) category = "investing";
          if (n.startsWith("23") || n.match(/^20[89]/) || n.startsWith("2082")) category = "financing";
        }

        for (const cl of cashLines) { const netFlow = (cl.debit || 0) - (cl.credit || 0);
          cashMovements.push({ date: entry.entry_date,
            amount: netFlow,
            category,
            counterAccount,
            counterName,
            entryId,
          });
        }
      }

      // Build periods based on viewMode
      const periodMap = new Map<string, CashFlowPeriod>();
      let runningBalance = bankBalance;

      // For simplicity, always build monthly för now
      for (let m = 0; m < 12; m++) { const key = `${year}-${String(m + 1).padStart(2, "0")}`;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
        periodMap.set(key, { label: monthNames[m],
          period: key,
          inflows: 0, outflows: 0, net: 0,
          openingBalance: 0, closingBalance: 0,
          operatingIn: 0, operatingOut: 0,
          investingIn: 0, investingOut: 0,
          financingIn: 0, financingOut: 0,
          largestItem: "",
          details: [],
        });
      }

      // Populate
      const largestByPeriod = new Map<string, { name: string; amount: number }>();
      for (const mv of cashMovements) { const key = mv.date.substring(0, 7);
        const p = periodMap.get(key);
        if (!p) continue;

        if (mv.amount > 0) { p.inflows += mv.amount;
          if (mv.category === "operating") p.operatingIn += mv.amount;
          else if (mv.category === "investing") p.investingIn += mv.amount;
          else p.financingIn += mv.amount;
        } else { p.outflows += Math.abs(mv.amount);
          if (mv.category === "operating") p.operatingOut += Math.abs(mv.amount);
          else if (mv.category === "investing") p.investingOut += Math.abs(mv.amount);
          else p.financingOut += Math.abs(mv.amount);
        }

        const absAmt = Math.abs(mv.amount);
        const existing = largestByPeriod.get(key);
        if (!existing || absAmt > existing.amount) { largestByPeriod.set(key, { name: mv.counterName || mv.counterAccount, amount: absAmt });
        }

        p.details?.push({ date: mv.date,
          account: mv.counterAccount,
          counterpart: mv.counterName,
          verificationId: mv.entryId,
          amount: mv.amount,
          category: mv.category,
        });
      }

      // Calculate running balances & nets
      // We need a starting balance - use current balance and work backwards
      const periodsArr = Array.from(periodMap.values());
      const totalNetYTD = periodsArr.reduce((s, p) => s + p.inflows - p.outflows, 0);
      // Approximate opening balance of year
      const yearOpeningBalance = bankBalance - totalNetYTD;
      let bal = yearOpeningBalance;

      for (const p of periodsArr) { p.openingBalance = bal;
        p.net = p.inflows - p.outflows;
        bal += p.net;
        p.closingBalance = bal;
        const largest = largestByPeriod.get(p.period);
        if (largest) p.largestItem = `${largest.name} ${Math.round(largest.amount).toLocaleString("sv-SE")}`;
      }

      // Calculate KPIs
      const currentMonthData = periodsArr.find(p => p.period === today.substring(0, 7));
      const prevMonth = `${now.getMonth() === 0 ? year - 1 : year}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`;
      const prevMonthData = periodsArr.find(p => p.period === prevMonth);

      // Kanonisk runway — samma källa som Likviditet-live, dashboard och AI CFO.
      const unified = await computeUnifiedRunway(companyId);
      const avgDailyOutflow = unified.avgDailyBurn;
      const runwayDays = unified.runwayDays === null ? 999 : unified.runwayDays;
      const runwayDate = new Date(now.getTime() + runwayDays * 86400000).toISOString().split("T")[0];

      // Expected inflows/outflows
      const arInvoices = arRes.data || [];
      const apInvoices = apRes.data || [];
      const expectedIn30 = arInvoices
        .filter((i: any) => i.due_date && i.due_date <= thirtyDaysFromNow)
        .reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const expectedInCount = arInvoices.filter((i: any) => i.due_date && i.due_date <= thirtyDaysFromNow).length;
      const expectedOut30 = apInvoices
        .filter((i: any) => i.due_date && i.due_date <= thirtyDaysFromNow)
        .reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

      setKpi({ cashBalance: bankBalance,
        netCashFlowMTD: currentMonthData?.net || 0,
        netCashFlowPrevMTD: prevMonthData?.net || 0,
        runwayDays: Math.min(runwayDays, 999),
        runwayDate,
        expectedInflows30d: expectedIn30,
        expectedInflowsCount: expectedInCount,
        expectedOutflows30d: expectedOut30,
        vatDueDate: null,
        vatDueAmount: 0,
        avgDailyOutflow,
      });

      setPeriods(periodsArr);

      // Build alerts
      const newAlerts: CashFlowAlert[] = [];
      if (runwayDays < 90) { newAlerts.push({ id: "runway-low",
          type: "risk",
          title: `Likviditeten negativ om ${runwayDays} dagar`,
          description: "Baserat på nuvarande utflödestakt",
          navigateTo: "#scenario",
        });
      }

      const overdueAR = arInvoices.filter((i: any) => i.status === "overdue");
      if (overdueAR.length > 0) { const overdueTotal = overdueAR.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
        newAlerts.push({ id: "overdue-ar",
          type: "overdue",
          title: `${overdueAR.length} kundfakturor förfallna: ${Math.round(overdueTotal).toLocaleString("sv-SE")} kr`,
          description: "Påminnelser kan skickas via fakturamodulen",
          navigateTo: "/invoices?tab=outgoing&status=overdue",
        });
      }

      const overdueAP = apInvoices.filter((i: any) => i.status === "overdue");
      if (overdueAP.length > 0) { const overdueTotal = overdueAP.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
        newAlerts.push({ id: "overdue-ap",
          type: "due",
          title: `${overdueAP.length} leverantörsfakturor förfallna: ${Math.round(overdueTotal).toLocaleString("sv-SE")} kr`,
          description: "Risk för dröjsmålsränta och betalningsanmärkning",
          navigateTo: "/invoices?tab=incoming&status=overdue",
        });
      }

      if (expectedOut30 > bankBalance * 0.8) { newAlerts.push({ id: "outflow-high",
          type: "risk",
          title: "Höga kommande utbetalningar",
          description: `${Math.round(expectedOut30).toLocaleString("sv-SE")} kr förfaller inom 30 dagar (${Math.round(expectedOut30 / bankBalance * 100)}% av kassan)`,
        });
      }

      setAlerts(newAlerts);
      setArInvoices(arInvoices as ARInvoiceLite[]);
      setApInvoices(apInvoices as APInvoiceLite[]);
      setActionableInsights(
        buildActionableInsights({
          arInvoices: arInvoices as ARInvoiceLite[],
          apInvoices: apInvoices as APInvoiceLite[],
          cashBalance: bankBalance,
          runwayDays: Math.min(runwayDays, 999),
          avgDailyOutflow,
        })
      );
    } catch (err) { console.error("CashFlow load error:", err);
    } finally { setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Apply scenario events to periods and KPI
  const calculateScenarioImpact = (
    basePeriods: CashFlowPeriod[],
    baseKpi: CashFlowKPI | null,
    events: ScenarioEvent[]
  ): { adjustedPeriods: CashFlowPeriod[]; adjustedKpi: CashFlowKPI | null; runwayAfter: number } => { if (!events.length || !basePeriods.length || !baseKpi) { return { adjustedPeriods: basePeriods, adjustedKpi: baseKpi, runwayAfter: baseKpi?.runwayDays ?? 0 };
    }

    // Deep copy periods
    const adjusted = basePeriods.map(p => ({ ...p }));

    // Bucket scenario events into periods
    for (const ev of events) { const key = ev.date.substring(0, 7); // "YYYY-MM"
      const p = adjusted.find(pp => pp.period === key);
      if (!p) continue;

      if (ev.amount > 0) { p.inflows += ev.amount;
      } else { p.outflows += Math.abs(ev.amount);
      }
      p.net = p.inflows - p.outflows;
    }

    // Recalculate running balances from the first period's original opening balance
    let bal = adjusted[0].openingBalance;
    for (const p of adjusted) { p.openingBalance = bal;
      p.net = p.inflows - p.outflows;
      bal += p.net;
      p.closingBalance = bal;
    }

    // Adjusted KPI
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentPeriod = adjusted.find(p => p.period === currentKey);
    const totalScenarioImpact = events.reduce((s, e) => s + e.amount, 0);
    const adjustedBalance = baseKpi.cashBalance + totalScenarioImpact;
    const runwayAfter = baseKpi.avgDailyOutflow > 0
      ? Math.max(0, Math.floor(adjustedBalance / baseKpi.avgDailyOutflow))
      : 999;

    const adjustedKpi: CashFlowKPI = { ...baseKpi,
      cashBalance: adjustedBalance,
      netCashFlowMTD: currentPeriod?.net ?? baseKpi.netCashFlowMTD,
      runwayDays: Math.min(runwayAfter, 999),
    };

    return { adjustedPeriods: adjusted, adjustedKpi, runwayAfter };
  };

  const { adjustedPeriods, adjustedKpi, runwayAfter } = calculateScenarioImpact(periods, kpi, appliedScenarios);
  const hasPendingScenarioChanges = JSON.stringify(scenarios) !== JSON.stringify(appliedScenarios);
  const simulationActive = appliedScenarios.length > 0;

  const applyScenarioSimulation = useCallback(() => { setAppliedScenarios(scenarios.map((event) => ({ ...event })));
  }, [scenarios]);

  const clearScenarioSimulation = useCallback(() => { setScenarios([]);
    setAppliedScenarios([]);
  }, []);

  return { kpi: simulationActive ? adjustedKpi : kpi,
    baseKpi: kpi,
    periods: simulationActive ? adjustedPeriods : periods,
    alerts, loading,
    arInvoices, apInvoices, actionableInsights,
    viewMode, setViewMode,
    showForecast, setShowForecast,
    periodPreset, setPeriodPreset,
    scenarios, setScenarios,
    runwayAfter,
    hasPendingScenarioChanges,
    simulationActive,
    applyScenarioSimulation,
    clearScenarioSimulation,
    refresh: loadData,
  };
}
