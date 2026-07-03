import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLiquidCash } from "@/lib/cash/getLiquidCash";

export type CapitalCategory = "salaries" | "social_fees" | "vat" | "tax" | "supplier_invoices" | "recurring" | "customer_invoices" | "recurring_income";

export interface CapitalItem {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number; // positive = outflow, negative = inflow (we'll keep sign by direction)
  direction: "outflow" | "inflow";
  category: CapitalCategory;
  label: string;
  source?: string;
  confidence?: number; // 0..1 for heuristic items
  link?: string;
}

export interface DailyPoint {
  date: string;
  outflow: number;
  inflow: number;
  balance: number; // running cash balance after the day
}

export interface MonthlyCapitalNeed {
  loading: boolean;
  error: string | null;
  monthLabel: string;
  monthStart: string;
  monthEnd: string;
  openingCash: number;
  items: CapitalItem[];
  dailyTimeline: DailyPoint[];
  byCategory: Record<CapitalCategory, number>;
  totalOutflow: number;
  totalInflow: number;
  netNeed: number; // outflow - inflow
  bufferAfter: number; // openingCash + inflow - outflow
  riskDate: string | null; // first day balance < 0
  status: "green" | "yellow" | "red" | "unknown";
  refresh: () => void;
}

const RECURRING_ACCOUNTS = ["5010", "5011", "5012", "5013", "5410", "5420", "6211", "6212", "6214", "6310", "6420", "6911", "6981"]; // hyra, försäkring, SaaS, abonnemang

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); }

export function useMonthlyCapitalNeed(companyId: string | undefined, referenceDate: Date = new Date()): MonthlyCapitalNeed {
  const [state, setState] = useState<Omit<MonthlyCapitalNeed, "refresh">>({
    loading: true, error: null, monthLabel: "", monthStart: "", monthEnd: "",
    openingCash: 0, items: [], dailyTimeline: [], byCategory: {} as any,
    totalOutflow: 0, totalInflow: 0, netNeed: 0, bufferAfter: 0, riskDate: null, status: "unknown",
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!companyId) { setState((s) => ({ ...s, loading: false })); return; }
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const monthStart = startOfMonth(referenceDate);
        const monthEnd = endOfMonth(referenceDate);
        const monthStartIso = ymd(monthStart);
        const monthEndIso = ymd(monthEnd);
        const monthLabel = monthStart.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });

        // Opening cash — kanonisk källa (BAS 1910–1930 ur huvudboken).
        // Samma siffra som Kassaflödesanalys, Cash Command, dashboardens runway-widget.
        // bank_accounts.balance används endast som fallback om kontoplanen är tom.
        let openingCash = await getLiquidCash(companyId);
        if (openingCash === 0) {
          const { data: banks } = await supabase
            .from("bank_accounts")
            .select("balance")
            .eq("company_id", companyId)
            .eq("is_active", true);
          openingCash = (banks || []).reduce((acc, b: any) => acc + Number(b.balance ?? 0), 0);
        }

        const items: CapitalItem[] = [];

        // 1) Supplier invoices due this month
        const { data: supplierInv } = await supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, total_amount, due_date, status")
          .eq("company_id", companyId)
          .eq("invoice_direction", "incoming")
          .gte("due_date", monthStartIso)
          .lte("due_date", monthEndIso)
          .in("status", ["approved", "pending_approval", "overdue", "draft"] as any);
        (supplierInv || []).forEach((inv: any) => {
          items.push({
            id: `sup-${inv.id}`, date: inv.due_date, amount: Number(inv.total_amount),
            direction: "outflow", category: "supplier_invoices",
            label: `${inv.counterparty_name} (${inv.invoice_number})`, source: "Leverantörsfaktura",
            confidence: 1, link: "/direct-payment",
          });
        });

        // 2) Customer invoices due this month
        const { data: custInv } = await supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, total_amount, due_date, status")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .gte("due_date", monthStartIso)
          .lte("due_date", monthEndIso)
          .in("status", ["sent", "overdue", "approved"] as any);
        (custInv || []).forEach((inv: any) => {
          items.push({
            id: `cus-${inv.id}`, date: inv.due_date, amount: Number(inv.total_amount),
            direction: "inflow", category: "customer_invoices",
            label: `${inv.counterparty_name} (${inv.invoice_number})`, source: "Kundfaktura",
            confidence: 0.8, link: "/finance",
          });
        });

        // 3) Payroll runs paying this month
        const { data: payrolls } = await supabase
          .from("payroll_runs")
          .select("id, payment_date, total_net, total_employer_cost, status")
          .eq("company_id", companyId)
          .gte("payment_date", monthStartIso)
          .lte("payment_date", monthEndIso)
          .in("status", ["approved", "scheduled", "paid", "draft"]);
        (payrolls || []).forEach((p: any) => {
          if (Number(p.total_net) > 0) {
            items.push({
              id: `pay-${p.id}`, date: p.payment_date, amount: Number(p.total_net),
              direction: "outflow", category: "salaries", label: "Nettolöner", source: "Lönekörning",
              confidence: 1, link: "/hr",
            });
          }
        });

        // 4) Social fees + tax (AGI) — due 12th of next month after payroll period
        const { data: agiPeriods } = await supabase
          .from("agi_periods")
          .select("id, period_year, period_month, payroll_run_id")
          .eq("company_id", companyId);
        // Match AGI whose due-date (12th of period_month + 1) falls in current month
        for (const a of agiPeriods || []) {
          const dueDate = new Date(a.period_year, (a.period_month - 1) + 1, 12);
          if (dueDate >= monthStart && dueDate <= monthEnd && a.payroll_run_id) {
            const payroll = (payrolls || []).find((p: any) => p.id === a.payroll_run_id);
            // Look up the related payroll_run regardless of payment_date window
            let employerCost = payroll ? Number(payroll.total_employer_cost) : 0;
            let totalTax = payroll ? Number((payroll as any).total_tax ?? 0) : 0;
            if (!payroll) {
              const { data: pr } = await supabase
                .from("payroll_runs")
                .select("total_employer_cost, total_tax")
                .eq("id", a.payroll_run_id)
                .maybeSingle();
              employerCost = Number(pr?.total_employer_cost ?? 0);
              totalTax = Number(pr?.total_tax ?? 0);
            }
            const socialFees = Math.max(0, employerCost);
            if (socialFees > 0) {
              items.push({
                id: `agi-soc-${a.id}`, date: ymd(dueDate), amount: socialFees,
                direction: "outflow", category: "social_fees",
                label: `Arbetsgivaravgifter (${a.period_year}-${String(a.period_month).padStart(2, "0")})`,
                source: "AGI", confidence: 1, link: "/hr",
              });
            }
            if (totalTax > 0) {
              items.push({
                id: `agi-tax-${a.id}`, date: ymd(dueDate), amount: totalTax,
                direction: "outflow", category: "tax",
                label: `Källskatt (${a.period_year}-${String(a.period_month).padStart(2, "0")})`,
                source: "AGI", confidence: 1, link: "/hr",
              });
            }
          }
        }

        // 5) VAT periods with payment due in this month
        const { data: vatPeriods } = await supabase
          .from("vat_periods")
          .select("id, period_start, period_end, period_type, status, ruta_values")
          .eq("company_id", companyId);
        (vatPeriods || []).forEach((v: any) => {
          // Standard SKV due date: 26th of second month after period end (monthly) or quarterly rules — use 12th of month +2 as approximation for monthly
          const pe = new Date(v.period_end);
          const dueDate = v.period_type === "monthly"
            ? new Date(pe.getFullYear(), pe.getMonth() + 2, 12)
            : new Date(pe.getFullYear(), pe.getMonth() + 2, 12);
          if (dueDate >= monthStart && dueDate <= monthEnd) {
            const ruta = v.ruta_values || {};
            const vatToPay = Number(ruta.ruta_49 ?? ruta["49"] ?? 0);
            if (vatToPay > 0) {
              items.push({
                id: `vat-${v.id}`, date: ymd(dueDate), amount: vatToPay,
                direction: "outflow", category: "vat",
                label: `Moms (${v.period_start} – ${v.period_end})`,
                source: "Momsdeklaration", confidence: 1, link: "/vat-reports",
              });
            }
          }
        });

        // 6) Recurring costs — heuristic from last 3 months on RECURRING_ACCOUNTS
        const threeMonthsAgo = ymd(addMonths(monthStart, -3));
        const lastMonthEnd = ymd(new Date(monthStart.getTime() - 86400000));

        // Step A: get journal entry IDs for the company in the lookback window
        const { data: jeRows } = await (supabase as any)
          .from("journal_entries")
          .select("id, entry_date")
          .eq("company_id", companyId)
          .gte("entry_date", threeMonthsAgo)
          .lte("entry_date", lastMonthEnd)
          .in("status", ["posted", "approved"]);
        const jeMap = new Map<string, string>();
        (jeRows || []).forEach((r: any) => jeMap.set(r.id, r.entry_date));
        const jeIds = Array.from(jeMap.keys());

        let recurringLines: any[] = [];
        if (jeIds.length > 0) {
          const { data: lineRows } = await (supabase as any)
            .from("journal_entry_lines")
            .select("account_number, debit, credit, description, journal_entry_id")
            .in("journal_entry_id", jeIds)
            .in("account_number", RECURRING_ACCOUNTS);
          recurringLines = lineRows || [];
        }

        // Group by (account_number, normalized description) → list of {date, amount}
        const groups = new Map<string, { account: string; desc: string; entries: { date: string; amount: number }[] }>();
        recurringLines.forEach((row: any) => {
          const amt = Number(row.debit ?? 0) - Number(row.credit ?? 0);
          if (amt <= 0) return;
          const entryDate = jeMap.get(row.journal_entry_id);
          if (!entryDate) return;
          const desc = (row.description || "").toLowerCase().replace(/\d+/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
          const key = `${row.account_number}|${desc}`;
          const g = groups.get(key) || { account: row.account_number, desc: row.description || row.account_number, entries: [] };
          g.entries.push({ date: entryDate, amount: amt });
          groups.set(key, g);
        });

        groups.forEach((g) => {
          if (g.entries.length < 2) return; // need ≥ 2 hits to consider recurring
          const amounts = g.entries.map((e) => e.amount);
          const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
          const maxDev = Math.max(...amounts.map((a) => Math.abs(a - avg) / avg));
          if (maxDev > 0.10) return; // ±10%
          // Predict same day-of-month as most recent entry, in current month
          const last = g.entries.sort((a, b) => a.date.localeCompare(b.date)).at(-1)!;
          const lastDate = new Date(last.date);
          const predicted = new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(lastDate.getDate(), monthEnd.getDate()));
          const confidence = Math.min(0.95, 0.5 + g.entries.length * 0.1);
          items.push({
            id: `rec-${g.account}-${g.desc.slice(0, 10)}`, date: ymd(predicted), amount: avg,
            direction: "outflow", category: "recurring",
            label: g.desc.length > 60 ? g.desc.slice(0, 60) + "…" : g.desc,
            source: `Återkommande (kto ${g.account})`, confidence,
          });
        });

        // Build daily timeline
        const dayMap = new Map<string, { outflow: number; inflow: number }>();
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
          dayMap.set(ymd(d), { outflow: 0, inflow: 0 });
        }
        items.forEach((it) => {
          const slot = dayMap.get(it.date) || { outflow: 0, inflow: 0 };
          if (it.direction === "outflow") slot.outflow += it.amount;
          else slot.inflow += it.amount;
          dayMap.set(it.date, slot);
        });

        let running = openingCash;
        let riskDate: string | null = null;
        const dailyTimeline: DailyPoint[] = [];
        Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, v]) => {
          running = running + v.inflow - v.outflow;
          if (running < 0 && !riskDate) riskDate = date;
          dailyTimeline.push({ date, outflow: v.outflow, inflow: v.inflow, balance: running });
        });

        const totalOutflow = items.filter((i) => i.direction === "outflow").reduce((a, b) => a + b.amount, 0);
        const totalInflow = items.filter((i) => i.direction === "inflow").reduce((a, b) => a + b.amount, 0);
        const netNeed = totalOutflow - totalInflow;
        const bufferAfter = openingCash + totalInflow - totalOutflow;

        const byCategory = items.reduce((acc, it) => {
          acc[it.category] = (acc[it.category] || 0) + (it.direction === "outflow" ? it.amount : -it.amount);
          return acc;
        }, {} as Record<CapitalCategory, number>);

        let status: MonthlyCapitalNeed["status"] = "green";
        if (bufferAfter < 0 || riskDate) status = "red";
        else if (bufferAfter < totalOutflow * 0.2) status = "yellow";

        if (cancelled) return;
        setState({
          loading: false, error: null, monthLabel, monthStart: monthStartIso, monthEnd: monthEndIso,
          openingCash, items, dailyTimeline, byCategory, totalOutflow, totalInflow, netNeed, bufferAfter, riskDate, status,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: e?.message || "Kunde inte ladda kapitalbehov" }));
      }
    })();

    return () => { cancelled = true; };
  }, [companyId, referenceDate.getFullYear(), referenceDate.getMonth(), tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}
