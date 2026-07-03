// Edge function: securities-detect-duplicates
// Server-side dublettdetektering på (account, isin/name, trade_date ±1, quantity, amount)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Incoming {
  securities_account_id: string;
  trade_date: string;
  isin?: string | null;
  name?: string | null;
  ticker?: string | null;
  quantity?: number | null;
  amount?: number | null;
  transaction_type?: string | null;
}

interface Body {
  company_id: string;
  incoming: Incoming[];
}

function daysApart(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
}
function near(a: number | null | undefined, b: number | null | undefined, tol = 0.01) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b)) <= tol;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json() as Body;
    if (!body.company_id || !Array.isArray(body.incoming)) {
      return new Response(JSON.stringify({ success: false, error: 'Ogiltig body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accountIds = Array.from(new Set(body.incoming.map(i => i.securities_account_id)));
    const { data: existing } = await supabase
      .from('securities_transactions')
      .select('id, securities_account_id, trade_date, isin, ticker, name, quantity, amount, transaction_type')
      .eq('company_id', body.company_id)
      .in('securities_account_id', accountIds)
      .limit(5000);

    const results = body.incoming.map((inc, idx) => {
      const matches = (existing ?? []).filter(ex => {
        if (ex.securities_account_id !== inc.securities_account_id) return false;
        if (daysApart(ex.trade_date, inc.trade_date) > 3) return false;
        let score = 0;
        if (inc.isin && ex.isin && inc.isin === ex.isin) score += 0.3;
        else if (inc.name && ex.name && inc.name.toLowerCase() === ex.name.toLowerCase()) score += 0.2;
        if (near(inc.quantity, Number(ex.quantity), 0.005)) score += 0.2;
        if (near(inc.amount, Number(ex.amount), 0.01)) score += 0.2;
        if (daysApart(ex.trade_date, inc.trade_date) === 0) score += 0.3; else score += 0.1;
        return score >= 0.6;
      });
      return { index: idx, has_duplicates: matches.length > 0, matches: matches.slice(0, 5) };
    });

    return new Response(JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Okänt fel';
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
