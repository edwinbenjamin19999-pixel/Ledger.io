import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MONTH_KEYS } from '@/lib/budget/budgetEngine';
import { toast } from 'sonner';

const MONTH_KEY_MAP: Record<number, string> = {
  1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr', 5: 'maj', 6: 'jun',
  7: 'jul', 8: 'aug', 9: 'sep', 10: 'okt', 11: 'nov', 12: 'dec',
};

export function useGenerateAIBudget() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      budgetId: string;
      companyId: string;
      growthRate: number;
      year: number;
    }) => {
      const prevYear = params.year - 1;

      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number, account_name')
        .eq('company_id', params.companyId);
      const acctMap = new Map((accounts ?? []).map((a: Record<string, unknown>) => [a.id as string, a]));

      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, entry_date, journal_entry_lines(account_id, debit, credit)')
        .eq('company_id', params.companyId)
        .eq('status', 'approved')
        .gte('entry_date', `${prevYear}-01-01`)
        .lte('entry_date', `${prevYear}-12-31`);

      const monthlyByAccount: Record<string, Record<string, number>> = {};
      for (const entry of entries ?? []) {
        const month = parseInt(entry.entry_date?.slice(5, 7) ?? '0');
        const monthKey = MONTH_KEY_MAP[month];
        if (!monthKey) continue;

        for (const line of (entry as unknown as { journal_entry_lines: Record<string, unknown>[] }).journal_entry_lines ?? []) {
          const acct = acctMap.get(line.account_id as string) as Record<string, unknown> | undefined;
          if (!acct) continue;
          const accNum = acct.account_number as string;
          if (!monthlyByAccount[accNum]) monthlyByAccount[accNum] = {};
          const numAcc = parseInt(accNum);
          const value = numAcc >= 4000 && numAcc <= 8999
            ? Number(line.debit ?? 0) - Number(line.credit ?? 0)
            : Number(line.credit ?? 0) - Number(line.debit ?? 0);
          monthlyByAccount[accNum][monthKey] = (monthlyByAccount[accNum][monthKey] ?? 0) + value;
        }
      }

      const growthFactor = 1 + (params.growthRate / 100);
      const budgetRows: Record<string, unknown>[] = [];

      for (const [accNum, months] of Object.entries(monthlyByAccount)) {
        const acctInfo = (accounts ?? []).find((a) => a.account_number === accNum);
        const row: Record<string, unknown> = {
          budget_id: params.budgetId,
          account_number: accNum,
          account_name: acctInfo?.account_name ?? `Konto ${accNum}`,
          ai_generated: true,
          manually_adjusted: false,
        };
        let total = 0;
        for (const mk of MONTH_KEYS) {
          const val = Math.round((months[mk] ?? 0) * growthFactor);
          row[mk] = val;
          total += val;
        }
        row.annual_total = total;
        budgetRows.push(row);
      }

      if (budgetRows.length === 0) {
        const defaults = [
          { num: '3001', name: 'Försäljning varor' },
          { num: '4010', name: 'Inköp varor och material' },
          { num: '5010', name: 'Lokalhyra' },
          { num: '7010', name: 'Löner tjänstemän' },
          { num: '7510', name: 'Arbetsgivaravgifter' },
          { num: '6110', name: 'Kontorsmaterial' },
        ];
        for (const d of defaults) {
          const row: Record<string, unknown> = {
            budget_id: params.budgetId,
            account_number: d.num,
            account_name: d.name,
            ai_generated: true,
            manually_adjusted: false,
            annual_total: 0,
          };
          for (const mk of MONTH_KEYS) row[mk] = 0;
          budgetRows.push(row);
        }
      }

      await supabase.from('budget_rows')
        .delete()
        .eq('budget_id', params.budgetId)
        .eq('ai_generated', true);

      const { error } = await supabase.from('budget_rows')
        .insert(budgetRows as any[]);
      if (error) throw error;

      await supabase.from('budget_plans')
        .update({ status: 'ai_generated', updated_at: new Date().toISOString() })
        .eq('id', params.budgetId);

      return { linesCreated: budgetRows.length, prevYear };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "AI-budgetering misslyckades. Kontrollera att det finns historisk bokföringsdata och försök igen.");
    },
  });
}

export function useUpdateBudgetVsActual() {
  return useMutation({
    mutationFn: async ({ budgetId, companyId, year }: { budgetId: string; companyId: string; year: number }) => {
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number')
        .eq('company_id', companyId);
      const acctMap = new Map((accounts ?? []).map((a) => [a.id, a.account_number]));

      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, entry_date, journal_entry_lines(account_id, debit, credit)')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .gte('entry_date', `${year}-01-01`)
        .lte('entry_date', `${year}-12-31`);

      const actualMap: Record<string, Record<string, number>> = {};
      for (const entry of entries ?? []) {
        const month = parseInt(entry.entry_date?.slice(5, 7) ?? '0');
        const monthKey = MONTH_KEY_MAP[month];
        if (!monthKey) continue;
        for (const line of (entry as unknown as { journal_entry_lines: Record<string, unknown>[] }).journal_entry_lines ?? []) {
          const accNum = acctMap.get(line.account_id as string);
          if (!accNum) continue;
          if (!actualMap[accNum]) actualMap[accNum] = {};
          const numAcc = parseInt(accNum);
          const value = numAcc >= 4000 && numAcc <= 8999
            ? Number(line.debit ?? 0) - Number(line.credit ?? 0)
            : Number(line.credit ?? 0) - Number(line.debit ?? 0);
          actualMap[accNum][monthKey] = (actualMap[accNum][monthKey] ?? 0) + value;
        }
      }

      return { actualMap };
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunde inte hämta utfallsdata");
    },
  });
}

export function calculateBreakEven(rows: Record<string, unknown>[]) {
  const revenue = rows
    .filter((r) => (r.account_number as string) >= '3000' && (r.account_number as string) <= '3999')
    .reduce((s: number, r) => s + MONTH_KEYS.reduce((ms: number, m: string) => ms + (Number(r[m]) || 0), 0), 0);

  const fixedCosts = rows
    .filter((r) => (r.account_number as string) >= '5000' && (r.account_number as string) <= '6999')
    .reduce((s: number, r) => s + MONTH_KEYS.reduce((ms: number, m: string) => ms + (Number(r[m]) || 0), 0), 0);

  const variableCosts = rows
    .filter((r) => (r.account_number as string) >= '4000' && (r.account_number as string) <= '4999')
    .reduce((s: number, r) => s + MONTH_KEYS.reduce((ms: number, m: string) => ms + (Number(r[m]) || 0), 0), 0);

  const variableCostRate = revenue > 0 ? variableCosts / revenue : 0;
  const breakEven = variableCostRate < 1 ? fixedCosts / (1 - variableCostRate) : 0;

  return { fixedCosts, variableCosts, variableCostRate, breakEven, revenue };
}
