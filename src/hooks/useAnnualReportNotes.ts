import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Persist annual report notes in the annual_reports table's `notes` JSON column.
 * Upserts on (company_id, fiscal_year).
 */
export function useAnnualReportNotes(companyId: string | null, year: number) {
  return useQuery({
    queryKey: ['annual-report-notes', companyId, year],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('annual_reports')
        .select('notes')
        .eq('company_id', companyId!)
        .eq('fiscal_year', year)
        .maybeSingle();
      return ((data?.notes as Record<string, string> | null) ?? {}) as Record<string, string>;
    },
  });
}

export function useSaveAnnualReportNote(companyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, noteKey, content }: { year: number; noteKey: string; content: string }) => {
      if (!companyId) throw new Error('Inget bolag valt');

      // Get existing notes
      const { data: existing } = await supabase
        .from('annual_reports')
        .select('id, notes')
        .eq('company_id', companyId)
        .eq('fiscal_year', year)
        .maybeSingle();

      const currentNotes = ((existing?.notes as Record<string, string> | null) ?? {}) as Record<string, string>;
      currentNotes[noteKey] = content;

      if (existing) {
        const { error } = await supabase
          .from('annual_reports')
          .update({ notes: currentNotes as Record<string, string>, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('annual_reports')
          .insert({
            company_id: companyId,
            fiscal_year: year,
            fiscal_year_start: `${year}-01-01`,
            fiscal_year_end: `${year}-12-31`,
            notes: currentNotes as Record<string, string>,
            status: 'draft',
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { year }) => qc.invalidateQueries({ queryKey: ['annual-report-notes', companyId, year] }),
    onError: (error: Error) => {
      toast.error(error.message || "Noten kunde inte sparas");
    },
  });
}
