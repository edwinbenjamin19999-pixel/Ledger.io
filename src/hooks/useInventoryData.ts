import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function useCompanyId() {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('selected_company_id') : null;
  return raw ? raw.replace(/"/g, '') : null;
}

export function useInventoryList() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['inventory', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_inventory')
        .select('*')
        .eq('company_id', companyId!)
        .order('last_updated', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInventoryStats() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['inventory-stats', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_inventory')
        .select('current_stock, cost_price_sek, reorder_point, sku, product_name')
        .eq('company_id', companyId!);
      if (error) throw error;

      const items = data ?? [];
      const totalItems = items.length;
      const totalValue = items.reduce((s, i) => s + (Number(i.current_stock ?? 0) * Number(i.cost_price_sek ?? 0)), 0);
      const belowReorder = items.filter(i => Number(i.current_stock ?? 0) <= Number(i.reorder_point ?? 0) && Number(i.current_stock ?? 0) > 0).length;
      const outOfStock = items.filter(i => Number(i.current_stock ?? 0) === 0).length;

      return { totalItems, totalValue, belowReorder, outOfStock, hasData: totalItems > 0 };
    },
  });
}

export function useUpdateInventoryStock() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (params: { id: string; current_stock: number }) => {
      const { error } = await supabase
        .from('ecommerce_inventory')
        .update({ current_stock: params.current_stock, last_updated: new Date().toISOString() })
        .eq('id', params.id)
        .eq('company_id', companyId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', companyId] });
      qc.invalidateQueries({ queryKey: ['inventory-stats', companyId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Lageruppdatering misslyckades");
    },
  });
}
