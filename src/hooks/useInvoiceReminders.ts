import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveCompanyId } from '@/lib/company-selection';
import { isPast, parseISO } from 'date-fns';
import { toast } from 'sonner';

export function useOverdueInvoices() {
  const companyId = getStoredActiveCompanyId();
  return useQuery({
    queryKey: ['overdue-invoices', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, counterparty_name, total_amount, due_date, status, reminder_count, last_reminder_sent_at')
        .eq('company_id', companyId!)
        .eq('invoice_direction', 'outgoing')
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true });
      if (error) throw error;

      const today = new Date();
      return (data ?? []).map(inv => {
        const due = parseISO(inv.due_date);
        const daysOverdue = isPast(due) ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0;
        let reminderLevel = 0;
        if (daysOverdue >= 35) reminderLevel = 3;
        else if (daysOverdue >= 21) reminderLevel = 2;
        else if (daysOverdue >= 7) reminderLevel = 1;
        return {
          ...inv,
          daysOverdue,
          reminderLevel,
          isOverdue: daysOverdue > 0,
        };
      });
    },
  });
}

export function useSendReminder() {
  const qc = useQueryClient();
  const companyId = getStoredActiveCompanyId();
  return useMutation({
    mutationFn: async ({ invoiceId, reminderNumber }: { invoiceId: string; reminderNumber: number }) => {
      const { data, error } = await supabase.functions.invoke('send-single-reminder', {
        body: { invoiceId, reminderNumber },
      });
      if (error) {
        // FunctionsHttpError carries server JSON in `context`
        type FnErr = { context?: { json?: () => Promise<{ message?: string; error?: string }> } };
        const ctx = (error as unknown as FnErr).context;
        if (ctx?.json) {
          try {
            const body = await ctx.json();
            throw new Error(body.message || body.error || error.message);
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message) throw parseErr;
          }
        }
        throw new Error(error.message || 'Kunde inte skicka påminnelsen');
      }
      if (data?.error) {
        throw new Error(data.message || data.error);
      }
      return data as { success: boolean; sent_to: string; reminder_number: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overdue-invoices', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || 'Påminnelsen skickades inte');
    },
  });
}

