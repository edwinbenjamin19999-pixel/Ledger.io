import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { JournalEntryJoin } from "@/types/database-extensions";

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("selectedCompanyId");
    if (stored) setCompanyId(stored);
    const handler = () => setCompanyId(localStorage.getItem("selectedCompanyId"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return companyId;
}

export interface CapitalStructure {
  aktiekapital: number;
  overkursfond: number;
  uppskrivningsfond: number;
  reservfond: number;
  fondVerkligtVarde: number;
  balanserat: number;
  aretsResultat: number;
  totalEK: number;
  friaReserver: number;
  obeskattadeReserver: number;
}

export interface WithdrawalEntry {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: "lon" | "utdelning" | "privatuttag";
}

export interface AgaruttagData {
  loading: boolean;
  companyType: "ab" | "ef";
  cashBalance: number;
  capital: CapitalStructure;
  momsReserve: number;
  fSkattReserve: number;
  ytdIncome: number;
  ytdExpenses: number;
  ytdProfit: number;
  monthlyAvgExpenses: number;
  estimatedFinalTax: number;
  fSkattCoverage: number;
  withdrawals: WithdrawalEntry[];
  totalWithdrawnThisYear: number;
  totalWithdrawnLastYear: number;
  recommendedWithdrawal: number;
  healthStatus: "healthy" | "tight" | "warning";
}

export function useAgaruttag(): AgaruttagData {
  const companyId = useCompanyId();
  const [loading, setLoading] = useState(true);
  const [companyType, setCompanyType] = useState<"ab" | "ef">("ab");
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [withdrawals, setWithdrawals] = useState<WithdrawalEntry[]>([]);
  const [lastYearWithdrawals, setLastYearWithdrawals] = useState(0);
  const [ytdIncome, setYtdIncome] = useState(0);
  const [ytdExpenses, setYtdExpenses] = useState(0);
  const [monthlyAvgExpenses, setMonthlyAvgExpenses] = useState(0);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    load();
  }, [companyId]);

  async function load() {
    if (!companyId) return;
    setLoading(true);

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const lastYearStart = `${now.getFullYear() - 1}-01-01`;
    const lastYearEnd = `${now.getFullYear() - 1}-12-31`;
    const currentMonth = now.getMonth() + 1;

    try {
      // Company type is set via the UI selector, default to AB
      // (no company_type column exists yet)

      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, account_id, journal_entries!inner(company_id, entry_date, status)")
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "approved");

      if (!lines) { setLoading(false); return; }

      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId);

      const accountMap = new Map<string, string>();
      accounts?.forEach(a => accountMap.set(a.id, a.account_number));

      const acctBalances: Record<string, number> = {};
      let income = 0, expenses = 0;
      const currentWd: WithdrawalEntry[] = [];
      let prevYearWd = 0;

      for (const line of lines) {
        const acctNum = accountMap.get(line.account_id) || "";
        const acctInt = parseInt(acctNum, 10);
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        const entryDate = (line.journal_entries as JournalEntryJoin | null)?.entry_date || "";
        const isThisYear = entryDate >= yearStart;
        const isLastYear = entryDate >= lastYearStart && entryDate <= lastYearEnd;

        // Accumulate all account balances
        if (acctNum) {
          if (!acctBalances[acctNum]) acctBalances[acctNum] = 0;
          // Assets (1xxx): debit increases
          if (acctInt >= 1000 && acctInt <= 1999) {
            acctBalances[acctNum] += debit - credit;
          }
          // Liabilities/EK (2xxx): credit increases
          else if (acctInt >= 2000 && acctInt <= 2999) {
            acctBalances[acctNum] += credit - debit;
          }
          // Income (3xxx): credit increases
          else if (acctInt >= 3000 && acctInt <= 3999) {
            if (isThisYear) income += credit - debit;
          }
          // Expenses (4xxx-7xxx): debit increases
          else if (acctInt >= 4000 && acctInt <= 7999) {
            if (isThisYear) expenses += debit - credit;
          }
          // Financial (8xxx)
          else if (acctInt >= 8000 && acctInt <= 8999) {
            if (isThisYear) {
              if (acctInt >= 8000 && acctInt <= 8399) income += credit - debit;
              else expenses += debit - credit;
            }
          }
        }

        // Withdrawals
        if ((acctNum === "2018" || acctNum === "2898") && isThisYear && debit > 0) {
          currentWd.push({
            id: line.account_id + entryDate,
            date: entryDate,
            amount: debit,
            description: acctNum === "2898" ? "Utdelning" : "Eget uttag",
            type: acctNum === "2898" ? "utdelning" : "privatuttag",
          });
        }
        if ((acctNum === "2018" || acctNum === "2898") && isLastYear) {
          prevYearWd += debit;
        }
      }

      const avgExp = currentMonth > 0 ? expenses / currentMonth : 0;

      setBalances(acctBalances);
      setYtdIncome(income);
      setYtdExpenses(expenses);
      setWithdrawals(currentWd.sort((a, b) => b.date.localeCompare(a.date)));
      setLastYearWithdrawals(prevYearWd);
      setMonthlyAvgExpenses(avgExp);
    } catch (err) {
      console.error("Failed to load ägaruttag data:", err);
    } finally {
      setLoading(false);
    }
  }

  return useMemo(() => {
    const sumAccounts = (from: string, to: string) =>
      Object.entries(balances)
        .filter(([k]) => k >= from && k <= to)
        .reduce((s, [, v]) => s + v, 0);

    const getAccount = (num: string) => balances[num] || 0;

    const aktiekapital = getAccount("2081") + getAccount("2082");
    const overkursfond = getAccount("2084");
    const uppskrivningsfond = getAccount("2085");
    const reservfond = getAccount("2086");
    const fondVerkligtVarde = getAccount("2087");
    const balanserat = getAccount("2091") + getAccount("2098");
    const aretsResultat = ytdIncome - ytdExpenses;
    const totalEK = aktiekapital + overkursfond + uppskrivningsfond + reservfond + fondVerkligtVarde + balanserat + aretsResultat;
    const friaReserver = balanserat + aretsResultat;
    const obeskattadeReserver = sumAccounts("2100", "2199");

    const cashBalance = sumAccounts("1910", "1949");
    const momsReserve = Math.max(0, sumAccounts("2610", "2650"));
    const fSkattReserve = getAccount("2518");

    const currentMonth = Math.max(new Date().getMonth() + 1, 1);
    const projectedProfit = aretsResultat * (12 / currentMonth);
    const taxRate = companyType === "ab" ? 0.206 : 0.32;
    const estimatedFinalTax = Math.round(Math.max(0, projectedProfit) * taxRate);
    const fSkattCoverage = estimatedFinalTax > 0 ? Math.round((fSkattReserve / estimatedFinalTax) * 100) : 100;

    const bufferAmount = Math.round(cashBalance * 0.15);
    const recommendedWithdrawal = Math.max(0, Math.round(cashBalance - momsReserve - fSkattReserve - bufferAmount));
    const totalWithdrawnThisYear = withdrawals.reduce((s, w) => s + w.amount, 0);

    const healthStatus: "healthy" | "tight" | "warning" =
      recommendedWithdrawal > monthlyAvgExpenses * 2 ? "healthy"
        : recommendedWithdrawal > monthlyAvgExpenses * 0.5 ? "tight"
        : "warning";

    return {
      loading,
      companyType,
      cashBalance,
      capital: {
        aktiekapital, overkursfond, uppskrivningsfond, reservfond,
        fondVerkligtVarde, balanserat, aretsResultat, totalEK, friaReserver, obeskattadeReserver,
      },
      momsReserve,
      fSkattReserve,
      ytdIncome,
      ytdExpenses,
      ytdProfit: aretsResultat,
      monthlyAvgExpenses,
      estimatedFinalTax,
      fSkattCoverage,
      withdrawals,
      totalWithdrawnThisYear,
      totalWithdrawnLastYear: lastYearWithdrawals,
      recommendedWithdrawal,
      healthStatus,
    };
  }, [balances, ytdIncome, ytdExpenses, withdrawals, lastYearWithdrawals, monthlyAvgExpenses, loading, companyType]);
}
