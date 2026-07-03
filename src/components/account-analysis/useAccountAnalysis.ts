import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Company, AccountSummary } from './types';
import type { JournalEntryJoin, ChartOfAccountsJoin } from '@/types/database-extensions';
import { getAccountType, getAccountStatus } from './accountTypeUtils';
import { pickDefaultCompanyId } from '@/lib/company-selection';

const getAccountNormalSide = (accountNumber: string) => {
  const num = parseInt(accountNumber, 10);
  return (num >= 1000 && num <= 1999) || (num >= 4000 && num <= 7999) ? 'debit' : 'credit';
};

export function useAccountAnalysis() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCompany = searchParams.get('company');
  const requestedAccount = searchParams.get('account');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [accounts, setAccounts] = useState<{ id: string; account_number: string; account_name: string }[]>([]);
  const [fromDate, setFromDate] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [accountSummaries, setAccountSummaries] = useState<AccountSummary[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(requestedAccount || null);
  const [journalDetails, setJournalDetails] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      loadAccounts();
      loadAccountSummaries();
    }
  }, [selectedCompany, fromDate, toDate]);

  useEffect(() => {
    if (selectedAccount && selectedCompany) {
      loadJournalDetails(selectedAccount);
    }
  }, [selectedAccount, selectedCompany, fromDate, toDate]);

  const loadCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name');
    if (data?.length) {
      setCompanies(data);
      // URL `?company=…` wins, then header-active company, then alphabetical fallback.
      setSelectedCompany(pickDefaultCompanyId(data, requestedCompany));
    }
  };

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number, account_name')
      .eq('company_id', selectedCompany)
      .eq('is_active', true)
      .order('account_number');
    setAccounts(data || []);
  };

  const loadAccountSummaries = async () => {
    setLoadingData(true);
    try {
      const fromStr = format(fromDate, 'yyyy-MM-dd');
      const toStr = format(toDate, 'yyyy-MM-dd');
      const fiscalYearStart = new Date(fromDate.getFullYear(), 0, 1);
      const fiscalYearStartStr = format(fiscalYearStart, 'yyyy-MM-dd');

      const { data: preData } = await supabase
        .from('journal_entry_lines')
        .select(`debit, credit, chart_of_accounts!inner (account_number, account_name), journal_entries!inner (entry_date, status, company_id)`)
        .eq('journal_entries.company_id', selectedCompany)
        .in('journal_entries.status', ['approved', 'posted'])
        .lt('journal_entries.entry_date', fromStr);

      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`debit, credit, chart_of_accounts!inner (account_number, account_name), journal_entries!inner (entry_date, status, company_id)`)
        .eq('journal_entries.company_id', selectedCompany)
        .in('journal_entries.status', ['approved', 'posted'])
        .gte('journal_entries.entry_date', fromStr)
        .lte('journal_entries.entry_date', toStr);

      if (error) throw error;

      const map = new Map<string, AccountSummary>();
      const monthlyMap = new Map<string, Map<number, number>>();
      const txCountMap = new Map<string, number>();
      const largestTxMap = new Map<string, number>();

      const ensureAccount = (acc: any) => {
        const key = acc.account_number;
        if (!map.has(key)) {
          const accountType = getAccountType(key);
          map.set(key, {
            accountNumber: acc.account_number,
            accountName: acc.account_name,
            openingBalance: 0,
            periodDebit: 0,
            periodCredit: 0,
            periodIncrease: 0,
            periodDecrease: 0,
            netChange: 0,
            closingBalance: 0,
            monthlyTrend: new Array(12).fill(0),
            pctChange: 0,
            hasAnomaly: false,
            transactionCount: 0,
            largestTransaction: 0,
            accountType,
          });
          monthlyMap.set(key, new Map());
          txCountMap.set(key, 0);
          largestTxMap.set(key, 0);
        }
        return map.get(key)!;
      };

      for (const line of preData || []) {
        const acc = line.chart_of_accounts as ChartOfAccountsJoin | null;
        if (!acc) continue;
        const s = ensureAccount(acc);
        const accNum = parseInt(acc.account_number, 10);
        const isPnL = accNum >= 3000 && accNum <= 8999;
        if (isPnL) {
          const entryDate = (line.journal_entries as JournalEntryJoin | null)?.entry_date;
          if (entryDate && entryDate < fiscalYearStartStr) continue;
        }
        const isDebitNormal = getAccountNormalSide(acc.account_number) === 'debit';
        if (isDebitNormal) {
          s.openingBalance += (line.debit || 0) - (line.credit || 0);
        } else {
          s.openingBalance += (line.credit || 0) - (line.debit || 0);
        }
      }

      for (const line of data || []) {
        const acc = line.chart_of_accounts as ChartOfAccountsJoin | null;
        if (!acc) continue;
        const s = ensureAccount(acc);
        s.periodDebit += line.debit || 0;
        s.periodCredit += line.credit || 0;
        txCountMap.set(acc.account_number, (txCountMap.get(acc.account_number) || 0) + 1);

        const txAmount = Math.max(line.debit || 0, line.credit || 0);
        const currentLargest = largestTxMap.get(acc.account_number) || 0;
        if (txAmount > currentLargest) largestTxMap.set(acc.account_number, txAmount);

        const entryDate = (line.journal_entries as JournalEntryJoin | null)?.entry_date;
        if (entryDate) {
          const month = new Date(entryDate).getMonth();
          const mm = monthlyMap.get(acc.account_number)!;
          const isDebitNormal = getAccountNormalSide(acc.account_number) === 'debit';
          const delta = isDebitNormal
            ? (line.debit || 0) - (line.credit || 0)
            : (line.credit || 0) - (line.debit || 0);
          mm.set(month, (mm.get(month) || 0) + delta);
        }
      }

      for (const s of map.values()) {
        const isDebitNormal = getAccountNormalSide(s.accountNumber) === 'debit';
        s.closingBalance = isDebitNormal
          ? s.openingBalance + s.periodDebit - s.periodCredit
          : s.openingBalance + s.periodCredit - s.periodDebit;
        s.transactionCount = txCountMap.get(s.accountNumber) || 0;
        s.largestTransaction = largestTxMap.get(s.accountNumber) || 0;

        // Compute increase/decrease based on normal side
        if (isDebitNormal) {
          s.periodIncrease = s.periodDebit;
          s.periodDecrease = s.periodCredit;
        } else {
          s.periodIncrease = s.periodCredit;
          s.periodDecrease = s.periodDebit;
        }
        s.netChange = s.closingBalance - s.openingBalance;

        const mm = monthlyMap.get(s.accountNumber)!;
        let cumulative = s.openingBalance;
        for (let m = 0; m < 12; m++) {
          cumulative += mm.get(m) || 0;
          s.monthlyTrend[m] = cumulative;
        }

        if (s.openingBalance !== 0) {
          s.pctChange = ((s.closingBalance - s.openingBalance) / Math.abs(s.openingBalance)) * 100;
        } else if (s.closingBalance !== 0) {
          s.pctChange = 100;
        }

        s.status = getAccountStatus(s);
      }

      setAccountSummaries(
        Array.from(map.values()).sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadJournalDetails = async (accountNumber: string) => {
    try {
      const fromStr = format(fromDate, 'yyyy-MM-dd');
      const toStr = format(toDate, 'yyyy-MM-dd');
      const accNum = parseInt(accountNumber, 10);
      const isPnL = accNum >= 3000 && accNum <= 8999;
      const fiscalYearStart = new Date(fromDate.getFullYear(), 0, 1);

      const openingQuery = supabase
        .from('journal_entry_lines')
        .select(`debit, credit, journal_entries!inner (entry_date, status, company_id), chart_of_accounts!inner (account_number)`)
        .eq('chart_of_accounts.account_number', accountNumber)
        .eq('journal_entries.company_id', selectedCompany)
        .in('journal_entries.status', ['approved', 'posted'])
        .lt('journal_entries.entry_date', fromStr);

      if (isPnL) {
        openingQuery.gte('journal_entries.entry_date', format(fiscalYearStart, 'yyyy-MM-dd'));
      }

      const { data: openingData } = await openingQuery;

      // 1) Lines whose ENTRY DATE falls in the period (standard view)
      const { data: byEntryDate, error } = await supabase
        .from('journal_entry_lines')
        .select(`id, debit, credit, journal_entry_id, journal_entries!inner (id, entry_date, description, journal_number, status, company_id, document_id, created_by, created_at), chart_of_accounts!inner (account_number)`)
        .eq('chart_of_accounts.account_number', accountNumber)
        .eq('journal_entries.company_id', selectedCompany)
        .in('journal_entries.status', ['approved', 'posted'])
        .gte('journal_entries.entry_date', fromStr)
        .lte('journal_entries.entry_date', toStr)
        .order('journal_entries(entry_date)', { ascending: true })
        .limit(1000);

      if (error) throw error;

      // 2) Lines whose CREATED_AT falls in the period but entry_date does NOT
      //    (accruals booked in advance/after, e.g. upplupna intäkter, förbokade transaktioner)
      const fromIso = `${fromStr}T00:00:00`;
      const toIso = `${toStr}T23:59:59`;
      const { data: byCreatedAt } = await supabase
        .from('journal_entry_lines')
        .select(`id, debit, credit, journal_entry_id, journal_entries!inner (id, entry_date, description, journal_number, status, company_id, document_id, created_by, created_at), chart_of_accounts!inner (account_number)`)
        .eq('chart_of_accounts.account_number', accountNumber)
        .eq('journal_entries.company_id', selectedCompany)
        .in('journal_entries.status', ['approved', 'posted'])
        .gte('journal_entries.created_at', fromIso)
        .lte('journal_entries.created_at', toIso)
        .or(`entry_date.lt.${fromStr},entry_date.gt.${toStr}`, { foreignTable: 'journal_entries' })
        .limit(500);

      // Merge & dedupe by line id
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const l of [...(byEntryDate || []), ...(byCreatedAt || [])]) {
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        merged.push(l);
      }
      const data = merged;

      const entryIds = [...new Set(data.map((l: any) => l.journal_entries?.id).filter(Boolean))];
      const counterAccountMap: Record<string, string[]> = {};
      if (entryIds.length > 0) {
        for (let i = 0; i < entryIds.length; i += 100) {
          const batch = entryIds.slice(i, i + 100);
          const { data: allLines } = await supabase
            .from('journal_entry_lines')
            .select('journal_entry_id, chart_of_accounts(account_number)')
            .in('journal_entry_id', batch);
          for (const line of allLines || []) {
            const je = line.journal_entry_id;
            const acc = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number;
            if (je && acc && acc !== accountNumber) {
              if (!counterAccountMap[je]) counterAccountMap[je] = [];
              if (!counterAccountMap[je].includes(acc)) counterAccountMap[je].push(acc);
            }
          }
        }
      }

      const isDebitNormal = getAccountNormalSide(accountNumber) === 'debit';
      const openingBalance = (openingData || []).reduce((sum, line: any) => {
        const delta = (line.debit || 0) - (line.credit || 0);
        return sum + (isDebitNormal ? delta : -delta);
      }, 0);

      let running = openingBalance;

      // Build details with virtual opening row
      const details: any[] = [];

      // Virtual opening balance row
      details.push({
        id: '__opening__',
        entry_date: format(fromDate, 'yyyy-MM-dd'),
        description: 'Ingående saldo',
        journal_number: '',
        journal_entry_id: '',
        debit: 0,
        credit: 0,
        runningBalance: openingBalance,
        counterAccounts: [],
        isVirtualRow: true,
        virtualRowType: 'opening',
      });

      // Sort merged data by entry_date so the running balance is stable
      const sortedData = [...data].sort((a: any, b: any) => {
        const ad = a.journal_entries?.entry_date || '';
        const bd = b.journal_entries?.entry_date || '';
        return ad.localeCompare(bd);
      });

      for (const line of sortedData) {
        const d = line.debit || 0;
        const c = line.credit || 0;
        const jeId = (line as any).journal_entries?.id || '';
        running += isDebitNormal ? d - c : c - d;

        const je = (line as any).journal_entries;
        let createdBy: 'ai' | 'manual' | 'import' | 'bank_sync' = 'manual';
        if (je?.created_by) {
          const cb = je.created_by.toLowerCase();
          if (cb.includes('ai') || cb.includes('agent')) createdBy = 'ai';
          else if (cb.includes('import') || cb.includes('sie')) createdBy = 'import';
          else if (cb.includes('bank')) createdBy = 'bank_sync';
        }

        // Flag entries booked in period but with entry_date outside (accruals / prebooked)
        const entryDate = je?.entry_date || '';
        const isOutsideEntryPeriod = !!entryDate && (entryDate < fromStr || entryDate > toStr);

        details.push({
          id: line.id,
          entry_date: entryDate,
          description: je?.description || '—',
          journal_number: je?.journal_number || '—',
          journal_entry_id: jeId,
          debit: d,
          credit: c,
          runningBalance: running,
          counterAccounts: counterAccountMap[jeId] || [],
          documentAttached: !!je?.document_id,
          createdBy,
          bookedAt: je?.created_at || null,
          isAccrualOutsidePeriod: isOutsideEntryPeriod,
        });
      }

      // Virtual closing balance row
      const totalDebit = (data || []).reduce((s: number, l: any) => s + (l.debit || 0), 0);
      const totalCredit = (data || []).reduce((s: number, l: any) => s + (l.credit || 0), 0);
      details.push({
        id: '__closing__',
        entry_date: format(toDate, 'yyyy-MM-dd'),
        description: 'Utgående saldo',
        journal_number: '',
        journal_entry_id: '',
        debit: totalDebit,
        credit: totalCredit,
        runningBalance: running,
        counterAccounts: [],
        isVirtualRow: true,
        virtualRowType: 'closing',
      });

      setJournalDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedAccountSummary = useMemo(
    () => accountSummaries.find((a) => a.accountNumber === selectedAccount) || null,
    [accountSummaries, selectedAccount]
  );

  return {
    user,
    authLoading,
    companies,
    selectedCompany,
    setSelectedCompany,
    accounts,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    accountSummaries,
    selectedAccount,
    setSelectedAccount,
    selectedAccountSummary,
    journalDetails,
    loadingData,
  };
}
