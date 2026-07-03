import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

function useSelectedCompanyId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setId(localStorage.getItem('selectedCompanyId'));
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);
  return id;
}

export type SecuritiesAccount = Database['public']['Tables']['securities_accounts']['Row'];
export type SecuritiesAccountInsert = Database['public']['Tables']['securities_accounts']['Insert'];
export type SecuritiesHolding = Database['public']['Tables']['securities_holdings']['Row'];
export type SecuritiesTransaction = Database['public']['Tables']['securities_transactions']['Row'];
export type SecuritiesTransactionInsert = Database['public']['Tables']['securities_transactions']['Insert'];
export type SecuritiesTaxCalc = Database['public']['Tables']['securities_tax_calculations']['Row'];

export type AccountType = 'isk' | 'kf' | 'af' | 'depot_ab';
export type Broker = 'nordnet' | 'avanza' | 'seb' | 'handelsbanken' | 'swedbank' | 'nordea' | 'other';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  isk: 'ISK — Investeringssparkonto',
  kf: 'KF — Kapitalförsäkring',
  af: 'AF — Aktie- & fondkonto',
  depot_ab: 'Depå i AB',
};

export const ACCOUNT_TYPE_SHORT: Record<AccountType, string> = {
  isk: 'ISK',
  kf: 'KF',
  af: 'AF',
  depot_ab: 'Depå AB',
};

export const BROKER_LABEL: Record<Broker, string> = {
  nordnet: 'Nordnet',
  avanza: 'Avanza',
  seb: 'SEB',
  handelsbanken: 'Handelsbanken',
  swedbank: 'Swedbank',
  nordea: 'Nordea',
  other: 'Annan',
};

export function useSecuritiesAccounts() {
  const selectedCompanyId = useSelectedCompanyId();
  return useQuery({
    queryKey: ['securities_accounts', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('securities_accounts')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SecuritiesAccount[];
    },
    enabled: !!selectedCompanyId,
  });
}

export function useSecuritiesHoldings(accountId?: string) {
  const selectedCompanyId = useSelectedCompanyId();
  return useQuery({
    queryKey: ['securities_holdings', selectedCompanyId, accountId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      let query = supabase
        .from('securities_holdings')
        .select('*')
        .eq('company_id', selectedCompanyId);
      if (accountId) query = query.eq('securities_account_id', accountId);
      const { data, error } = await query.order('current_value', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SecuritiesHolding[];
    },
    enabled: !!selectedCompanyId,
  });
}

export function useSecuritiesTransactions(accountId?: string) {
  const selectedCompanyId = useSelectedCompanyId();
  return useQuery({
    queryKey: ['securities_transactions', selectedCompanyId, accountId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      let query = supabase
        .from('securities_transactions')
        .select('*')
        .eq('company_id', selectedCompanyId);
      if (accountId) query = query.eq('securities_account_id', accountId);
      const { data, error } = await query.order('trade_date', { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as SecuritiesTransaction[];
    },
    enabled: !!selectedCompanyId,
  });
}

export function useCreateSecuritiesAccount() {
  const selectedCompanyId = useSelectedCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SecuritiesAccountInsert, 'company_id'>) => {
      if (!selectedCompanyId) throw new Error('Inget bolag valt');
      const { data, error } = await supabase
        .from('securities_accounts')
        .insert({ ...input, company_id: selectedCompanyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['securities_accounts'] });
      toast.success('Depå skapad');
    },
    onError: (e: Error) => toast.error(`Kunde inte skapa depå: ${e.message}`),
  });
}

export function useCreateSecuritiesTransaction() {
  const selectedCompanyId = useSelectedCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SecuritiesTransactionInsert, 'company_id'>) => {
      if (!selectedCompanyId) throw new Error('Inget bolag valt');
      const { data, error } = await supabase
        .from('securities_transactions')
        .insert({ ...input, company_id: selectedCompanyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['securities_transactions'] });
      qc.invalidateQueries({ queryKey: ['securities_holdings'] });
      toast.success('Transaktion sparad');
    },
    onError: (e: Error) => toast.error(`Kunde inte spara: ${e.message}`),
  });
}
