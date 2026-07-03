import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DeclarationField, FieldConfidence } from "./types";

interface AccountBalance {
  account_number: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
}

export const useAIFillEngine = (companyId: string, taxYear: number) => {
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const fetchBalances = async (): Promise<AccountBalance[]> => {
    const startDate = `${taxYear}-01-01`;
    const endDate = `${taxYear}-12-31`;

    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", companyId)
      .in("status", ["approved", "posted"])
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    const entryIds = (entries || []).map(e => e.id);
    if (entryIds.length === 0) return [];

    let allLines: any[] = [];
    for (let i = 0; i < entryIds.length; i += 100) {
      const batch = entryIds.slice(i, i + 100);
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number, account_name)")
        .in("journal_entry_id", batch);
      allLines.push(...(lines || []));
    }

    const map = new Map<string, AccountBalance>();
    for (const l of allLines) {
      const num = l.chart_of_accounts?.account_number || "";
      const name = l.chart_of_accounts?.account_name || "";
      if (!num) continue;
      const existing = map.get(num) || { account_number: num, account_name: name, debit: 0, credit: 0, balance: 0 };
      existing.debit += l.debit || 0;
      existing.credit += l.credit || 0;
      existing.balance = existing.debit - existing.credit;
      map.set(num, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.account_number.localeCompare(b.account_number));
  };

  const sumRange = (bals: AccountBalance[], from: string, to: string) => {
    let total = 0;
    for (const b of bals) {
      if (b.account_number >= from && b.account_number <= to) {
        total += b.balance;
      }
    }
    return total;
  };

  const sumAccounts = (bals: AccountBalance[], ...accounts: string[]) => {
    let total = 0;
    for (const b of bals) {
      if (accounts.includes(b.account_number)) total += b.balance;
    }
    return total;
  };

  const getConfidence = (value: number, hasDirectMapping: boolean): FieldConfidence => {
    if (value === 0 && !hasDirectMapping) return "low";
    if (hasDirectMapping) return "high";
    return "medium";
  };

  const runDiagnostics = (bals: AccountBalance[]) => {
    const warnings: string[] = [];
    const revenue = -sumRange(bals, "3000", "3999");
    const expenses = sumRange(bals, "4000", "8999");
    const result2099 = -sumRange(bals, "2099", "2099");
    const calcResult = revenue - expenses;

    if (Math.abs(result2099 - calcResult) > 1 && result2099 !== 0) {
      warnings.push(`Konto 2099 (${Math.round(result2099)} kr) stämmer inte med beräknat resultat (${Math.round(calcResult)} kr)`);
    }

    const hasClass3 = bals.some(b => b.account_number >= "3000" && b.account_number <= "3999");
    const hasClass4 = bals.some(b => b.account_number >= "4000" && b.account_number <= "4999");
    if (!hasClass3) warnings.push("Inga intäkter på klass 3 — kontrollera bokföringen");
    if (!hasClass4) warnings.push("Inga kostnader på klass 4 — kontrollera bokföringen");

    return warnings;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const bals = await fetchBalances();
      setBalances(bals);
      const diag = runDiagnostics(bals);
      setDiagnostics(diag);
      return bals;
    } finally {
      setLoading(false);
    }
  };

  return { loading, balances, diagnostics, loadData, sumRange, sumAccounts, getConfidence };
};
