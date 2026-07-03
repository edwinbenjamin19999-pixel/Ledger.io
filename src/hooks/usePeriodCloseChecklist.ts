import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";

export type CheckStatus = "ok" | "warn" | "manual" | "loading";

export interface ChecklistItem {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  actionLabel?: string;
  actionHref?: string;
  manual?: boolean;
}

export interface PeriodCloseState {
  loading: boolean;
  companyId: string | null;
  year: number;
  month: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  isLocked: boolean;
  daysToPeriodEnd: number; // negative if past
  items: ChecklistItem[];
  manualChecks: Record<string, boolean>;
  toggleManual: (id: string) => void;
  refresh: () => void;
  lockPeriod: () => Promise<void>;
  locking: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

const periodBoundsForToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  const daysToEnd = Math.ceil((new Date(end).getTime() - now.getTime()) / 86400000);
  return { year, month, start, end, daysToEnd };
};

const STORAGE_KEY = (companyId: string, y: number, m: number) =>
  `period-close:manual:${companyId}:${y}-${m}`;

export const usePeriodCloseChecklist = (
  override?: { year: number; month: number }
): PeriodCloseState => {
  const bounds = periodBoundsForToday();
  const year = override?.year ?? bounds.year;
  const month = override?.month ?? bounds.month;
  const periodStart = `${year}-${pad(month)}-01`;
  const periodEnd = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

  const [companyId] = useState<string | null>(() => getStoredActiveCompanyId());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [locking, setLocking] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>(() => {
    if (!companyId || typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY(companyId, year, month)) || "{}");
    } catch {
      return {};
    }
  });

  const toggleManual = useCallback(
    (id: string) => {
      setManualChecks((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        if (companyId && typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY(companyId, year, month), JSON.stringify(next));
        }
        return next;
      });
    },
    [companyId, year, month]
  );

  const safe = async <T,>(p: PromiseLike<T>, fallback: T): Promise<T> => {
    try {
      const r = await p;
      return (r as any) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const lockRes = await safe(
      supabase
        .from("accounting_periods")
        .select("status")
        .eq("company_id", companyId)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle() as any,
      { data: null }
    );
    setIsLocked(lockRes?.data?.status === "locked");

    const bankTotal = await safe(
      supabase
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("booking_date", periodStart)
        .lte("booking_date", periodEnd) as any,
      { count: 0 }
    );
    const bankUnmatched = await safe(
      supabase
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("booking_date", periodStart)
        .lte("booking_date", periodEnd)
        .eq("status", "pending") as any,
      { count: 0 }
    );
    const totalCount = bankTotal?.count ?? 0;
    const unmatched = bankUnmatched?.count ?? 0;
    const matched = totalCount - unmatched;

    const invDraft = await safe(
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("invoice_direction", "outgoing")
        .gte("invoice_date", periodStart)
        .lte("invoice_date", periodEnd)
        .eq("status", "draft") as any,
      { count: 0 }
    );
    const draftInv = invDraft?.count ?? 0;

    const supTotal = await safe(
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("invoice_direction", "incoming")
        .gte("invoice_date", periodStart)
        .lte("invoice_date", periodEnd) as any,
      { count: 0 }
    );
    const supPending = await safe(
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("invoice_direction", "incoming")
        .gte("invoice_date", periodStart)
        .lte("invoice_date", periodEnd)
        .in("status", ["draft"] as any) as any,
      { count: 0 }
    );
    const supTotalCount = supTotal?.count ?? 0;
    const supPendingCount = supPending?.count ?? 0;

    const vatRes = await safe(
      supabase
        .from("vat_periods" as any)
        .select("status, net_vat")
        .eq("company_id", companyId)
        .lte("period_start", periodStart)
        .gte("period_end", periodEnd)
        .maybeSingle() as any,
      { data: null }
    );

    const accruals = await safe(
      supabase
        .from("ai_account_suggestions" as any)
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .ilike("reasoning", "%period%") as any,
      { count: 0 }
    );

    const interim = await safe(
      supabase
        .from("journal_entry_lines" as any)
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("entry_date", periodStart)
        .lte("entry_date", periodEnd)
        .or("account_number.like.17%,account_number.like.29%") as any,
      { count: 0 }
    );
    const interimCount = interim?.count ?? 0;

    const draftJE = await safe(
      supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("entry_date", periodStart)
        .lte("entry_date", periodEnd)
        .eq("status", "draft") as any,
      { count: 0 }
    );
    const draftJECount = draftJE?.count ?? 0;

    // IB/UB-identitet på likvida medel (19xx): IB + periodens rörelser = UB.
    // Bryts denna identitet är kassaflödet ur synk med huvudboken.
    let ibUbDiff = 0;
    let ibUbHasData = false;
    let ibVal = 0, ubVal = 0, periodNet = 0;
    try {
      const { data: cashLines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(company_id, status, entry_date)")
        .eq("journal_entries.company_id", companyId)
        .eq("chart_of_accounts.company_id", companyId)
        .in("journal_entries.status", ["posted", "approved"])
        .like("chart_of_accounts.account_number", "19%")
        .lte("journal_entries.entry_date", periodEnd);

      for (const l of (cashLines ?? []) as Array<{
        debit: number | null; credit: number | null;
        journal_entries: { entry_date: string } | null;
      }>) {
        const d = Number(l.debit ?? 0), c = Number(l.credit ?? 0);
        const date = l.journal_entries?.entry_date ?? "";
        const delta = d - c;
        ubVal += delta;
        if (date < periodStart) ibVal += delta;
        else periodNet += delta;
      }
      ibUbHasData = (cashLines?.length ?? 0) > 0;
      ibUbDiff = (ibVal + periodNet) - ubVal;
    } catch { /* leave neutral */ }


    // Balansräkningen i balans (samma motor: tillgångar = EK + skulder + resultat)
    let brDiff = 0;
    let brHasData = false;
    try {
      const { data: balanceLines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(company_id, status, entry_date)")
        .eq("journal_entries.company_id", companyId)
        .eq("chart_of_accounts.company_id", companyId)
        .in("journal_entries.status", ["posted", "approved"])
        .lte("journal_entries.entry_date", periodEnd);

      let assets = 0, liabEq = 0, resultClass = 0;
      for (const l of (balanceLines ?? []) as Array<{
        debit: number | null; credit: number | null;
        chart_of_accounts: { account_number: string } | null;
      }>) {
        const acc = l.chart_of_accounts?.account_number ?? "";
        const d = Number(l.debit ?? 0), c = Number(l.credit ?? 0);
        if (acc.startsWith("1")) assets += d - c;
        else if (acc.startsWith("2")) liabEq += c - d;
        else if (/^[3-8]/.test(acc)) resultClass += c - d;
      }
      brHasData = (balanceLines?.length ?? 0) > 0;
      brDiff = assets - (liabEq + resultClass);
    } catch { /* aggregate query failed → fall through to neutral state */ }


    const next: ChecklistItem[] = [
      {
        id: "bank",
        label: "Alla bankposter matchade",
        status: totalCount === 0 ? "warn" : unmatched === 0 ? "ok" : "warn",
        detail:
          totalCount === 0
            ? "Inga bankposter för perioden"
            : unmatched === 0
              ? `${matched}/${totalCount} matchade`
              : `${unmatched} omatchade transaktioner kvar`,
        actionLabel: unmatched > 0 ? "Matcha" : undefined,
        actionHref: "/bankavstamning",
      },
      {
        id: "customer-invoices",
        label: "Kundfakturor bokförda",
        status: draftInv === 0 ? "ok" : "warn",
        detail:
          draftInv === 0
            ? "Inga obokade fakturor"
            : `${draftInv} fakturor saknar kontering`,
        actionLabel: draftInv > 0 ? "Bokför" : undefined,
        actionHref: "/invoices",
      },
      {
        id: "supplier-invoices",
        label: "Leverantörsfakturor attesterade",
        status: supPendingCount === 0 ? "ok" : "warn",
        detail:
          supTotalCount === 0
            ? "Inga leverantörsfakturor"
            : supPendingCount === 0
              ? `${supTotalCount}/${supTotalCount} attesterade`
              : `${supPendingCount} väntar på attest`,
        actionLabel: supPendingCount > 0 ? "Attestera" : undefined,
        actionHref: "/supplier-invoices",
      },
      {
        id: "vat",
        label: "Moms sammanställd",
        status: vatRes?.data ? "ok" : "warn",
        detail: vatRes?.data
          ? `Momsunderlag klart${
              vatRes.data.net_vat != null
                ? ` — ${Math.round(vatRes.data.net_vat).toLocaleString("sv-SE")} kr`
                : ""
            }`
          : "Granskas",
        actionLabel: "Öppna moms",
        actionHref: "/moms",
      },
      {
        id: "accruals",
        label: "Periodiseringar kontrollerade",
        status: (accruals?.count ?? 0) > 0 ? "warn" : "ok",
        detail:
          (accruals?.count ?? 0) > 0
            ? `Jag har identifierat ${accruals.count} förutbetalda kostnader att periodisera`
            : "Inga periodiseringsförslag",
        actionLabel: (accruals?.count ?? 0) > 0 ? "Granska" : undefined,
        actionHref: "/periodisering",
      },
      {
        id: "payroll",
        label: "Lönekostnader bokförda",
        status: "manual",
        detail: "Manuell kontroll krävs",
        actionLabel: "Öppna lön",
        actionHref: "/hr",
        manual: true,
      },
      {
        id: "interim",
        label: "Interimsposter granskade",
        status: interimCount === 0 ? "ok" : "warn",
        detail:
          interimCount === 0
            ? "Inga öppna interimskonton"
            : `AI flaggar ${interimCount} rörelser på interimskonton`,
        actionLabel: interimCount > 0 ? "Granska" : undefined,
        actionHref: "/account-analysis",
      },
      {
        id: "ib-ub",
        label: "IB/UB-kontroll",
        status: !ibUbHasData
          ? "warn"
          : draftJECount > 0
            ? "warn"
            : Math.abs(ibUbDiff) <= 1
              ? "ok"
              : "warn",
        detail: !ibUbHasData
          ? "Inga rörelser på likvida medel (19xx) för perioden"
          : draftJECount > 0
            ? `${draftJECount} utkast hindrar avstämning`
            : Math.abs(ibUbDiff) <= 1
              ? `IB ${Math.round(ibVal).toLocaleString("sv-SE")} + rörelser ${Math.round(periodNet).toLocaleString("sv-SE")} = UB ${Math.round(ubVal).toLocaleString("sv-SE")} kr`
              : `IB ${Math.round(ibVal).toLocaleString("sv-SE")} + rörelser ${Math.round(periodNet).toLocaleString("sv-SE")} ≠ UB ${Math.round(ubVal).toLocaleString("sv-SE")} kr (differens ${Math.round(ibUbDiff).toLocaleString("sv-SE")} kr)`,
        actionLabel: (draftJECount > 0 || Math.abs(ibUbDiff) > 1) ? "Granska" : undefined,
        actionHref: draftJECount > 0 ? "/verifications" : "/reports?lens=KF&investigate=1",
      },
      {
        // Hård blockerare: BR måste balansera innan perioden kan stängas.
        id: "br-balance",
        label: "Balansräkningen i balans",
        status: !brHasData ? "warn" : Math.abs(brDiff) <= 1 ? "ok" : "warn",
        detail: !brHasData
          ? "Inga verifikationer hittade för perioden"
          : Math.abs(brDiff) <= 1
            ? "Tillgångar = Eget kapital + Skulder + Resultat"
            : `Obalans ${Math.round(brDiff).toLocaleString("sv-SE")} kr — perioden kan inte stängas`,
        actionLabel: Math.abs(brDiff) > 1 ? "Undersök obalans" : undefined,
        actionHref: "/reports?lens=BR&investigate=1",
      },
    ];

    setItems(next);
    setLoading(false);
  }, [companyId, year, month, periodStart, periodEnd]);

  useEffect(() => {
    load();
  }, [load, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const lockPeriod = useCallback(async () => {
    if (!companyId) return;
    setLocking(true);
    try {
      const { data: existing } = await supabase
        .from("accounting_periods")
        .select("id")
        .eq("company_id", companyId)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      if (existing?.id) {
        await supabase
          .from("accounting_periods")
          .update({ status: "locked", locked_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("accounting_periods")
          .insert({
            company_id: companyId,
            year,
            month,
            status: "locked",
            locked_at: new Date().toISOString(),
          });
      }
      setIsLocked(true);
    } finally {
      setLocking(false);
    }
  }, [companyId, year, month]);

  return {
    loading,
    companyId,
    year,
    month,
    periodStart,
    periodEnd,
    isLocked,
    daysToPeriodEnd: bounds.daysToEnd,
    items,
    manualChecks,
    toggleManual,
    refresh,
    lockPeriod,
    locking,
  };
};
