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

export type SecuritiesStatement = Database['public']['Tables']['securities_statements']['Row'];

export function useSecuritiesStatements(accountId?: string) {
  const companyId = useSelectedCompanyId();
  return useQuery({
    queryKey: ['securities_statements', companyId, accountId],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase.from('securities_statements').select('*').eq('company_id', companyId);
      if (accountId) q = q.eq('securities_account_id', accountId);
      const { data, error } = await q.order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SecuritiesStatement[];
    },
    enabled: !!companyId,
  });
}

export function useUploadStatement() {
  const companyId = useSelectedCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      securities_account_id?: string | null;
      statement_type?: 'annual' | 'transaction' | 'dividend' | 'k4' | 'other';
      source?: 'pdf' | 'csv' | 'sru' | 'manual';
    }) => {
      if (!companyId) throw new Error('Inget bolag valt');
      const ts = Date.now();
      const safe = input.file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${companyId}/${ts}_${safe}`;

      const { error: upErr } = await supabase.storage
        .from('securities-statements')
        .upload(path, input.file, { upsert: false, contentType: input.file.type || 'application/octet-stream' });
      if (upErr) throw upErr;

      const inferredSource: 'pdf' | 'csv' | 'sru' | 'manual' =
        input.source ??
        (input.file.name.toLowerCase().endsWith('.pdf') ? 'pdf'
        : input.file.name.toLowerCase().endsWith('.sru') ? 'sru'
        : 'csv');

      const { data: row, error } = await supabase
        .from('securities_statements')
        .insert({
          company_id: companyId,
          securities_account_id: input.securities_account_id ?? null,
          file_name: input.file.name,
          storage_path: path,
          statement_type: input.statement_type ?? 'other',
          source: inferredSource,
          parse_status: inferredSource === 'pdf' ? 'pending' : 'parsed',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return row as SecuritiesStatement;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['securities_statements'] });
      toast.success('Källdokument uppladdat');
    },
    onError: (e: Error) => toast.error(`Uppladdning misslyckades: ${e.message}`),
  });
}

export function useDeleteStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (statement: SecuritiesStatement) => {
      await supabase.storage.from('securities-statements').remove([statement.storage_path]);
      const { error } = await supabase.from('securities_statements').delete().eq('id', statement.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['securities_statements'] });
      toast.success('Källdokument borttaget');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function getStatementSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('securities-statements')
    .createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}
