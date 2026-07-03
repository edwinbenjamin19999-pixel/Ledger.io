import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";

export type VATRate = "25" | "12" | "6" | "0";
export const VAT_RATES: VATRate[] = ["25", "12", "6", "0"];

export interface VATBreakdownRow {
  rate: VATRate;
  base: number;
  vat: number;
}

export interface VATLineDetail {
  id: string;
  entry_id: string;
  entry_date: string;
  description: string | null;
  account_number: string;
  account_name: string;
  rate: VATRate;
  base: number;
  vat: number;
  ai_confidence?: number | null;
  uncertain: boolean;
}

export interface VATSummaryData {
  loading: boolean;
  companyId: string | null;
  vatPeriodType: "monthly" | "quarterly" | "yearly";
  year: number;
  month: number; // 1-12 (anchor month)
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  dueDate: string; // ISO
  outgoing: VATBreakdownRow[];
  incoming: VATBreakdownRow[];
  outgoingTotal: number;
  incomingTotal: number;
  netToPay: number; // positive = pay, negative = refund
  uncertainCount: number;
  lines: VATLineDetail[];
  refresh: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

const computeVatPeriod = (
  vatPeriodType: "monthly" | "quarterly" | "yearly",
  ref: Date = new Date()
) => {
  const y = ref.getFullYear();
  const m = ref.getMonth() + 1;
  if (vatPeriodType === "monthly") {
    const start = `${y}-${pad(m)}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${pad(m)}-${pad(lastDay)}`;
    // Due: 12th of second month after period (simplified rule for monthly)
    const due = new Date(y, m + 1, 12);
    return {
      start,
      end,
      due: due.toISOString().slice(0, 10),
      label: `${y}-${pad(m)}`,
      anchorMonth: m,
      year: y,
    };
  }
  if (vatPeriodType === "quarterly") {
    const q = Math.ceil(m / 3);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const start = `${y}-${pad(startMonth)}-01`;
    const lastDay = new Date(y, endMonth, 0).getDate();
    const end = `${y}-${pad(endMonth)}-${pad(lastDay)}`;
    // Due: 12th of second month after period end
    const due = new Date(y, endMonth + 1, 12);
    return {
      start,
      end,
      due: due.toISOString().slice(0, 10),
      label: `Q${q} ${y}`,
      anchorMonth: startMonth,
      year: y,
    };
  }
  // yearly
  const start = `${y}-01-01`;
  const end = `${y}-12-31`;
  const due = new Date(y + 1, 4, 12); // 26 Feb actually, but we use simplified May 12
  return {
    start,
    end,
    due: due.toISOString().slice(0, 10),
    label: `${y}`,
    anchorMonth: 1,
    year: y,
  };
};

const VAT_RATE_BY_CODE: Record<string, VATRate> = {
  "25": "25",
  "12": "12",
  "6": "6",
  "0": "0",
};

export const useVATSummary = (): VATSummaryData => {
  const [companyId] = useState<string | null>(() => getStoredActiveCompanyId());
  const [vatPeriodType, setVatPeriodType] =
    useState<"monthly" | "quarterly" | "yearly">("quarterly");
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [outgoing, setOutgoing] = useState<VATBreakdownRow[]>([]);
  const [incoming, setIncoming] = useState<VATBreakdownRow[]>([]);
  const [lines, setLines] = useState<VATLineDetail[]>([]);

  const period = computeVatPeriod(vatPeriodType);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // 1. Read company VAT period setting
      const { data: comp } = await supabase
        .from("companies")
        .select("vat_period_type")
        .eq("id", companyId)
        .maybeSingle();
      const t = (comp?.vat_period_type as any) ?? "quarterly";
      const periodType: "monthly" | "quarterly" | "yearly" =
        t === "monthly" || t === "quarterly" || t === "yearly" ? t : "quarterly";
      if (cancelled) return;
      setVatPeriodType(periodType);

      const p = computeVatPeriod(periodType);

      // 2. Fetch posted journal entries in window
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("id, entry_date, description, status")
        .eq("company_id", companyId)
        .gte("entry_date", p.start)
        .lte("entry_date", p.end)
        .in("status", ["posted", "approved"] as any);
      const entryIds = (entries ?? []).map((e: any) => e.id);
      const entryMap = new Map(
        (entries ?? []).map((e: any) => [e.id, e])
      );

      let lineRows: any[] = [];
      if (entryIds.length > 0) {
        const { data } = await supabase
          .from("journal_entry_lines")
          .select(
            "id, journal_entry_id, account_id, debit, credit, vat_code, vat_amount"
          )
          .in("journal_entry_id", entryIds)
          .not("vat_code", "is", null);
        lineRows = data ?? [];
      }

      // 3. Get account info
      const accountIds = Array.from(
        new Set(lineRows.map((l: any) => l.account_id))
      );
      const accountMap = new Map<string, { number: string; name: string }>();
      if (accountIds.length > 0) {
        const { data: accs } = await supabase
          .from("chart_of_accounts")
          .select("id, account_number, account_name")
          .in("id", accountIds);
        (accs ?? []).forEach((a: any) =>
          accountMap.set(a.id, {
            number: a.account_number,
            name: a.account_name,
          })
        );
      }

      const outBuckets: Record<VATRate, { base: number; vat: number }> = {
        "25": { base: 0, vat: 0 },
        "12": { base: 0, vat: 0 },
        "6": { base: 0, vat: 0 },
        "0": { base: 0, vat: 0 },
      };
      const inBuckets: Record<VATRate, { base: number; vat: number }> = {
        "25": { base: 0, vat: 0 },
        "12": { base: 0, vat: 0 },
        "6": { base: 0, vat: 0 },
        "0": { base: 0, vat: 0 },
      };
      const detailLines: VATLineDetail[] = [];

      for (const l of lineRows) {
        const rate = VAT_RATE_BY_CODE[String(l.vat_code)];
        if (!rate) continue;
        const acc = accountMap.get(l.account_id);
        if (!acc) continue;
        const accNum = acc.number;
        const debit = Number(l.debit ?? 0);
        const credit = Number(l.credit ?? 0);
        const vatAmount = Number(l.vat_amount ?? 0);
        const ent = entryMap.get(l.journal_entry_id);

        // Sales (revenue accounts 3xxx) — credit side
        if (accNum.startsWith("3")) {
          const base = credit - debit;
          if (base !== 0) {
            outBuckets[rate].base += base;
            const computedVat =
              vatAmount !== 0 ? vatAmount : (base * Number(rate)) / 100;
            outBuckets[rate].vat += computedVat;
            detailLines.push({
              id: l.id,
              entry_id: l.journal_entry_id,
              entry_date: ent?.entry_date ?? "",
              description: ent?.description ?? null,
              account_number: accNum,
              account_name: acc.name,
              rate,
              base,
              vat: computedVat,
              uncertain: false,
            });
          }
        }
        // Purchases (cost accounts 4xxx-7xxx) — debit side
        else if (
          accNum.startsWith("4") ||
          accNum.startsWith("5") ||
          accNum.startsWith("6") ||
          accNum.startsWith("7")
        ) {
          const base = debit - credit;
          if (base !== 0) {
            inBuckets[rate].base += base;
            const computedVat =
              vatAmount !== 0 ? vatAmount : (base * Number(rate)) / 100;
            inBuckets[rate].vat += computedVat;
            detailLines.push({
              id: l.id,
              entry_id: l.journal_entry_id,
              entry_date: ent?.entry_date ?? "",
              description: ent?.description ?? null,
              account_number: accNum,
              account_name: acc.name,
              rate,
              base: -base,
              vat: -computedVat,
              uncertain: false,
            });
          }
        }
      }

      // 4. AI confidence flags (best-effort)
      try {
        const { data: suggestions } = await supabase
          .from("ai_account_suggestions" as any)
          .select("journal_entry_id, confidence")
          .eq("company_id", companyId)
          .in("journal_entry_id", entryIds);
        const lowConf = new Set(
          (suggestions ?? [])
            .filter((s: any) => Number(s.confidence ?? 1) < 0.8)
            .map((s: any) => s.journal_entry_id)
        );
        for (const dl of detailLines) {
          if (lowConf.has(dl.entry_id)) dl.uncertain = true;
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      setOutgoing(
        VAT_RATES.map((r) => ({
          rate: r,
          base: outBuckets[r].base,
          vat: outBuckets[r].vat,
        }))
      );
      setIncoming(
        VAT_RATES.map((r) => ({
          rate: r,
          base: inBuckets[r].base,
          vat: inBuckets[r].vat,
        }))
      );
      setLines(detailLines);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId, tick]);

  const outgoingTotal = outgoing.reduce((s, r) => s + r.vat, 0);
  const incomingTotal = incoming.reduce((s, r) => s + r.vat, 0);
  const netToPay = outgoingTotal - incomingTotal;
  const uncertainCount = lines.filter((l) => l.uncertain).length;

  return {
    loading,
    companyId,
    vatPeriodType,
    year: period.year,
    month: period.anchorMonth,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: period.label,
    dueDate: period.due,
    outgoing,
    incoming,
    outgoingTotal,
    incomingTotal,
    netToPay,
    uncertainCount,
    lines,
    refresh,
  };
};
