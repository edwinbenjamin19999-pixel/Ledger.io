import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─────────────────────────────────────────────── */

export interface ForecastItem { id: string;
  type: "inflow" | "outflow";
  category: "customer" | "supplier" | "salary" | "vat" | "ftax" | "employer_fee" | "recurring" | "manual";
  description: string;
  amount: number; // always positive
  expectedDate: string; // YYYY-MM-DD
  week: number; // ISO week
  weekIdx: number; // 0-12
  source: string; // e.g. invoice id
  confidence: number; // 0-1
  overdueDays?: number;
}

export interface ForecastWeek { weekIdx: number;
  weekNum: number;
  label: string; // "v15"
  dateRange: string; // "7 apr – 13 apr"
  startDate: string;
  endDate: string;
  inflows: number;
  outflows: number;
  net: number;
  opening: number;
  closing: number;
  items: ForecastItem[];
  status: "ok" | "low" | "deficit" | "recovery";
}

export interface ForecastKPI { cashBalance: number;
  totalInflows13w: number;
  totalOutflows13w: number;
  lowestPoint: number;
  lowestWeek: number;
  lowestWeekLabel: string;
  inflowInvoiceCount: number;
}

export interface CategoryBreakdown { category: string;
  label: string;
  amount: number;
  pct: number;
  color: string;
}

export interface ForecastAlert { id: string;
  severity: "critical" | "warning" | "info" | "opportunity";
  title: string;
  description: string;
  action?: string;
  actionLink?: string;
}

export interface ManualScenarioItem { id: string;
  type: "inflow" | "outflow";
  description: string;
  amount: number;
  date: string;
  recurring: "none" | "weekly" | "monthly";
}

/* ─── Helpers ───────────────────────────────────────────── */

function getISOWeek(d: Date): number { const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getWeekStart(d: Date): Date { const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDateRange(start: Date, end: Date): string { const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`;
}

function dateStr(d: Date): string { return d.toISOString().split("T")[0];
}

function weekIdxForDate(weekStarts: Date[], date: string): number { const d = new Date(date);
  for (let i = weekStarts.length - 1; i >= 0; i--) { if (d >= weekStarts[i]) return i;
  }
  return 0;
}

/* ─── Hook ──────────────────────────────────────────────── */

export function useForecast13w(companyId: string | undefined) { const [weeks, setWeeks] = useState<ForecastWeek[]>([]);
  const [kpi, setKpi] = useState<ForecastKPI | null>(null);
  const [alerts, setAlerts] = useState<ForecastAlert[]>([]);
  const [inflowBreakdown, setInflowBreakdown] = useState<CategoryBreakdown[]>([]);
  const [outflowBreakdown, setOutflowBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(500000);
  const [manualItems, setManualItems] = useState<ManualScenarioItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const buildForecast = useCallback(async () => { if (!companyId) return;
    setLoading(true);

    try { const now = new Date();
      const todayStr = dateStr(now);
      const weekStart0 = getWeekStart(now);

      // Build 13 week slots
      const weekStarts: Date[] = [];
      const weekSlots: ForecastWeek[] = [];
      for (let i = 0; i < 13; i++) { const ws = new Date(weekStart0);
        ws.setDate(ws.getDate() + i * 7);
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        weekStarts.push(ws);
        weekSlots.push({ weekIdx: i,
          weekNum: getISOWeek(ws),
          label: `v${getISOWeek(ws)}`,
          dateRange: fmtDateRange(ws, we),
          startDate: dateStr(ws),
          endDate: dateStr(we),
          inflows: 0,
          outflows: 0,
          net: 0,
          opening: 0,
          closing: 0,
          items: [],
          status: "ok",
        });
      }

      const endDate = weekSlots[12].endDate;

      // Parallel data fetches
      const [bankRes, arRes, apRes, payrollRes, journalLinesRes] = await Promise.all([
        supabase.from("bank_accounts").select("balance").eq("company_id", companyId).eq("is_active", true),
        (supabase.from("invoices").select("id, total_amount, due_date, counterparty_name, status, paid_at")
          .eq("company_id", companyId).eq("invoice_type", "outgoing").in("status", ["sent", "overdue"])),
        (supabase.from("invoices").select("id, total_amount, due_date, counterparty_name, status, paid_at")
          .eq("company_id", companyId).eq("invoice_type", "incoming").in("status", ["sent", "attested", "overdue"])),
        (supabase.from("payroll_runs").select("id, total_net, total_employer_cost, total_tax, payment_date, period_start, period_end, status")
          .eq("company_id", companyId).in("status", ["approved", "draft"])),
        supabase.from("journal_entry_lines")
          .select("debit, credit, account_id, chart_of_accounts(account_number, account_name), journal_entries!inner(entry_date, company_id, status)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", new Date(now.getTime() - 180 * 86400000).toISOString().split("T")[0])
      ]);

      const bankBalance = (bankRes.data || []).reduce((s: number, a: any) => s + (a.balance || 0), 0);
      const allItems: ForecastItem[] = [];
      let inflowInvoiceCount = 0;

      // ─ SOURCE 1: Customer invoices (inflows)
      for (const inv of (arRes.data || [])) { if (!inv.total_amount) continue;
        let expectedDate = inv.due_date || todayStr;
        let overdueDays = 0;
        if (expectedDate < todayStr) { overdueDays = Math.floor((now.getTime() - new Date(expectedDate).getTime()) / 86400000);
          // Move overdue to today + 14 days (conservative estimate)
          const moved = new Date(now.getTime() + 14 * 86400000);
          expectedDate = dateStr(moved);
        }
        if (expectedDate > endDate) continue;
        const idx = weekIdxForDate(weekStarts, expectedDate);
        inflowInvoiceCount++;
        allItems.push({ id: `ar-${inv.id}`,
          type: "inflow",
          category: "customer",
          description: `Kundfaktura — ${inv.counterparty_name || "Okänd"}`,
          amount: Math.abs(inv.total_amount),
          expectedDate,
          week: weekSlots[idx].weekNum,
          weekIdx: idx,
          source: inv.id,
          confidence: overdueDays > 0 ? 0.6 : 0.9,
          overdueDays: overdueDays > 0 ? overdueDays : undefined,
        });
      }

      // ─ SOURCE 2: Supplier invoices (outflows)
      for (const inv of (apRes.data || [])) { if (!inv.total_amount) continue;
        let expectedDate = inv.due_date || todayStr;
        if (expectedDate < todayStr) expectedDate = todayStr;
        if (expectedDate > endDate) continue;
        const idx = weekIdxForDate(weekStarts, expectedDate);
        allItems.push({ id: `ap-${inv.id}`,
          type: "outflow",
          category: "supplier",
          description: `Leverantörsbetalning — ${inv.counterparty_name || "Okänd"}`,
          amount: Math.abs(inv.total_amount),
          expectedDate,
          week: weekSlots[idx].weekNum,
          weekIdx: idx,
          source: inv.id,
          confidence: 0.95,
        });
      }

      // ─ SOURCE 3: Payroll (outflows)
      for (const pr of (payrollRes.data || [])) { if (!pr.payment_date) continue;
        if (pr.payment_date < todayStr || pr.payment_date > endDate) continue;
        const idx = weekIdxForDate(weekStarts, pr.payment_date);
        const netAmount = pr.total_net || 0;
        if (netAmount > 0) { allItems.push({ id: `pay-${pr.id}`,
            type: "outflow",
            category: "salary",
            description: "Löneutbetalning",
            amount: netAmount,
            expectedDate: pr.payment_date,
            week: weekSlots[idx].weekNum,
            weekIdx: idx,
            source: pr.id,
            confidence: 0.95,
          });
        }
        // Employer fees + tax — due 12th of following month
        const periodEnd = new Date(pr.period_end || pr.payment_date);
        const feeDate = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 12);
        const feeDateStr = dateStr(feeDate);
        if (feeDateStr >= todayStr && feeDateStr <= endDate) { const feeIdx = weekIdxForDate(weekStarts, feeDateStr);
          const employerFee = (pr.total_employer_cost || 0) - (pr.total_net || 0) - (pr.total_tax || 0);
          if (employerFee > 0) { allItems.push({ id: `agf-${pr.id}`,
              type: "outflow",
              category: "employer_fee",
              description: `Arbetsgivaravgift`,
              amount: employerFee,
              expectedDate: feeDateStr,
              week: weekSlots[feeIdx].weekNum,
              weekIdx: feeIdx,
              source: pr.id,
              confidence: 0.9,
            });
          }
          const tax = pr.total_tax || 0;
          if (tax > 0) { allItems.push({ id: `tax-${pr.id}`,
              type: "outflow",
              category: "ftax",
              description: `Skatteavdrag personal`,
              amount: tax,
              expectedDate: feeDateStr,
              week: weekSlots[feeIdx].weekNum,
              weekIdx: feeIdx,
              source: pr.id,
              confidence: 0.9,
            });
          }
        }
      }

      // ─ SOURCE 4+5: Detect recurring F-skatt and VAT from journal entries
      const lines = (journalLinesRes.data || []);
      // Detect F-skatt (konto 2518 debit or 1630 credit pattern)
      const ftaxPayments: { date: string; amount: number }[] = [];
      const vatPayments: { date: string; amount: number }[] = [];
      for (const line of lines) { const accNo = line.chart_of_accounts?.account_number || "";
        const entry = line.journal_entries;
        if (!entry) continue;
        const entryDate = entry.entry_date;
        // F-skatt detection: debit on 2518 (betald F-skatt)
        if (accNo === "2518" && (line.debit || 0) > 0) { ftaxPayments.push({ date: entryDate, amount: line.debit });
        }
        // VAT payment detection: debit on 2650 (momsredovisning)
        if (accNo === "2650" && (line.debit || 0) > 0) { vatPayments.push({ date: entryDate, amount: line.debit });
        }
      }

      // Project F-skatt forward (monthly on 12th)
      if (ftaxPayments.length >= 2) { const avgFtax = ftaxPayments.reduce((s, p) => s + p.amount, 0) / ftaxPayments.length;
        for (let m = 0; m < 4; m++) { const fDate = new Date(now.getFullYear(), now.getMonth() + m, 12);
          const fStr = dateStr(fDate);
          if (fStr >= todayStr && fStr <= endDate) { const idx = weekIdxForDate(weekStarts, fStr);
            allItems.push({ id: `ftax-proj-${m}`,
              type: "outflow",
              category: "ftax",
              description: `F-skatt ${fDate.toLocaleString("sv-SE", { month: "short" })}`,
              amount: Math.round(avgFtax),
              expectedDate: fStr,
              week: weekSlots[idx].weekNum,
              weekIdx: idx,
              source: "pattern",
              confidence: 0.7,
            });
          }
        }
      }

      // Project VAT forward
      if (vatPayments.length >= 1) { const avgVat = vatPayments.reduce((s, p) => s + p.amount, 0) / vatPayments.length;
        for (let m = 0; m < 4; m++) { const vDate = new Date(now.getFullYear(), now.getMonth() + m, 12);
          const vStr = dateStr(vDate);
          if (vStr >= todayStr && vStr <= endDate) { // Check if already covered by an explicit payment
            const existing = allItems.find(i => i.category === "vat" && i.expectedDate === vStr);
            if (!existing) { const idx = weekIdxForDate(weekStarts, vStr);
              allItems.push({ id: `vat-proj-${m}`,
                type: "outflow",
                category: "vat",
                description: `Momsbetalning ${vDate.toLocaleString("sv-SE", { month: "short" })}`,
                amount: Math.round(avgVat),
                expectedDate: vStr,
                week: weekSlots[idx].weekNum,
                weekIdx: idx,
                source: "pattern",
                confidence: 0.6,
              });
            }
          }
        }
      }

      // ─ SOURCE 7: Recurring pattern detection on 1930-1940
      const cashOutflows: { amount: number; date: string; desc: string }[] = [];
      for (const line of lines) { const accNo = line.chart_of_accounts?.account_number || "";
        if (accNo >= "1930" && accNo <= "1949" && (line.credit || 0) > 100) { cashOutflows.push({ amount: line.credit,
            date: line.journal_entries?.entry_date || "",
            desc: line.chart_of_accounts?.account_name || accNo,
          });
        }
      }

      // Group by similar amounts (±5%) and detect ≥3 occurrences
      const patterns: Map<string, { amounts: number[]; dates: string[]; desc: string }> = new Map();
      for (const co of cashOutflows) { const bucket = String(Math.round(co.amount / 100) * 100);
        if (!patterns.has(bucket)) patterns.set(bucket, { amounts: [], dates: [], desc: co.desc });
        const p = patterns.get(bucket)!;
        p.amounts.push(co.amount);
        p.dates.push(co.date);
      }

      for (const [, p] of patterns) { if (p.amounts.length < 3) continue;
        const avg = p.amounts.reduce((s, a) => s + a, 0) / p.amounts.length;
        // Detect if monthly: check if dates span different months
        const months = new Set(p.dates.map(d => d.substring(0, 7)));
        if (months.size < 3) continue;
        // Project monthly
        const avgDay = Math.round(p.dates.reduce((s, d) => s + new Date(d).getDate(), 0) / p.dates.length);
        for (let m = 0; m < 4; m++) { const rDate = new Date(now.getFullYear(), now.getMonth() + m, avgDay);
          const rStr = dateStr(rDate);
          if (rStr >= todayStr && rStr <= endDate) { const idx = weekIdxForDate(weekStarts, rStr);
            allItems.push({ id: `rec-${p.desc}-${m}`,
              type: "outflow",
              category: "recurring",
              description: `${p.desc} (mönster)`,
              amount: Math.round(avg),
              expectedDate: rStr,
              week: weekSlots[idx].weekNum,
              weekIdx: idx,
              source: "pattern",
              confidence: 0.5,
            });
          }
        }
      }

      // ─ SOURCE 8: Manual scenario items
      for (const mi of manualItems) { const addItem = (d: string) => { if (d < todayStr || d > endDate) return;
          const idx = weekIdxForDate(weekStarts, d);
          allItems.push({ id: `man-${mi.id}-${d}`,
            type: mi.type,
            category: "manual",
            description: mi.description || "Manuell post",
            amount: Math.abs(mi.amount),
            expectedDate: d,
            week: weekSlots[idx].weekNum,
            weekIdx: idx,
            source: "manual",
            confidence: 1,
          });
        };

        if (mi.recurring === "none") { addItem(mi.date);
        } else { const step = mi.recurring === "weekly" ? 7 : 30;
          let cur = new Date(mi.date);
          for (let i = 0; i < 13; i++) { addItem(dateStr(cur));
            cur = new Date(cur.getTime() + step * 86400000);
          }
        }
      }

      // ─ Deduplicate: remove projected items if real payroll/tax data already covers the period
      // Simple: remove ftax-proj if we have tax- items in the same week
      const finalItems = allItems.filter(item => { if (item.id.startsWith("ftax-proj-")) { const realInSameWeek = allItems.some(other => other.category === "ftax" && !other.id.startsWith("ftax-proj-") && other.weekIdx === item.weekIdx);
          return !realInSameWeek;
        }
        return true;
      });

      // ─ Populate week slots
      for (const item of finalItems) { if (item.weekIdx < 0 || item.weekIdx >= 13) continue;
        weekSlots[item.weekIdx].items.push(item);
        if (item.type === "inflow") { weekSlots[item.weekIdx].inflows += item.amount;
        } else { weekSlots[item.weekIdx].outflows += item.amount;
        }
      }

      // ─ Calculate running balances
      let bal = bankBalance;
      let lowestPoint = bankBalance;
      let lowestWeekIdx = 0;

      for (const w of weekSlots) { w.opening = bal;
        w.net = w.inflows - w.outflows;
        bal += w.net;
        w.closing = bal;
        if (bal < lowestPoint) { lowestPoint = bal;
          lowestWeekIdx = w.weekIdx;
        }

        // Status
        if (w.closing < 0) { w.status = "deficit";
        } else if (w.closing < threshold) { w.status = "low";
        } else { w.status = "ok";
        }
      }

      // Recovery detection
      for (let i = 1; i < weekSlots.length; i++) { if (weekSlots[i].closing > weekSlots[i - 1].closing && weekSlots[i - 1].status === "deficit") { weekSlots[i].status = "recovery";
        }
      }

      // ─ Category breakdowns
      const totalIn = weekSlots.reduce((s, w) => s + w.inflows, 0);
      const totalOut = weekSlots.reduce((s, w) => s + w.outflows, 0);

      const inCats = new Map<string, number>();
      const outCats = new Map<string, number>();
      for (const item of finalItems) { const map = item.type === "inflow" ? inCats : outCats;
        map.set(item.category, (map.get(item.category) || 0) + item.amount);
      }

      const catLabels: Record<string, string> = { customer: "Kundfakturor",
        supplier: "Leverantörer",
        salary: "Löner",
        vat: "Momsbetalning",
        ftax: "F-skatt",
        employer_fee: "Arbetsgivaravgift",
        recurring: "Återkommande",
        manual: "Manuella poster",
      };

      const catColors: Record<string, string> = { customer: "#22C55E",
        supplier: "#EF4444",
        salary: "#F59E0B",
        vat: "#8B5CF6",
        ftax: "#6366F1",
        employer_fee: "#EC4899",
        recurring: "#3b82f6",
        manual: "#3b82f6",
      };

      const inBreakdown: CategoryBreakdown[] = Array.from(inCats.entries())
        .map(([cat, amt]) => ({ category: cat, label: catLabels[cat] || cat, amount: amt, pct: totalIn > 0 ? Math.round((amt / totalIn) * 100) : 0, color: catColors[cat] || "#94A3B8" }))
        .sort((a, b) => b.amount - a.amount);

      const outBreakdown: CategoryBreakdown[] = Array.from(outCats.entries())
        .map(([cat, amt]) => ({ category: cat, label: catLabels[cat] || cat, amount: amt, pct: totalOut > 0 ? Math.round((amt / totalOut) * 100) : 0, color: catColors[cat] || "#94A3B8" }))
        .sort((a, b) => b.amount - a.amount);

      // ─ Alerts
      const newAlerts: ForecastAlert[] = [];
      const deficitWeeks = weekSlots.filter(w => w.status === "deficit");
      if (deficitWeeks.length > 0) { const first = deficitWeeks[0];
        newAlerts.push({ id: "deficit",
          severity: "critical",
          title: `Underskott förväntas ${first.label}`,
          description: `Kassasaldo beräknas bli ${Math.round(first.closing).toLocaleString("sv-SE")} kr i ${first.label} (${first.dateRange}).`,
          action: "Visa åtgärder",
        });
      }

      const lowWeeks = weekSlots.filter(w => w.status === "low");
      if (lowWeeks.length > 0 && deficitWeeks.length === 0) { newAlerts.push({ id: "low",
          severity: "warning",
          title: `Lågt kassasaldo i ${lowWeeks.length} veckor`,
          description: `Kassasaldo understiger miniminivån ${threshold.toLocaleString("sv-SE")} kr.`,
        });
      }

      // Overdue AR
      const overdueAR = finalItems.filter(i => i.category === "customer" && (i.overdueDays || 0) > 0);
      if (overdueAR.length > 0) { const totalOverdue = overdueAR.reduce((s, i) => s + i.amount, 0);
        newAlerts.push({ id: "overdue",
          severity: "warning",
          title: `${overdueAR.length} förfallna kundfakturor`,
          description: `Totalt ${Math.round(totalOverdue).toLocaleString("sv-SE")} kr förfallna. Att driva in dessa förbättrar prognosen.`,
          action: "Visa fakturor",
          actionLink: "/invoices?tab=outgoing&status=overdue",
        });
      }

      // Concentration risk
      const topOutCat = outBreakdown[0];
      if (topOutCat && topOutCat.pct > 60) { newAlerts.push({ id: "concentration",
          severity: "info",
          title: `Koncentrationsrisk: ${topOutCat.label}`,
          description: `${topOutCat.pct}% av alla utbetalningar utgörs av ${topOutCat.label.toLowerCase()}.`,
        });
      }

      setWeeks(weekSlots);
      setKpi({ cashBalance: bankBalance,
        totalInflows13w: totalIn,
        totalOutflows13w: totalOut,
        lowestPoint,
        lowestWeek: weekSlots[lowestWeekIdx]?.weekNum || 0,
        lowestWeekLabel: weekSlots[lowestWeekIdx]?.label || "",
        inflowInvoiceCount,
      });
      setAlerts(newAlerts);
      setInflowBreakdown(inBreakdown);
      setOutflowBreakdown(outBreakdown);
      setLastUpdated(new Date());
    } catch (err) { console.error("Forecast build error:", err);
    } finally { setLoading(false);
    }
  }, [companyId, threshold, manualItems]);

  useEffect(() => { buildForecast(); }, [buildForecast]);

  return { weeks,
    kpi,
    alerts,
    inflowBreakdown,
    outflowBreakdown,
    loading,
    threshold,
    setThreshold,
    manualItems,
    setManualItems,
    lastUpdated,
    refresh: buildForecast,
  };
}