import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { ACTIVE_COMPANY_STORAGE_KEY } from '@/lib/company-selection';
import { toast } from 'sonner';

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

export function useKassaregisterStats(date: string) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['kassaregister-stats', companyId, date],
    enabled: !!companyId && !!date,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('kassaregister_sales')
        .select('gross_amount, vat_6, vat_12, vat_25, payment_method')
        .eq('company_id', companyId!)
        .eq('sale_date', date));

      if (error && error.code === '42P01') {
        return { totalSales: 0, totalVAT: 0, byPaymentMethod: {} as Record<string, number>, count: 0, hasData: false };
      }
      if (error) throw error;

      const rows = (data ?? []) ;
      const totalSales = rows.reduce((s, r) => s + Number(r.gross_amount ?? 0), 0);
      const totalVAT = rows.reduce((s, r) => s + Number(r.vat_6 ?? 0) + Number(r.vat_12 ?? 0) + Number(r.vat_25 ?? 0), 0);
      const byPaymentMethod: Record<string, number> = {};
      for (const r of rows) {
        const method = r.payment_method || 'card';
        byPaymentMethod[method] = (byPaymentMethod[method] ?? 0) + Number(r.gross_amount ?? 0);
      }

      return { totalSales, totalVAT, byPaymentMethod, count: rows.length, hasData: rows.length > 0 };
    },
  });
}

export function useImportCSVSales() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (rows: {
      sale_date: string;
      receipt_number?: string;
      gross_amount: number;
      vat_25?: number;
      vat_12?: number;
      vat_6?: number;
      payment_method?: string;
    }[]) => {
      const { error } = await supabase.from('kassaregister_sales').insert(
        rows.map(r => ({ company_id: companyId, ...r }))
      );
      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kassaregister-stats', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Kassaregister-importen misslyckades");
    },
  });
}
