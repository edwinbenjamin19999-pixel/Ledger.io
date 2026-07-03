import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem('selectedCompanyId');
    if (stored) setCompanyId(stored);
    const handler = () => setCompanyId(localStorage.getItem('selectedCompanyId'));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);
  return companyId;
}

export function useEcommerceOverview(monthsBack = 6) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['ecommerce-overview', companyId, monthsBack],
    enabled: !!companyId,
    queryFn: async () => {
      const from = format(subMonths(startOfMonth(new Date()), monthsBack - 1), 'yyyy-MM-dd');
      const to = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data: orders, error: ordersError } = await supabase
        .from('ecommerce_orders')
        .select('id, order_date, gross_amount_sek, net_revenue_sek, vat_amount_sek, currency, status, platform, customer_country, platform_fee_sek, payment_fee_sek')
        .eq('company_id', companyId!)
        .gte('order_date', from)
        .lte('order_date', to)
        .order('order_date', { ascending: true });

      if (ordersError) throw ordersError;

      const monthlyMap: Record<string, { revenue: number; gross: number; orders: number; vat: number }> = {};
      for (const order of orders ?? []) {
        if (order.status === 'cancelled' || order.status === 'refunded') continue;
        const month = order.order_date.slice(0, 7);
        if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, gross: 0, orders: 0, vat: 0 };
        monthlyMap[month].revenue += Number(order.net_revenue_sek ?? 0);
        monthlyMap[month].gross += Number(order.gross_amount_sek ?? 0);
        monthlyMap[month].orders += 1;
        monthlyMap[month].vat += Number(order.vat_amount_sek ?? 0);
      }

      const monthly = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({
          month,
          label: new Date(month + '-01').toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' }),
          revenue: v.revenue,
          gross: v.gross,
          orders: v.orders,
          vat: v.vat,
        }));

      const currentMonth = format(new Date(), 'yyyy-MM');
      const prevMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
      const current = monthlyMap[currentMonth] ?? { revenue: 0, gross: 0, orders: 0, vat: 0 };
      const prev = monthlyMap[prevMonth] ?? { revenue: 0, gross: 0, orders: 0, vat: 0 };

      const revenueChange = prev.revenue > 0 ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : 0;
      const ordersChange = prev.orders > 0 ? ((current.orders - prev.orders) / prev.orders) * 100 : 0;

      const platformMap: Record<string, number> = {};
      const countryMap: Record<string, number> = {};
      let totalFees = 0;

      for (const order of orders ?? []) {
        if (order.status === 'cancelled') continue;
        const p = order.platform ?? 'Okänd';
        platformMap[p] = (platformMap[p] ?? 0) + Number(order.net_revenue_sek ?? 0);
        const c = order.customer_country ?? 'SE';
        countryMap[c] = (countryMap[c] ?? 0) + Number(order.net_revenue_sek ?? 0);
        totalFees += Number(order.platform_fee_sek ?? 0) + Number(order.payment_fee_sek ?? 0);
      }

      const byPlatform = Object.entries(platformMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      const byCountry = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([country, value]) => ({ country, value }));

      const activeOrders = orders?.filter(o => o.status !== 'cancelled' && o.status !== 'refunded') ?? [];

      return {
        monthly,
        current,
        prev,
        revenueChange,
        ordersChange,
        totalRevenue: activeOrders.reduce((s, o) => s + Number(o.net_revenue_sek ?? 0), 0),
        totalGross: activeOrders.reduce((s, o) => s + Number(o.gross_amount_sek ?? 0), 0),
        totalOrders: activeOrders.length,
        totalFees,
        avgOrderValue: activeOrders.length > 0 ? Math.round(activeOrders.reduce((s, o) => s + Number(o.gross_amount_sek ?? 0), 0) / activeOrders.length) : 0,
        byPlatform,
        byCountry,
        hasData: (orders?.length ?? 0) > 0,
      };
    },
  });
}

export function useEcommerceOrders(search?: string) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['ecommerce-orders', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('company_id', companyId!)
        .order('order_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEcommerceMargins() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['ecommerce-margins', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // Get order lines with order info via company_id filter
      const { data: lines, error } = await supabase
        .from('ecommerce_order_lines')
        .select('id, product_name, sku, quantity, unit_price_sek, line_total_sek, vat_rate, product_category, order_id')
        .eq('company_id', companyId!);

      if (error) throw error;

      // Get orders to filter out cancelled
      const { data: orders } = await supabase
        .from('ecommerce_orders')
        .select('id, status, order_date')
        .eq('company_id', companyId!)
        .neq('status', 'cancelled');

      const validOrderIds = new Set((orders ?? []).map(o => o.id));

      const productMap: Record<string, { revenue: number; qty: number; sku: string }> = {};
      for (const line of lines ?? []) {
        if (!validOrderIds.has(line.order_id)) continue;
        const name = line.product_name ?? 'Okänd produkt';
        if (!productMap[name]) productMap[name] = { revenue: 0, qty: 0, sku: line.sku ?? '' };
        productMap[name].revenue += Number(line.line_total_sek ?? 0);
        productMap[name].qty += Number(line.quantity ?? 1);
      }

      // Monthly revenue from orders
      const monthlyMap: Record<string, { revenue: number; gross: number }> = {};
      for (const order of orders ?? []) {
        const month = order.order_date.slice(0, 7);
        if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, gross: 0 };
        // We don't have COGS in the schema, so we'll show revenue only
      }

      return {
        products: Object.entries(productMap).map(([name, v]) => ({
          name,
          sku: v.sku,
          revenue: v.revenue,
          qty: v.qty,
        })).sort((a, b) => b.revenue - a.revenue).slice(0, 20),
        hasData: (lines?.length ?? 0) > 0,
      };
    },
  });
}

export function useEcommercePayouts() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['ecommerce-payouts', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_payouts')
        .select('*')
        .eq('company_id', companyId!)
        .order('payout_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEcommerceInventory() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['ecommerce-inventory', companyId],
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

export function useEcommerceVAT() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['ecommerce-vat', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('ecommerce_orders')
        .select('customer_country, vat_amount_sek, net_revenue_sek, gross_amount_sek, order_date, status')
        .eq('company_id', companyId!)
        .neq('status', 'cancelled')
        .neq('status', 'refunded');

      if (error) throw error;

      const vatByCountry: Record<string, { vat: number; net: number; orders: number }> = {};
      for (const o of orders ?? []) {
        const c = o.customer_country ?? 'SE';
        if (!vatByCountry[c]) vatByCountry[c] = { vat: 0, net: 0, orders: 0 };
        vatByCountry[c].vat += Number(o.vat_amount_sek ?? 0);
        vatByCountry[c].net += Number(o.net_revenue_sek ?? 0);
        vatByCountry[c].orders += 1;
      }

      const euCountries = ['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SK','SI'];
      let ossTotal = 0;
      for (const [c, v] of Object.entries(vatByCountry)) {
        if (euCountries.includes(c) && c !== 'SE') ossTotal += v.net;
      }

      return {
        vatByCountry: Object.entries(vatByCountry).map(([country, v]) => ({ country, ...v })).sort((a, b) => b.vat - a.vat),
        ossTotal,
        ossThresholdSek: 110000, // ~10 000 EUR
        ossWarning: ossTotal > 88000,
        hasData: (orders?.length ?? 0) > 0,
      };
    },
  });
}
