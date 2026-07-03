import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import type { ComparisonState, ComparisonMode, PeriodPreset, VarianceRow, KPIMetric } from "./types";

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY)
  );
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

const now = new Date();

const DEFAULT_STATE: ComparisonState = {
  mode: 'actual_vs_budget',
  period: 'ytd',
  year: now.getFullYear(),
  month: now.getMonth(),
};

// BAS account class groupings for P&L
const PNL_SECTIONS = [
  { id: 'revenue', label: 'RÖRELSEINTÄKTER', range: [3000, 3999], isRevenue: true, level: 1 as const },
  { id: 'cogs', label: 'KOSTNADER FÖR SÅLDA VAROR', range: [4000, 4999], isRevenue: false, level: 1 as const },
  { id: 'personnel', label: 'PERSONALKOSTNADER', range: [7000, 7699], isRevenue: false, level: 1 as const },
  { id: 'depreciation', label: 'AVSKRIVNINGAR', range: [7700, 7899], isRevenue: false, level: 1 as const },
  { id: 'other_external', label: 'ÖVRIGA EXTERNA KOSTNADER', range: [5000, 6999], isRevenue: false, level: 1 as const },
];

function getDateRange(state: ComparisonState): { from: string; to: string } {
  const y = state.year;
  switch (state.period) {
    case 'month': {
      const m = state.month;
      const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const to = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
      return { from, to };
    }
    case 'quarter': {
      const q = Math.floor(state.month / 3);
      const startMonth = q * 3;
      const endMonth = startMonth + 2;
      const from = `${y}-${String(startMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, endMonth + 1, 0).getDate();
      const to = `${y}-${String(endMonth + 1).padStart(2, '0')}-${lastDay}`;
      return { from, to };
    }
    case 'ytd': {
      const from = `${y}-01-01`;
      const lastDay = new Date(y, state.month + 1, 0).getDate();
      const to = `${y}-${String(state.month + 1).padStart(2, '0')}-${lastDay}`;
      return { from, to };
    }
    case 'full_year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
}

function getBudgetMonths(state: ComparisonState): number[] {
  switch (state.period) {
    case 'month': return [state.month + 1];
    case 'quarter': {
      const q = Math.floor(state.month / 3);
      return [q * 3 + 1, q * 3 + 2, q * 3 + 3];
    }
    case 'ytd': return Array.from({ length: state.month + 1 }, (_, i) => i + 1);
    case 'full_year': return Array.from({ length: 12 }, (_, i) => i + 1);
  }
}

export function useFinancialComparison() {
  const [state, setState] = useState<ComparisonState>(DEFAULT_STATE);
  const selectedCompanyId = useCompanyId();
  const dateRange = useMemo(() => getDateRange(state), [state]);
  const budgetMonths = useMemo(() => getBudgetMonths(state), [state]);

  // Actual data from journal entries
  const { data: actualData, isLoading: loadingActual } = useQuery({
    queryKey: ['financial-actual', selectedCompanyId, dateRange],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit, 
          chart_of_accounts!inner(account_number, account_name, account_type),
          journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entries.company_id', selectedCompanyId)
        .eq('journal_entries.status', 'approved')
        .gte('journal_entries.entry_date', dateRange.from)
        .lte('journal_entries.entry_date', dateRange.to);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  // Budget data from budget_plans + budget_rows
  const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'] as const;

  const { data: budgetData, isLoading: loadingBudget } = useQuery({
    queryKey: ['financial-budget', selectedCompanyId, state.year, budgetMonths],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      // 1. Find the active budget plan for this company + year
      const { data: plans, error: planError } = await supabase
        .from('budget_plans')
        .select('id')
        .eq('company_id', selectedCompanyId)
        .eq('fiscal_year', state.year)
        .order('created_at', { ascending: false })
        .limit(1);
      if (planError) throw planError;
      if (!plans || plans.length === 0) return [];

      // 2. Fetch budget rows for that plan
      const { data: rows, error: rowError } = await supabase
        .from('budget_rows')
        .select('account_number, account_name, jan, feb, mar, apr, maj, jun, jul, aug, sep, okt, nov, dec')
        .eq('budget_id', plans[0].id);
      if (rowError) throw rowError;
      if (!rows) return [];

      // 3. Aggregate relevant months into a single amount per account
      return rows.map(row => {
        const amount = budgetMonths.reduce((sum, m) => {
          const key = MONTH_KEYS[m - 1]; // budgetMonths is 1-indexed
          return sum + (Number((row as any)[key]) || 0);
        }, 0);
        return { account_number: row.account_number, account_name: row.account_name, amount };
      });
    },
    enabled: !!selectedCompanyId && state.mode !== 'actual',
  });

  // Build comparison rows + monthly trend
  const { rows, kpis, monthlyTrend } = useMemo(() => {
    if (!actualData) return { rows: [] as VarianceRow[], kpis: [] as KPIMetric[], monthlyTrend: [] as any[] };

    // Aggregate actual by account number
    const actualByAccount = new Map<string, { amount: number; name: string; type: string }>();
    // Monthly aggregation: month-index (0-11) -> { revenue, costs }
    const monthlyActual = new Map<number, { revenue: number; costs: number }>();

    for (const line of actualData) {
      const acc = (line as any).chart_of_accounts;
      const je = (line as any).journal_entries;
      if (!acc) continue;
      const num = parseInt(acc.account_number);
      if (num < 3000 || num > 8999) continue;
      const existing = actualByAccount.get(acc.account_number) || { amount: 0, name: acc.account_name, type: acc.account_type };
      const isIncome = acc.account_type === 'income' || acc.account_type === 'revenue';
      const delta = isIncome ? ((line.credit || 0) - (line.debit || 0)) : ((line.debit || 0) - (line.credit || 0));
      existing.amount += delta;
      actualByAccount.set(acc.account_number, existing);

      // Monthly bucket
      if (je?.entry_date) {
        const m = new Date(je.entry_date).getMonth();
        const bucket = monthlyActual.get(m) || { revenue: 0, costs: 0 };
        if (num >= 3000 && num <= 3999) bucket.revenue += delta;
        else bucket.costs += delta;
        monthlyActual.set(m, bucket);
      }
    }

    // Aggregate budget by account number
    const budgetByAccount = new Map<string, number>();
    if (budgetData) {
      for (const b of budgetData as { account_number: string; account_name: string; amount: number }[]) {
        if (!b.account_number) continue;
        const existing = budgetByAccount.get(b.account_number) || 0;
        budgetByAccount.set(b.account_number, existing + (b.amount || 0));
      }
    }

    // Build section rows
    const sections: VarianceRow[] = [];
    let totalRevenue = 0, totalRevenueComp = 0;
    let totalCosts = 0, totalCostsComp = 0;

    for (const section of PNL_SECTIONS) {
      let sectionActual = 0;
      let sectionComparison = 0;
      const children: VarianceRow[] = [];

      const accountsInRange = new Map<string, { actual: number; budget: number; name: string }>();

      for (const [accNum, data] of actualByAccount) {
        const num = parseInt(accNum);
        if (num >= section.range[0] && num <= section.range[1]) {
          accountsInRange.set(accNum, {
            actual: data.amount,
            budget: budgetByAccount.get(accNum) || 0,
            name: data.name,
          });
        }
      }
      for (const [accNum, amount] of budgetByAccount) {
        const num = parseInt(accNum);
        if (num >= section.range[0] && num <= section.range[1] && !accountsInRange.has(accNum)) {
          accountsInRange.set(accNum, { actual: 0, budget: amount, name: accNum });
        }
      }

      for (const [accNum, data] of accountsInRange) {
        const variance = section.isRevenue ? data.actual - data.budget : data.budget - data.actual;
        sectionActual += data.actual;
        sectionComparison += data.budget;

        if (Math.abs(data.actual) > 0 || Math.abs(data.budget) > 0) {
          children.push({
            id: accNum,
            label: `${accNum} ${data.name}`,
            level: 3,
            accountNumber: accNum,
            actual: data.actual,
            comparison: data.budget,
            varianceAmount: data.actual - data.budget,
            variancePercent: data.budget !== 0 ? ((data.actual - data.budget) / Math.abs(data.budget)) * 100 : null,
            isFavorable: variance >= 0,
            isRevenue: section.isRevenue,
          });
        }
      }

      children.sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));

      const sectionVariance = sectionActual - sectionComparison;
      const isFav = section.isRevenue ? sectionVariance >= 0 : sectionVariance <= 0;

      if (section.isRevenue) {
        totalRevenue += sectionActual;
        totalRevenueComp += sectionComparison;
      } else {
        totalCosts += sectionActual;
        totalCostsComp += sectionComparison;
      }

      sections.push({
        id: section.id,
        label: section.label,
        level: 1,
        actual: sectionActual,
        comparison: sectionComparison,
        varianceAmount: sectionVariance,
        variancePercent: sectionComparison !== 0 ? (sectionVariance / Math.abs(sectionComparison)) * 100 : null,
        isFavorable: isFav,
        isRevenue: section.isRevenue,
        children,
      });
    }

    const ebitActual = totalRevenue - totalCosts;
    const ebitComp = totalRevenueComp - totalCostsComp;
    const ebitVariance = ebitActual - ebitComp;

    sections.push({
      id: 'ebit',
      label: 'RÖRELSERESULTAT (EBIT)',
      level: 1,
      actual: ebitActual,
      comparison: ebitComp,
      varianceAmount: ebitVariance,
      variancePercent: ebitComp !== 0 ? (ebitVariance / Math.abs(ebitComp)) * 100 : null,
      isFavorable: ebitVariance >= 0,
      isRevenue: true,
    });

    const kpis: KPIMetric[] = [
      {
        label: 'Intäkter', actual: totalRevenue, comparison: totalRevenueComp,
        varianceAmount: totalRevenue - totalRevenueComp,
        variancePercent: totalRevenueComp !== 0 ? ((totalRevenue - totalRevenueComp) / Math.abs(totalRevenueComp)) * 100 : null,
        isFavorable: totalRevenue >= totalRevenueComp,
      },
      {
        label: 'Kostnader', actual: totalCosts, comparison: totalCostsComp,
        varianceAmount: totalCosts - totalCostsComp,
        variancePercent: totalCostsComp !== 0 ? ((totalCosts - totalCostsComp) / Math.abs(totalCostsComp)) * 100 : null,
        isFavorable: totalCosts <= totalCostsComp,
      },
      {
        label: 'EBIT', actual: ebitActual, comparison: ebitComp, varianceAmount: ebitVariance,
        variancePercent: ebitComp !== 0 ? (ebitVariance / Math.abs(ebitComp)) * 100 : null,
        isFavorable: ebitVariance >= 0,
      },
      {
        label: 'Nettoresultat', actual: ebitActual, comparison: ebitComp, varianceAmount: ebitVariance,
        variancePercent: ebitComp !== 0 ? (ebitVariance / Math.abs(ebitComp)) * 100 : null,
        isFavorable: ebitVariance >= 0,
      },
    ];

    // Build monthly trend across the period months covered
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
    const periodMonths = budgetMonths.map(m => m - 1); // 0-indexed

    // Budget per month per account: re-fetch month keys for proportion
    const MONTH_KEYS_LOCAL = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'] as const;
    // Compute monthly budget (revenue + costs) by re-summing budgetData if available
    const budgetMonthly = new Map<number, { revenue: number; costs: number }>();
    if (budgetData) {
      // budgetData lost per-month detail (already aggregated). Approximate even split:
      const monthsCount = budgetMonths.length || 1;
      for (const b of budgetData as { account_number: string; amount: number }[]) {
        const num = parseInt(b.account_number);
        const perMonth = (b.amount || 0) / monthsCount;
        for (const m of periodMonths) {
          const bucket = budgetMonthly.get(m) || { revenue: 0, costs: 0 };
          if (num >= 3000 && num <= 3999) bucket.revenue += perMonth;
          else if (num >= 4000 && num <= 8999) bucket.costs += perMonth;
          budgetMonthly.set(m, bucket);
        }
      }
    }

    const monthlyTrend = periodMonths.map(m => {
      const a = monthlyActual.get(m) || { revenue: 0, costs: 0 };
      const b = budgetMonthly.get(m);
      return {
        month: MONTH_NAMES[m],
        Intäkter: Math.round(a.revenue),
        Kostnader: Math.round(a.costs),
        EBIT: Math.round(a.revenue - a.costs),
        ...(b ? {
          BudgetIntäkter: Math.round(b.revenue),
          BudgetKostnader: Math.round(b.costs),
          BudgetEBIT: Math.round(b.revenue - b.costs),
        } : {}),
      };
    });

    return { rows: sections, kpis, monthlyTrend };
  }, [actualData, budgetData, budgetMonths]);

  const setMode = (mode: ComparisonMode) => setState(s => ({ ...s, mode }));
  const setPeriod = (period: PeriodPreset) => setState(s => ({ ...s, period }));
  const setYear = (year: number) => setState(s => ({ ...s, year }));
  const setMonth = (month: number) => setState(s => ({ ...s, month }));

  const isLoading = loadingActual || loadingBudget;
  const hasData = (actualData?.length ?? 0) > 0;
  const hasBudget = (budgetData?.length ?? 0) > 0;

  return {
    state,
    rows,
    kpis,
    monthlyTrend,
    isLoading,
    hasData,
    hasBudget,
    companyId: selectedCompanyId,
    dateRange,
    setMode,
    setPeriod,
    setYear,
    setMonth,
    setState,
  };
}
