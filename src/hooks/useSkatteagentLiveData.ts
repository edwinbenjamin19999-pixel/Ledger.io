/**
 * Composite hook for the Skatteagent module.
 *
 * Pulls the three live sources together so the page can stay declarative:
 *   1. GL lines for the year (account 2518 + RBT components)
 *   2. Bank accounts (balance + first PIS-capable account)
 *   3. SKV mandate status + (when connected) live `upcoming` F-skatt event
 *
 * Returns one normalized `state` (PreliminaryTaxState) along with capability flags.
 * No demo data — when sources are missing, fields stay null/0 and the page
 * renders an ActivationHero instead.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computePreliminaryTaxState,
  type FTaxJournalLine,
  type PreliminaryTaxState,
} from "@/lib/skatteagent/preliminaryTaxEngine";

interface JoinedLine {
  entryDate: string;
  accountNumber: string;
  debit: number;
  credit: number;
  journalEntryId: string;
  description: string;
}

interface BankAccountRow {
  id: string;
  account_name: string;
  iban: string;
  balance: number | null;
  bank_name: string;
  bank_connection_id: string | null;
}

interface SKVUpcoming {
  nextDueDate: string | null;
  nextDueAmount: number;
  ocr: string | null;
  paymentReference: string | null;
}

export interface SkatteagentLiveData {
  state: PreliminaryTaxState;
  ftaxJournal: JoinedLine[];
  bankBalanceTotal: number;
  bankAccounts: BankAccountRow[];
  primaryBankAccount: BankAccountRow | null;
  skvConnected: boolean;
  skvLastSync: string | null;
  skvUpcoming: SKVUpcoming | null;
  hasAnyData: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
}

export function useSkatteagentLiveData(companyId: string | null): SkatteagentLiveData {
  const year = new Date().getFullYear();

  // 1. GL
  const glQuery = useQuery({
    queryKey: ["skatteagent-gl", companyId, year],
    enabled: !!companyId,
    queryFn: async (): Promise<{ ftax: JoinedLine[]; rbt: number; months: number }> => {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(
          `debit, credit,
           chart_of_accounts!inner(account_number, account_type),
           journal_entries!inner(id, entry_date, description, status, company_id)`,
        )
        .eq("journal_entries.company_id", companyId!)
        .eq("journal_entries.status", "approved")
        .gte("journal_entries.entry_date", start)
        .lte("journal_entries.entry_date", end);
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        debit: number;
        credit: number;
        chart_of_accounts: { account_number: string; account_type: string };
        journal_entries: { id: string; entry_date: string; description: string };
      }>;

      const ftax: JoinedLine[] = [];
      const monthsSet = new Set<string>();
      let revenue = 0;
      let expense = 0;
      for (const r of rows) {
        const acc = r.chart_of_accounts.account_number;
        const t = r.chart_of_accounts.account_type;
        monthsSet.add(r.journal_entries.entry_date.slice(0, 7));
        if (acc === "2518" && Number(r.debit) > 0) {
          ftax.push({
            entryDate: r.journal_entries.entry_date,
            accountNumber: acc,
            debit: Number(r.debit) || 0,
            credit: Number(r.credit) || 0,
            journalEntryId: r.journal_entries.id,
            description: r.journal_entries.description,
          });
        }
        if (t === "income") revenue += Number(r.credit) - Number(r.debit);
        if (t === "expense") expense += Number(r.debit) - Number(r.credit);
      }
      return { ftax, rbt: revenue - expense, months: Math.max(1, monthsSet.size) };
    },
  });

  // 2. Bank
  const bankQuery = useQuery({
    queryKey: ["skatteagent-banks", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<BankAccountRow[]> => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, account_name, iban, balance, bank_name, bank_connection_id")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as BankAccountRow[];
    },
  });

  // 3. SKV mandate
  const skvMandateQuery = useQuery({
    queryKey: ["skatteagent-skv-mandate", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("tax_mandates")
        .select("status, updated_at")
        .eq("company_id", companyId!)
        .eq("status", "active")
        .maybeSingle();
      return { connected: !!data, lastSync: data?.updated_at ?? null };
    },
  });

  // 4. SKV upcoming F-skatt (only when mandate active)
  const skvUpcomingQuery = useQuery({
    queryKey: ["skatteagent-skv-upcoming", companyId],
    enabled: !!companyId && !!skvMandateQuery.data?.connected,
    queryFn: async (): Promise<SKVUpcoming | null> => {
      const { data, error } = await supabase.functions.invoke(
        "skatteverket-skattekonto",
        { body: { company_id: companyId, action: "upcoming" } },
      );
      if (error) {
        console.warn("SKV upcoming fetch failed", error);
        return null;
      }
      const payload = (data as { data?: SKVUpcoming })?.data ?? null;
      return payload;
    },
  });

  const bankAccounts = bankQuery.data ?? [];
  const bankBalanceTotal = bankAccounts.reduce(
    (s, a) => s + (Number(a.balance) || 0),
    0,
  );
  const primaryBankAccount =
    bankAccounts.find((a) => !!a.bank_connection_id) ?? bankAccounts[0] ?? null;

  const state = useMemo(() => {
    const lines: FTaxJournalLine[] = (glQuery.data?.ftax ?? []).map((l) => ({
      entryDate: l.entryDate,
      accountNumber: l.accountNumber,
      debit: l.debit,
      credit: l.credit,
    }));
    return computePreliminaryTaxState({
      glLines: lines,
      bankBalanceTotal,
      ytdResultBeforeTax: glQuery.data?.rbt ?? 0,
      ytdMonths: glQuery.data?.months ?? 1,
      manualNextAmount: skvUpcomingQuery.data?.nextDueAmount || null,
    });
  }, [glQuery.data, bankBalanceTotal, skvUpcomingQuery.data]);

  // Override nextDueDate with live SKV value if available
  const liveState: PreliminaryTaxState = useMemo(() => {
    const skvDate = skvUpcomingQuery.data?.nextDueDate;
    if (!skvDate) return state;
    const today = new Date();
    const next = new Date(skvDate);
    const days = Math.ceil((next.getTime() - today.getTime()) / 86400000);
    return { ...state, nextDueDate: skvDate, daysUntilDue: days };
  }, [state, skvUpcomingQuery.data]);

  const hasAnyData =
    (glQuery.data?.ftax.length ?? 0) > 0 ||
    bankAccounts.length > 0 ||
    !!skvMandateQuery.data?.connected;

  return {
    state: liveState,
    ftaxJournal: glQuery.data?.ftax ?? [],
    bankBalanceTotal,
    bankAccounts,
    primaryBankAccount,
    skvConnected: !!skvMandateQuery.data?.connected,
    skvLastSync: skvMandateQuery.data?.lastSync ?? null,
    skvUpcoming: skvUpcomingQuery.data ?? null,
    hasAnyData,
    isLoading:
      glQuery.isLoading ||
      bankQuery.isLoading ||
      skvMandateQuery.isLoading ||
      skvUpcomingQuery.isLoading,
    refetch: async () => {
      await Promise.all([
        glQuery.refetch(),
        bankQuery.refetch(),
        skvMandateQuery.refetch(),
        skvUpcomingQuery.refetch(),
      ]);
    },
  };
}
