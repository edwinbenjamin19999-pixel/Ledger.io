import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveCompanyId } from '@/lib/company-selection';
import { format, subDays } from 'date-fns';

export function useUnifiedCommerceData(days = 30) {
  const companyId = getStoredActiveCompanyId();
  const from = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['unified-commerce', companyId, days],
    enabled: !!companyId,
    queryFn: async () => {
      // Fakturaintäkter (utgående, betalda)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, vat_amount, status, invoice_date')
        .eq('company_id', companyId!)
        .eq('invoice_direction', 'outgoing')
        .gte('invoice_date', from)
        .in('status', ['paid', 'sent', 'overdue']);

      // E-handelsordrar
      const { data: orders } = await supabase
        .from('ecommerce_orders')
        .select('gross_amount_sek, vat_amount_sek, net_revenue_sek, order_date, platform, status, platform_fee_sek, payment_fee_sek')
        .eq('company_id', companyId!)
        .gte('order_date', from)
        .neq('status', 'cancelled');

      // Bankinbetalningar
      const { data: bankTx } = await supabase
        .from('bank_transactions')
        .select('amount, booking_date')
        .eq('company_id', companyId!)
        .gte('booking_date', from)
        .gt('amount', 0);

      const invoiceRevenue = (invoices ?? [])
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
      const ecomRevenue = (orders ?? [])
        .reduce((s, o) => s + Number(o.net_revenue_sek ?? o.gross_amount_sek ?? 0), 0);
      const ecomFees = (orders ?? [])
        .reduce((s, o) => s + Number(o.platform_fee_sek ?? 0) + Number(o.payment_fee_sek ?? 0), 0);
      const bankInflow = (bankTx ?? [])
        .reduce((s, t) => s + Number(t.amount ?? 0), 0);

      const platforms: Record<string, number> = {};
      if (invoiceRevenue > 0) platforms['Fakturor'] = invoiceRevenue;
      if (ecomRevenue > 0) {
        const byPlatform: Record<string, number> = {};
        for (const o of orders ?? []) {
          const p = o.platform || 'E-handel';
          byPlatform[p] = (byPlatform[p] ?? 0) + Number(o.net_revenue_sek ?? o.gross_amount_sek ?? 0);
        }
        Object.assign(platforms, byPlatform);
      }

      // Daglig trenddata (senaste 14 dagarna)
      const dailyMap: Record<string, { invoices: number; ecom: number }> = {};
      for (let i = 13; i >= 0; i--) {
        dailyMap[format(subDays(new Date(), i), 'yyyy-MM-dd')] = { invoices: 0, ecom: 0 };
      }
      for (const inv of invoices ?? []) {
        const d = inv.invoice_date?.slice(0, 10);
        if (d && dailyMap[d] && inv.status === 'paid') dailyMap[d].invoices += Number(inv.total_amount ?? 0);
      }
      for (const ord of orders ?? []) {
        const d = ord.order_date?.slice(0, 10);
        if (d && dailyMap[d]) dailyMap[d].ecom += Number(ord.net_revenue_sek ?? ord.gross_amount_sek ?? 0);
      }

      const daily = Object.entries(dailyMap).map(([date, v]) => ({
        date,
        label: new Date(date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
        total: v.invoices + v.ecom,
        invoices: v.invoices,
        ecom: v.ecom,
      }));

      return {
        totalRevenue: invoiceRevenue + ecomRevenue,
        invoiceRevenue,
        ecomRevenue,
        ecomFees,
        bankInflow,
        platforms,
        daily,
        invoiceCount: (invoices ?? []).length,
        orderCount: (orders ?? []).length,
        hasData: (invoices?.length ?? 0) + (orders?.length ?? 0) > 0,
      };
    },
  });
}
