import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVE_COMPANY_STORAGE_KEY } from '@/lib/company-selection';
import { useState, useEffect } from 'react';

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

export function usePayrollContext(externalCompanyId?: string) {
  const storedCompanyId = useCompanyId();
  const companyId = externalCompanyId || storedCompanyId;

  return useQuery({
    queryKey: ['payroll-context', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const [empRes, payrollRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, first_name, last_name, monthly_salary, tax_table, municipality, is_active, employment_start, employment_type')
          .eq('company_id', companyId!)
          .eq('is_active', true),
        supabase
          .from('payroll_runs')
          .select('id, period_start, period_end, total_gross, total_tax, total_employer_cost, total_net, status, payment_date')
          .eq('company_id', companyId!)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (empRes.error) throw empRes.error;

      const employees = empRes.data ?? [];
      const totalGross = employees.reduce((s, e) => s + Number(e.monthly_salary ?? 0), 0);
      const employerFees = totalGross * 0.3142;

      return {
        employees,
        employeeCount: employees.length,
        totalMonthlySalary: totalGross,
        totalWithEmployerFees: totalGross + employerFees,
        lastPayroll: payrollRes.data,
        hasEmployees: employees.length > 0,
        companyId,
      };
    },
  });
}
