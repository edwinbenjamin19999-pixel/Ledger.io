import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveCompanyId } from '@/lib/company-selection';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = getStoredActiveCompanyId();
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

export function useExportPersonalData() {
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (subjectEmail: string) => {
      if (!companyId) throw new Error('Inget företag valt');

      const normalizedEmail = subjectEmail.toLowerCase().trim();

      // 1. Find employee records by email
      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, monthly_salary, employment_start, employment_type')
        .eq('company_id', companyId)
        .ilike('email', normalizedEmail);

      // 2. Find profile (user) by email for expense_claims/time_entries
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', normalizedEmail);

      const userIds = (profiles ?? []).map(p => p.id);

      // 3. Fetch expense_claims scoped to the subject's user_id
      const { data: expenses } = userIds.length > 0
        ? await supabase
            .from('expense_claims')
            .select('id, description, amount, category, status, created_at, expense_date')
            .eq('company_id', companyId)
            .in('user_id', userIds)
        : { data: [] };

      // 4. Fetch time_entries scoped to the subject's user_id
      const { data: timeEntries } = userIds.length > 0
        ? await supabase
            .from('time_entries')
            .select('id, entry_date, duration_minutes, description, client_name')
            .eq('company_id', companyId)
            .in('user_id', userIds)
        : { data: [] };

      const dataScope: Record<string, unknown> = {
        employeeRecordsFound: (employees ?? []).length,
        expensesFound: (expenses ?? []).length,
        timeEntriesFound: (timeEntries ?? []).length,
      };

      if ((employees ?? []).length === 0 && userIds.length === 0) {
        dataScope.note = 'Ingen anställd eller användare med denna e-post hittades';
      }

      const exportSummary = {
        subject: normalizedEmail,
        exportDate: new Date().toISOString(),
        dataScope,
        data: {
          employeeRecords: (employees ?? []).map(e => {
            const record = { ...e } as Record<string, unknown>;
            record.monthly_salary = '[REDAKTERAT — kontakta DPO för lönedata]';
            return record;
          }),
          expenses: expenses ?? [],
          timeEntries: timeEntries ?? [],
        },
      };

      // Generate JSON file
      const blob = new Blob([JSON.stringify(exportSummary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr-sar-${normalizedEmail}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log in audit_log
      const { data: currentUser } = await supabase.auth.getUser();
      await supabase.from('audit_log').insert({
        company_id: companyId,
        user_id: currentUser.user!.id,
        action: 'gdpr_sar_export',
        description: `SAR-export för ${normalizedEmail} — ${(employees ?? []).length} anställda, ${(expenses ?? []).length} utlägg, ${(timeEntries ?? []).length} tidsposter`,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Persondata-exporten misslyckades");
    },
  });
}

export function useGDPRAuditLog() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['gdpr-audit-log', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, action, description, created_at, user_id')
        .eq('company_id', companyId!)
        .like('action', 'gdpr_%')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}
