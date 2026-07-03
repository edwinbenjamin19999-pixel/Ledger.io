import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SecuritiesTransaction } from '@/hooks/useSecurities';

export type ReviewStatus = 'draft' | 'needs_review' | 'reviewed' | 'posted' | 'rejected';

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

export function useReviewQueue(filter?: ReviewStatus) {
  const companyId = useSelectedCompanyId();
  return useQuery({
    queryKey: ['securities_review_queue', companyId, filter ?? 'all'],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase
        .from('securities_transactions')
        .select('*')
        .eq('company_id', companyId);
      if (filter) q = q.eq('review_status', filter);
      const { data, error } = await q
        .order('trade_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SecuritiesTransaction[];
    },
    enabled: !!companyId,
  });
}

export function useReviewQueueCounts() {
  const companyId = useSelectedCompanyId();
  return useQuery({
    queryKey: ['securities_review_counts', companyId],
    queryFn: async () => {
      if (!companyId) return { needs_review: 0, reviewed: 0, posted: 0, draft: 0 };
      const { data, error } = await supabase
        .from('securities_transactions')
        .select('review_status')
        .eq('company_id', companyId);
      if (error) throw error;
      const counts = { needs_review: 0, reviewed: 0, posted: 0, draft: 0, rejected: 0 } as Record<string, number>;
      for (const r of data ?? []) counts[r.review_status as string] = (counts[r.review_status as string] ?? 0) + 1;
      return counts;
    },
    enabled: !!companyId,
    refetchInterval: 30_000,
  });
}

export function useUpdateReviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; status: ReviewStatus; reason?: string }) => {
      const { error } = await supabase
        .from('securities_transactions')
        .update({
          review_status: input.status,
          ...(input.reason ? { ambiguity_notes: input.reason } : {}),
        })
        .in('id', input.ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['securities_review_queue'] });
      qc.invalidateQueries({ queryKey: ['securities_review_counts'] });
      qc.invalidateQueries({ queryKey: ['securities_transactions'] });
      toast.success(`${vars.ids.length} transaktion(er) uppdaterade`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkInsertTransactions() {
  const companyId = useSelectedCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<Record<string, unknown>>) => {
      if (!companyId) throw new Error('Inget bolag valt');
      const payload = rows.map(r => ({ ...r, company_id: companyId }));
      const { data, error } = await supabase
        .from('securities_transactions')
        .insert(payload as never)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['securities_transactions'] });
      qc.invalidateQueries({ queryKey: ['securities_review_queue'] });
      qc.invalidateQueries({ queryKey: ['securities_review_counts'] });
      qc.invalidateQueries({ queryKey: ['securities_holdings'] });
      toast.success(`${data?.length ?? 0} transaktioner importerade`);
    },
    onError: (e: Error) => toast.error(`Import misslyckades: ${e.message}`),
  });
}
