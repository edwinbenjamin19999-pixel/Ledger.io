import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useKYCStatus() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['kyc', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, org_number, kyc_status, vat_number, business_description')
        .eq('id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSubmitKYC() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (kycData: {
      org_number: string;
      vat_number?: string;
      business_description?: string;
      beneficial_owner_name: string;
    }) => {
      const { error } = await supabase.from('companies').update({
        org_number: kycData.org_number,
        vat_number: kycData.vat_number || null,
        business_description: kycData.business_description || null,
        kyc_status: 'pending',
        updated_at: new Date().toISOString(),
      }).eq('id', companyId!);
      if (error) throw error;

      // Log to audit_log
      const { data: user } = await supabase.auth.getUser();
      await supabase.from('audit_log').insert({
        company_id: companyId!,
        user_id: user.user!.id,
        action: 'kyc_submitted',
        description: `KYC inlämnad. Verklig huvudman: ${kycData.beneficial_owner_name}`,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "KYC-ansökan misslyckades. Kontrollera dina uppgifter och försök igen.");
    },
  });
}
