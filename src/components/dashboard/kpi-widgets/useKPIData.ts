import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardPeriod, useDashboardFinancials } from "@/hooks/useDashboardFinancials";
import type { DateRange } from "./types";


export interface KPISnapshot {
  loading: boolean;
  // raw aggregates (current/previous period)
  revenue: number;
  prevRevenue: number;
  cogs: number;
  grossMargin: number | null;
  result: number;
  prevResult: number;
  // 6-month gross margin sparkline (built from RPC spark)
  marginSpark: { month: string; value: number }[];
  // bank
  bankBalance: number;
  bankBalanceYesterday: number;
  // ar/ap
  arOutstanding: number;
  arOverdue: number;
  apOutstanding: number;
  // vat
  vatPosition: number;
  // payments
  upcomingPayments: { id: string; counterparty: string; amount: number; due: string }[];
  // top customers
  topCustomers: { name: string; amount: number }[];
  // runway
  monthlyBurn: number;
  /** Periodetikett — kan vara "Senaste perioden med data" om fallback aktiverats. */
  effectiveLabel?: string;
  /** True när vald period saknade poster och vi fallit tillbaka till senaste data. */
  fallbackUsed: boolean;
}

const EMPTY: KPISnapshot = {
  loading: true,
  revenue: 0,
  prevRevenue: 0,
  cogs: 0,
  grossMargin: null,
  result: 0,
  prevResult: 0,
  marginSpark: [],
  bankBalance: 0,
  bankBalanceYesterday: 0,
  arOutstanding: 0,
  arOverdue: 0,
  apOutstanding: 0,
  vatPosition: 0,
  upcomingPayments: [],
  topCustomers: [],
  monthlyBurn: 0,
  effectiveLabel: undefined,
  fallbackUsed: false,
};

export function useKPIData(
  companyId: string | null | undefined,
  range: DateRange,
  financialPeriod: DashboardPeriod = "custom",
) {
  const [auxiliary, setAuxiliary] = useState<Omit<KPISnapshot,
    "loading" | "revenue" | "prevRevenue" | "cogs" | "grossMargin" | "result" | "prevResult" | "marginSpark" | "bankBalance" | "bankBalanceYesterday" | "monthlyBurn" | "fallbackUsed" | "effectiveLabel">>({
    arOutstanding: 0,
    arOverdue: 0,
    apOutstanding: 0,
    vatPosition: 0,
    upcomingPayments: [],
    topCustomers: [],
  });
  const [auxLoading, setAuxLoading] = useState(true);

  const { data: fin, loading: finLoading } = useDashboardFinancials(
    companyId ?? null,
    financialPeriod,
    financialPeriod === "custom" ? { start: range.start, end: range.end } : undefined,
  );



  // Auxiliary data (invoices for AR/AP, VAT, top customers, upcoming payments,
  // and a canonical liquid-cash check). These are not journal-line scans so
  // they stay light — kept here so KPIWidgetGrid behaviour is unchanged.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!companyId) {
        setAuxLoading(false);
        return;
      }
      setAuxLoading(true);
      try {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const sevenDays = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

        const [openInvRes, vatInvRes, periodInvRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("invoice_direction, total_amount, due_date, status, counterparty_name")
            .eq("company_id", companyId)
            .in("status", ["sent", "overdue", "draft"]),
          supabase
            .from("invoices")
            .select("invoice_direction, vat_amount")
            .eq("company_id", companyId)
            .gte("invoice_date", monthStart),
          supabase
            .from("invoices")
            .select("counterparty_name, total_amount, invoice_direction, invoice_date")
            .eq("company_id", companyId)
            .eq("invoice_direction", "outgoing")
            .gte("invoice_date", range.start.toISOString().split("T")[0])
            .lte("invoice_date", range.end.toISOString().split("T")[0]),
        ]);

        let arOutstanding = 0, arOverdue = 0, apOutstanding = 0;
        const upcoming: KPISnapshot["upcomingPayments"] = [];
        (openInvRes.data ?? []).forEach((i: any) => {
          const amt = Number(i.total_amount ?? 0);
          if (i.invoice_direction === "outgoing") {
            arOutstanding += amt;
            if (i.due_date && i.due_date < todayStr) arOverdue += amt;
          } else if (i.invoice_direction === "incoming") {
            apOutstanding += amt;
            if (i.due_date && i.due_date >= todayStr && i.due_date <= sevenDays) {
              upcoming.push({
                id: crypto.randomUUID(),
                counterparty: i.counterparty_name ?? "Leverantör",
                amount: amt,
                due: i.due_date,
              });
            }
          }
        });
        upcoming.sort((a, b) => a.due.localeCompare(b.due));

        let outVAT = 0, inVAT = 0;
        (vatInvRes.data ?? []).forEach((i: any) => {
          const v = Number(i.vat_amount ?? 0);
          if (i.invoice_direction === "outgoing") outVAT += v;
          else if (i.invoice_direction === "incoming") inVAT += v;
        });

        const custMap = new Map<string, number>();
        (periodInvRes.data ?? []).forEach((i: any) => {
          const k = i.counterparty_name ?? "Okänd";
          custMap.set(k, (custMap.get(k) ?? 0) + Number(i.total_amount ?? 0));
        });
        const topCustomers = [...custMap.entries()]
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);

        if (!cancelled) {
          setAuxiliary({
            arOutstanding,
            arOverdue,
            apOutstanding,
            vatPosition: outVAT - inVAT,
            upcomingPayments: upcoming.slice(0, 5),
            topCustomers,
          });
        }
      } catch (e) {
        console.error("[useKPIData] auxiliary error", e);
      } finally {
        if (!cancelled) setAuxLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, range.start.getTime(), range.end.getTime()]);

  const snap: KPISnapshot = useMemo(() => {
    if (!fin) {
      return { ...EMPTY, loading: finLoading || auxLoading || !companyId };
    }

    const revenue = Number(fin.omsattning);
    const cogs = Number(fin.ksv);
    const grossMargin = fin.bruttomarginal == null ? null : Number(fin.bruttomarginal);
    const result = Number(fin.resultat);
    const bankBalance = Number(fin.likvida);

    return {
      loading: false,
      revenue,
      prevRevenue: 0,
      cogs,
      grossMargin,
      result,
      prevResult: 0,
      marginSpark: grossMargin == null ? [] : [{ month: range.label, value: grossMargin }],
      bankBalance,
      bankBalanceYesterday: bankBalance,

      arOutstanding: auxiliary.arOutstanding,
      arOverdue: auxiliary.arOverdue,
      apOutstanding: auxiliary.apOutstanding,
      vatPosition: auxiliary.vatPosition,
      upcomingPayments: auxiliary.upcomingPayments,
      topCustomers: auxiliary.topCustomers,
      monthlyBurn: 0,
      fallbackUsed: false,
      effectiveLabel: undefined,
    };
  }, [fin, auxiliary, finLoading, auxLoading, companyId, range.label]);

  return snap;
}
