import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChartOfAccountsJoin } from '@/types/database-extensions';

function useCompanyId() {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('selected_company_id') : null;
  return raw ? raw.replace(/"/g, '') : null;
}

export interface ConsolidationCompanyData {
  id: string;
  name: string;
  org_number: string;
  revenue: number;
  costs: number;
  assets: number;
  equity: number;
}

export function useConsolidationData() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['consolidation-overview', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // Get all companies in the same group, or just this company
      const { data: currentCompany } = await supabase
        .from('companies')
        .select('id, name, org_number, group_id')
        .eq('id', companyId!)
        .maybeSingle();

      if (!currentCompany) return { companies: [], totals: null, hasData: false };

      let companies: { id: string; name: string; org_number: string }[] = [];

      if (currentCompany.group_id) {
        const { data: groupCompanies } = await supabase
          .from('companies')
          .select('id, name, org_number')
          .eq('group_id', currentCompany.group_id)
          .order('name');
        companies = groupCompanies ?? [];
      } else {
        companies = [{ id: currentCompany.id, name: currentCompany.name, org_number: currentCompany.org_number }];
      }

      const companyIds = companies.map(c => c.id);
      if (companyIds.length === 0) return { companies: [], totals: null, hasData: false };

      // Get approved journal entries for these companies
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, company_id')
        .in('company_id', companyIds)
        .eq('status', 'approved');

      const entryIds = (entries ?? []).map(e => e.id);
      const entryCompanyMap = new Map((entries ?? []).map(e => [e.id, e.company_id]));

      if (entryIds.length === 0) {
        return {
          companies: companies.map(c => ({ ...c, revenue: 0, costs: 0, assets: 0, equity: 0 })),
          totals: { revenue: 0, costs: 0, assets: 0, equity: 0 },
          hasData: false,
        };
      }

      // Fetch lines in batches if needed
      const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select('journal_entry_id, debit, credit, account_id, chart_of_accounts!inner(account_number)')
        .in('journal_entry_id', entryIds.slice(0, 500));

      // Aggregate per company
      const byCompany: Record<string, { revenue: number; costs: number; assets: number; equity: number }> = {};
      for (const cid of companyIds) {
        byCompany[cid] = { revenue: 0, costs: 0, assets: 0, equity: 0 };
      }

      for (const line of lines ?? []) {
        const cid = entryCompanyMap.get(line.journal_entry_id);
        if (!cid || !byCompany[cid]) continue;

        const accNum = parseInt((line.chart_of_accounts as ChartOfAccountsJoin)?.account_number ?? '0');
        const d = Number(line.debit ?? 0);
        const c = Number(line.credit ?? 0);

        if (accNum >= 3000 && accNum <= 3999) byCompany[cid].revenue += c - d;
        else if (accNum >= 4000 && accNum <= 8999) byCompany[cid].costs += d - c;
        else if (accNum >= 1000 && accNum <= 1999) byCompany[cid].assets += d - c;
        else if (accNum >= 2000 && accNum <= 2099) byCompany[cid].equity += c - d;
      }

      const companyData: ConsolidationCompanyData[] = companies.map(c => ({
        ...c,
        ...(byCompany[c.id] ?? { revenue: 0, costs: 0, assets: 0, equity: 0 }),
      }));

      const totals = companyData.reduce(
        (acc, c) => ({
          revenue: acc.revenue + c.revenue,
          costs: acc.costs + c.costs,
          assets: acc.assets + c.assets,
          equity: acc.equity + c.equity,
        }),
        { revenue: 0, costs: 0, assets: 0, equity: 0 }
      );

      const hasData = (lines ?? []).length > 0;

      return { companies: companyData, totals, hasData };
    },
  });
}
