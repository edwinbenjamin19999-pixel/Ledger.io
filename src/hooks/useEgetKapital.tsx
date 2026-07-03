import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { JournalEntryJoin } from "@/types/database-extensions";

function useCompanyId() { const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem("selectedCompanyId");
    if (stored) setCompanyId(stored);
    const handler = () => setCompanyId(localStorage.getItem("selectedCompanyId"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return companyId;
}

interface WithdrawalEntry { id: string;
  date: string;
  amount: number;
  description: string;
}

interface TaxReserve { fSkatt: number;
  fSkattMonthly: number;
  momsNextPeriod: number;
  estimatedFinalTax: number;
  fSkattCoverage: number;
}

interface CapitalData { cashBalance: number;
  momsReserve: number;
  fSkattReserve: number;
  bufferPercent: number;
  bufferAmount: number;
  recommendedWithdrawal: number;
  withdrawalsThisYear: WithdrawalEntry[];
  totalWithdrawnThisYear: number;
  totalWithdrawnLastYear: number;
  ytdIncome: number;
  ytdExpenses: number;
  ytdProfit: number;
  taxReserve: TaxReserve;
  monthlyAvgExpenses: number;
  healthStatus: "healthy" | "tight" | "warning";
  loading: boolean;
}

export function useEgetKapital(): CapitalData { const companyId = useCompanyId();
  const [loading, setLoading] = useState(true);
  const [cashBalance, setCashBalance] = useState(0);
  const [momsBalance, setMomsBalance] = useState(0);
  const [fSkattBalance, setFSkattBalance] = useState(0);
  const [ytdIncome, setYtdIncome] = useState(0);
  const [ytdExpenses, setYtdExpenses] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalEntry[]>([]);
  const [lastYearWithdrawals, setLastYearWithdrawals] = useState(0);
  const [monthlyAvgExpenses, setMonthlyAvgExpenses] = useState(0);

  useEffect(() => { if (!companyId) { setLoading(false);
      return;
    }
    loadFinancialData();
  }, [companyId]);

  async function loadFinancialData() { if (!companyId) return;
    setLoading(true);

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const lastYearStart = `${now.getFullYear() - 1}-01-01`;
    const lastYearEnd = `${now.getFullYear() - 1}-12-31`;
    const currentMonth = now.getMonth() + 1;

    try { // Fetch journal entry lines för balances
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, account_id, journal_entries!inner(company_id, entry_date, status)")
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "approved");

      if (!lines) { setLoading(false);
        return;
      }

      // Get account numbers för mapping
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId);

      const accountMap = new Map<string, string>();
      accounts?.forEach((a) => accountMap.set(a.id, a.account_number));

      let cash = 0;
      let moms = 0;
      let fskatt = 0;
      let income = 0;
      let expenses = 0;
      let avgExpenseMonths = 0;
      const currentWithdrawals: WithdrawalEntry[] = [];
      let prevYearWithdrawals = 0;

      for (const line of lines) { const acctNum = accountMap.get(line.account_id) || "";
        const acctInt = parseInt(acctNum, 10);
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        const entryDate = (line.journal_entries as JournalEntryJoin | null)?.entry_date || "";
        const isThisYear = entryDate >= yearStart;
        const isLastYear = entryDate >= lastYearStart && entryDate <= lastYearEnd;

        // Cash & bank (1910-1949)
        if (acctInt >= 1910 && acctInt <= 1949) { cash += debit - credit;
        }

        // Moms liability (2610-2650)
        if (acctInt >= 2610 && acctInt <= 2650) { moms += credit - debit;
        }

        // F-skatt (2518 betald F-skatt, 1630 skattefordran)
        if (acctNum === "2518") { fskatt += debit - credit;
        }

        // Income this year (3000-3999)
        if (isThisYear && acctInt >= 3000 && acctInt <= 3999) { income += credit - debit;
        }

        // Expenses this year (4000-7999)
        if (isThisYear && acctInt >= 4000 && acctInt <= 7999) { expenses += debit - credit;
        }

        // Withdrawals this year (2018 Egna uttag)
        if (acctNum === "2018" && isThisYear) { if (debit > 0) { currentWithdrawals.push({ id: line.account_id + entryDate,
              date: entryDate,
              amount: debit,
              description: "Eget uttag",
            });
          }
        }

        // Withdrawals last year
        if (acctNum === "2018" && isLastYear) { prevYearWithdrawals += debit;
        }
      }

      // Calculate monthly average expenses
      avgExpenseMonths = currentMonth > 0 ? expenses / currentMonth : 0;

      setCashBalance(cash);
      setMomsBalance(Math.max(0, moms));
      setFSkattBalance(fskatt);
      setYtdIncome(income);
      setYtdExpenses(expenses);
      setWithdrawals(currentWithdrawals.sort((a, b) => b.date.localeCompare(a.date)));
      setLastYearWithdrawals(prevYearWithdrawals);
      setMonthlyAvgExpenses(avgExpenseMonths);
    } catch (err) { console.error("Failed to load capital data:", err);
    } finally { setLoading(false);
    }
  }

  return useMemo(() => { const bufferPercent = 15;
    const bufferAmount = Math.round(cashBalance * (bufferPercent / 100));
    const recommended = Math.max(0, Math.round(cashBalance - momsBalance - fSkattBalance - bufferAmount));
    const totalWithdrawnThisYear = withdrawals.reduce((s, w) => s + w.amount, 0);
    const ytdProfit = ytdIncome - ytdExpenses;

    // Tax calculations för sole proprietor
    const estimatedTaxableIncome = ytdProfit * (12 / Math.max(new Date().getMonth() + 1, 1));
    const taxRate = 0.32; // approx municipal + state tax för sole proprietors
    const estimatedFinalTax = Math.round(estimatedTaxableIncome * taxRate);
    const fSkattMonthly = Math.round(estimatedFinalTax / 12);
    const fSkattCoverage = estimatedFinalTax > 0 ? Math.round((fSkattBalance / estimatedFinalTax) * 100) : 100;

    const healthStatus: "healthy" | "tight" | "warning" =
      recommended > monthlyAvgExpenses * 2
        ? "healthy"
        : recommended > monthlyAvgExpenses * 0.5
        ? "tight"
        : "warning";

    return { cashBalance,
      momsReserve: momsBalance,
      fSkattReserve: fSkattBalance,
      bufferPercent,
      bufferAmount,
      recommendedWithdrawal: recommended,
      withdrawalsThisYear: withdrawals,
      totalWithdrawnThisYear,
      totalWithdrawnLastYear: lastYearWithdrawals,
      ytdIncome,
      ytdExpenses,
      ytdProfit,
      taxReserve: { fSkatt: fSkattBalance,
        fSkattMonthly,
        momsNextPeriod: momsBalance,
        estimatedFinalTax,
        fSkattCoverage,
      },
      monthlyAvgExpenses,
      healthStatus,
      loading,
    };
  }, [cashBalance, momsBalance, fSkattBalance, ytdIncome, ytdExpenses, withdrawals, lastYearWithdrawals, monthlyAvgExpenses, loading]);
}
