import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function getCompanyId() {
  return localStorage.getItem('selectedCompanyId');
}

interface WithdrawalParams {
  amount: number;
  date: string;
  description: string;
  type: 'withdrawal' | 'dividend' | 'salary';
}

/**
 * Creates a real journal entry for owner withdrawals, dividends or salary.
 * 
 * Account mapping:
 * - withdrawal → Debit 2018 (Egna uttag), Credit 1930 (Bank)
 * - dividend  → Debit 2098 (Utdelning), Credit 1930 (Bank)
 * - salary    → Debit 7010 (Löner), Credit 1930 (Bank)
 */
export function useCreateOwnerWithdrawal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: WithdrawalParams) => {
      const companyId = getCompanyId();
      if (!companyId) throw new Error('Inget företag valt');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Ej inloggad');

      // Map type to BAS account numbers
      let debitAccountNumber: string;
      let seriesCode: string;
      let descPrefix: string;

      switch (params.type) {
        case 'withdrawal':
          debitAccountNumber = '2018';
          seriesCode = 'B';
          descPrefix = 'Eget uttag';
          break;
        case 'dividend':
          debitAccountNumber = '2098';
          seriesCode = 'B';
          descPrefix = 'Utdelning';
          break;
        case 'salary':
          debitAccountNumber = '7010';
          seriesCode = 'LN';
          descPrefix = 'Löneutbetalning';
          break;
      }

      // Resolve account UUIDs from chart_of_accounts
      const { data: accounts, error: accError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number')
        .eq('company_id', companyId)
        .in('account_number', [debitAccountNumber, '1930']);

      if (accError) throw accError;

      const debitAccount = accounts?.find(a => a.account_number === debitAccountNumber);
      const creditAccount = accounts?.find(a => a.account_number === '1930');

      if (!debitAccount || !creditAccount) {
        throw new Error(
          `Kontoplanen saknar konto ${!debitAccount ? debitAccountNumber : '1930'}. Lägg till kontot först.`
        );
      }

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_date: params.date,
          description: params.description || `${descPrefix} ${params.date}`,
          status: 'approved' as const,
          created_by: user.user.id,
          series_code: seriesCode,
        })
        .select('id')
        .maybeSingle();

      if (entryError) throw entryError;
      if (!entry) throw new Error('Kunde inte skapa verifikation — försök igen.');

      // Create lines (debit + credit)
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert([
          {
            journal_entry_id: entry.id,
            account_id: debitAccount.id,
            debit: params.amount,
            credit: 0,
          },
          {
            journal_entry_id: entry.id,
            account_id: creditAccount.id,
            debit: 0,
            credit: params.amount,
          },
        ]);

      if (linesError) throw linesError;

      return entry;
    },
    onSuccess: () => {
      // Invalidate all related queries
      const companyId = getCompanyId();
      qc.invalidateQueries({ queryKey: ['equity-balance'] });
      qc.invalidateQueries({ queryKey: ['owner-withdrawals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      toast.error('Kunde inte bokföra uttag', { description: error.message });
    },
  });
}

/**
 * Hook to fetch actual salary totals from journal_entry_lines for the current year.
 * Used to pre-fill GransbeloppsCalculator and SalaryDividendComparison.
 */
export async function fetchSalaryAndProfitData(companyId: string) {
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;

  // Get account map
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_number')
    .eq('company_id', companyId);

  if (!accounts) return null;

  const accountMap = new Map<string, string>();
  accounts.forEach(a => accountMap.set(a.id, a.account_number));

  // Get all approved/posted lines for this year
  const { data: lines } = await supabase
    .from('journal_entry_lines')
    .select('debit, credit, account_id, journal_entries!inner(company_id, entry_date, status)')
    .eq('journal_entries.company_id', companyId)
    .in('journal_entries.status', ['approved', 'posted'])
    .gte('journal_entries.entry_date', yearStart);

  if (!lines) return null;

  let totalSalary = 0; // konto 7010-7019
  let income = 0;       // klass 3
  let expenses = 0;     // klass 4-8

  for (const line of lines) {
    const acctNum = accountMap.get(line.account_id) || '';
    const acctInt = parseInt(acctNum, 10);
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;

    // Salary accounts
    if (acctInt >= 7010 && acctInt <= 7019) {
      totalSalary += debit - credit;
    }

    // Income
    if (acctInt >= 3000 && acctInt <= 3999) {
      income += credit - debit;
    }

    // Expenses
    if (acctInt >= 4000 && acctInt <= 8999) {
      expenses += debit - credit;
    }
  }

  return {
    totalSalary,
    income,
    expenses,
    profit: income - expenses,
  };
}
