// Daily price sync via Yahoo Finance (no API key needed)
// Fetches current price for each unique ISIN/ticker in securities_holdings
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const companyId: string | undefined = body.company_id;

    let query = supabase.from('securities_holdings').select('id, ticker, isin, quantity');
    if (companyId) query = query.eq('company_id', companyId);
    const { data: holdings, error } = await query;
    if (error) throw error;

    const updates: Array<{ id: string; price: number }> = [];
    const uniqueTickers = [...new Set((holdings ?? []).map(h => h.ticker).filter(Boolean))];

    for (const ticker of uniqueTickers) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!resp.ok) continue;
        const json = await resp.json();
        const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof price !== 'number') continue;
        for (const h of holdings ?? []) {
          if (h.ticker === ticker) updates.push({ id: h.id, price });
        }
      } catch (_e) { /* skip */ }
    }

    for (const u of updates) {
      const h = holdings!.find(x => x.id === u.id)!;
      const value = Number(h.quantity ?? 0) * u.price;
      await supabase.from('securities_holdings').update({
        current_price: u.price,
        current_value: value,
        last_updated_at: new Date().toISOString(),
      }).eq('id', u.id);
    }

    return new Response(JSON.stringify({ updated: updates.length, total: holdings?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
