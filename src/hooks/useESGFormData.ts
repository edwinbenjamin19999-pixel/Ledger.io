import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVE_COMPANY_STORAGE_KEY } from '@/lib/company-selection';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

export function useESGFormData(year: number) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['esg-form-data', companyId, year],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('esg_data')
        .select('*')
        .eq('company_id', companyId!)
        .eq('year', year)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertESGData() {
  const qc = useQueryClient();
  const companyId = (() => {
    try { return localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY); } catch { return null; }
  })();

  return useMutation({
    mutationFn: async (values: {
      year: number;
      scope1_co2_tonnes?: number;
      scope2_co2_tonnes?: number;
      scope3_co2_tonnes?: number;
      energy_kwh?: number;
      renewable_energy_percent?: number;
      water_m3?: number;
      waste_tonnes?: number;
      recycled_percent?: number;
      female_board_percent?: number;
      employee_turnover_percent?: number;
      sick_days_per_employee?: number;
      social_investment_sek?: number;
      has_code_of_conduct?: boolean;
      has_whistleblower?: boolean;
      anti_corruption_training_percent?: number;
      notes?: string;
    }) => {
      if (!companyId) throw new Error('Inget bolag valt');
      const { data, error } = await supabase
        .from('esg_data')
        .upsert(
          { company_id: companyId, ...values },
          { onConflict: 'company_id,year' }
        )
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['esg-form-data', companyId, vars.year] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "ESG-data kunde inte sparas");
    },
  });
}
