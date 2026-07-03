// Edge function: securities-classify
// AI-fallback för osäkra transaktioner. Heuristik körs alltid först i klienten.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  transaction_id?: string;
  description?: string;
  isin?: string;
  name?: string;
  amount?: number;
  quantity?: number;
}

const SYSTEM = `Du klassificerar svenska värdepapperstransaktioner. Returnera ENDAST JSON:
{
  "tx_type": "buy"|"sell"|"dividend"|"fee"|"tax"|"deposit"|"withdrawal"|"split"|"rights_issue"|"transfer"|"unknown",
  "instrument_type": "stock"|"fund"|"etf"|"bond"|"unlisted_share"|"unknown",
  "confidence": 0.0-1.0,
  "ambiguity_flags": ["..."],
  "reasoning": "kort förklaring på svenska"
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json() as Body;
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY saknas');

    const userMsg = `Klassificera: description="${body.description ?? ''}" name="${body.name ?? ''}" isin="${body.isin ?? ''}" amount=${body.amount ?? 'null'} quantity=${body.quantity ?? 'null'}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) throw new Error(`AI ${aiResp.status}`);
    const j = await aiResp.json();
    const result = JSON.parse(j.choices[0].message.content);

    if (body.transaction_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: tx } = await supabase.from('securities_transactions')
        .select('company_id').eq('id', body.transaction_id).single();
      if (tx) {
        await supabase.from('securities_classifications').insert({
          company_id: tx.company_id,
          transaction_id: body.transaction_id,
          classified_by: 'ai',
          instrument_type: result.instrument_type,
          tx_type_proposed: result.tx_type,
          confidence: result.confidence,
          ambiguity_flags: result.ambiguity_flags,
          ai_model: 'google/gemini-2.5-flash',
        });
        await supabase.from('securities_transactions')
          .update({
            classification_confidence: result.confidence,
            review_status: result.confidence >= 0.9 ? 'reviewed' : 'needs_review',
          })
          .eq('id', body.transaction_id);
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Okänt fel';
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
