// Edge function: securities-pdf-parser
// Använder Lovable AI Gateway (Gemini Vision) för att extrahera transaktioner från PDF-årsbesked.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  statement_id: string;
  storage_path: string;
  broker_hint?: string;
}

const EXTRACTION_PROMPT = `Du är en svensk redovisningsassistent. Du får en PDF (årsbesked från en svensk bank/broker som Nordnet, Avanza, SEB, Handelsbanken eller Swedbank).

Extrahera ALLA värdepapperstransaktioner och returnera ENDAST JSON i detta format:

{
  "broker": "nordnet" | "avanza" | "seb" | "handelsbanken" | "swedbank" | "nordea" | "other",
  "period_start": "YYYY-MM-DD" eller null,
  "period_end": "YYYY-MM-DD" eller null,
  "confidence": 0.0-1.0,
  "transactions": [
    {
      "trade_date": "YYYY-MM-DD",
      "settlement_date": "YYYY-MM-DD" eller null,
      "transaction_type": "buy" | "sell" | "dividend" | "fee" | "tax" | "deposit" | "withdrawal",
      "isin": "12 tecken" eller null,
      "ticker": "kort kod" eller null,
      "name": "instrumentnamn",
      "quantity": tal eller null,
      "price": tal eller null,
      "amount": tal (negativt för köp/avgift, positivt för sälj/utdelning),
      "fee": tal eller null,
      "currency": "SEK" eller annan,
      "fx_rate": tal eller null,
      "confidence": 0.0-1.0,
      "source_excerpt": "den ursprungliga texten från PDF:en"
    }
  ]
}

Inga kommentarer, ingen markdown — bara ren JSON.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json() as Body;
    if (!body.statement_id || !body.storage_path) {
      return new Response(JSON.stringify({ success: false, error: 'statement_id och storage_path krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Mark as parsing
    await supabase.from('securities_statements')
      .update({ parse_status: 'parsing' })
      .eq('id', body.statement_id);

    // Download PDF from storage
    const { data: file, error: dlErr } = await supabase.storage
      .from('securities-statements')
      .download(body.storage_path);
    if (dlErr || !file) throw new Error(`Kunde inte ladda ner PDF: ${dlErr?.message}`);

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call Lovable AI Gateway with Gemini Vision
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY saknas');

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Broker hint: ${body.broker_hint ?? 'unknown'}. Extrahera alla transaktioner från denna PDF.` },
              { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI Gateway error ${aiResp.status}: ${errText}`);
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content;
    if (!content) throw new Error('Tomt svar från AI');

    const parsed = JSON.parse(content);
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const confidence = Number(parsed.confidence ?? 0.7);

    // Get statement context (company_id, account_id)
    const { data: stmt } = await supabase
      .from('securities_statements')
      .select('company_id, securities_account_id')
      .eq('id', body.statement_id)
      .single();
    if (!stmt) throw new Error('Statement hittades ej');

    // Insert transactions in needs_review state if no account, else needs_review by default
    if (transactions.length > 0 && stmt.securities_account_id) {
      const rows = transactions.map((t: Record<string, unknown>) => ({
        company_id: stmt.company_id,
        securities_account_id: stmt.securities_account_id,
        statement_id: body.statement_id,
        trade_date: t.trade_date,
        settlement_date: t.settlement_date ?? null,
        transaction_type: t.transaction_type ?? 'buy',
        isin: t.isin ?? null,
        ticker: t.ticker ?? null,
        name: t.name ?? null,
        quantity: t.quantity ?? null,
        price: t.price ?? null,
        amount: t.amount ?? 0,
        fee: t.fee ?? null,
        currency: t.currency ?? 'SEK',
        fx_rate: t.fx_rate ?? null,
        source: 'pdf',
        review_status: Number(t.confidence ?? 0) >= 0.9 ? 'reviewed' : 'needs_review',
        classification_confidence: t.confidence ?? confidence,
        ambiguity_notes: typeof t.source_excerpt === 'string' ? t.source_excerpt.slice(0, 300) : null,
      }));
      await supabase.from('securities_transactions').insert(rows);
    }

    // Update statement
    await supabase.from('securities_statements')
      .update({
        parse_status: 'parsed',
        parse_confidence: confidence,
        parse_data: parsed,
        extracted_count: transactions.length,
        parsed_at: new Date().toISOString(),
      })
      .eq('id', body.statement_id);

    return new Response(JSON.stringify({
      success: true,
      statement_id: body.statement_id,
      extracted_count: transactions.length,
      confidence,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Okänt fel';
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const body = await req.clone().json().catch(() => ({}));
      if (body.statement_id) {
        await supabase.from('securities_statements')
          .update({ parse_status: 'failed', parse_error: msg })
          .eq('id', body.statement_id);
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
