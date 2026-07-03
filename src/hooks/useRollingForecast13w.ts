import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { projectCashflow, type CashEvent } from "@/lib/cashflow/forecastEngine";

export interface WeekPoint {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekLabel: string; // "v.32"
  expected: number; // closing balance, weighted scenario
  best: number;
  worst: number;
  confirmedIn: number;
  predictedIn: number;
  fixedOut: number;
  variableOut: number;
  isRisk: boolean;
}

export interface RollingForecast13w {
  loading: boolean;
  weeks: WeekPoint[];
  runwayWeek: number | null;
  startBalance: number;
}

function isoMonday(d: Date): string {
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function weekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function useRollingForecast13w(companyId: string | undefined): RollingForecast13w {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RollingForecast13w>({
    loading: true,
    weeks: [],
    runwayWeek: null,
    startBalance: 0,
  });

  useEffect(() => {
    if (!companyId) {
      setData({ loading: false, weeks: [], runwayWeek: null, startBalance: 0 });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const today = new Date();
        const todayIso = today.toISOString().slice(0, 10);
        const horizon = 91; // 13 weeks

        const [bankRes, arRes, apRes] = await Promise.all([
          supabase
            .from("bank_accounts")
            .select("balance")
            .eq("company_id", companyId)
            .eq("is_active", true),
          supabase
            .from("invoices")
            .select("id, total_amount, due_date, status")
            .eq("company_id", companyId)
            .eq("invoice_direction", "outgoing")
            .in("status", ["sent", "overdue"] as never),
          supabase
            .from("invoices")
            .select("id, total_amount, due_date, status")
            .eq("company_id", companyId)
            .eq("invoice_direction", "incoming")
            .in("status", ["attested", "overdue", "approved"] as never),
        ]);

        const startBalance = (bankRes.data ?? []).reduce(
          (s, r: { balance: number | null }) => s + (r.balance ?? 0),
          0,
        );

        const events: CashEvent[] = [];
        for (const i of arRes.data ?? []) {
          const inv = i as { id: string; total_amount: number; due_date: string | null };
          if (!inv.due_date) continue;
          const conf = inv.due_date < todayIso ? 0.55 : 0.85; // overdue → less confident
          events.push({
            date: inv.due_date,
            amount: inv.total_amount,
            source_type: "invoice_ar",
            source_ref_id: inv.id,
            confidence: conf,
          });
        }
        for (const i of apRes.data ?? []) {
          const inv = i as { id: string; total_amount: number; due_date: string | null };
          if (!inv.due_date) continue;
          events.push({
            date: inv.due_date,
            amount: -inv.total_amount,
            source_type: "invoice_ap",
            source_ref_id: inv.id,
            confidence: 0.95,
          });
        }

        // Variable burn estimate from last 90d
        const ninetyAgo = new Date(today.getTime() - 90 * 86400000).toISOString().slice(0, 10);
        const burnRes = await supabase
          .from("journal_entry_lines")
          .select("debit, credit, journal_entries!inner(entry_date,company_id), chart_of_accounts(account_number)")
          .eq("journal_entries.company_id", companyId)
          .gte("journal_entries.entry_date", ninetyAgo);
        const burnLines = (burnRes.data ?? []) as Array<{
          debit: number | null;
          credit: number | null;
          chart_of_accounts: { account_number: string | null } | null;
        }>;
        const totalOut = burnLines
          .filter((l) => l.chart_of_accounts?.account_number?.startsWith("19"))
          .reduce((s, l) => s + Math.max(0, (l.credit ?? 0) - (l.debit ?? 0)), 0);
        const burnDaily = totalOut / 90;

        const project = (factor: number) =>
          projectCashflow({
            start_balance: startBalance,
            start_date: todayIso,
            horizon_days: horizon,
            burn_rate_daily: burnDaily,
            events: events.map((e) =>
              e.amount > 0 ? { ...e, amount: e.amount * factor } : e,
            ),
          });

        const expected = project(1).daily_points;
        const best = project(1.15).daily_points;
        const worst = project(0.7).daily_points;

        // Bucket into weeks
        const weeks: WeekPoint[] = [];
        for (let w = 0; w < 13; w++) {
          const start = new Date(today.getTime());
          start.setUTCDate(start.getUTCDate() + w * 7);
          const wStart = isoMonday(new Date(start));
          const slice = expected.slice(w * 7, (w + 1) * 7);
          const sliceB = best.slice(w * 7, (w + 1) * 7);
          const sliceW = worst.slice(w * 7, (w + 1) * 7);
          const last = slice[slice.length - 1];
          const lastB = sliceB[sliceB.length - 1];
          const lastW = sliceW[sliceW.length - 1];
          if (!last) continue;
          const confirmedIn = slice.reduce(
            (s, p) =>
              s +
              p.events
                .filter((e) => e.source_type === "invoice_ar" && (e.confidence ?? 1) >= 0.8)
                .reduce((ss, e) => ss + e.amount, 0),
            0,
          );
          const predictedIn = slice.reduce(
            (s, p) =>
              s +
              p.events
                .filter((e) => e.source_type === "invoice_ar" && (e.confidence ?? 1) < 0.8)
                .reduce((ss, e) => ss + e.amount, 0),
            0,
          );
          const fixedOut = slice.reduce(
            (s, p) =>
              s +
              p.events
                .filter((e) => e.source_type === "invoice_ap")
                .reduce((ss, e) => ss + Math.abs(e.amount), 0),
            0,
          );
          const variableOut = burnDaily * 7;
          weeks.push({
            weekStart: wStart,
            weekLabel: `v.${weekNumber(new Date(wStart))}`,
            expected: last.closing_balance,
            best: lastB?.closing_balance ?? last.closing_balance,
            worst: lastW?.closing_balance ?? last.closing_balance,
            confirmedIn,
            predictedIn,
            fixedOut,
            variableOut,
            isRisk: (lastW?.closing_balance ?? 0) < 0,
          });
        }
        const runwayWeek = weeks.findIndex((w) => w.expected <= 0);

        if (!cancelled) {
          setData({
            loading: false,
            weeks,
            runwayWeek: runwayWeek >= 0 ? runwayWeek : null,
            startBalance,
          });
        }
      } catch (err) {
        console.error("useRollingForecast13w error", err);
        if (!cancelled) setData({ loading: false, weeks: [], runwayWeek: null, startBalance: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { ...data, loading };
}
