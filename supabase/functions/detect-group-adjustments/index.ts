import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { period_id } = await req.json();
    if (!period_id) {
      return new Response(JSON.stringify({ error: 'period_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: period } = await supabase
      .from('consolidation_periods')
      .select('id, group_id, period_start, period_end')
      .eq('id', period_id)
      .maybeSingle();
    if (!period) throw new Error('Period not found');

    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, currency')
      .eq('group_id', period.group_id);

    const { data: structure } = await supabase
      .from('group_structure')
      .select('*')
      .eq('group_id', period.group_id);

    const suggestions: any[] = [];

    // Heuristic 1: NCI (ownership < 100%)
    for (const s of structure ?? []) {
      const ownership = Number((s as any).ownership_percentage ?? 100);
      if (ownership < 100 && ownership > 0) {
        const company = companies?.find(c => c.id === (s as any).child_company_id);
        const nciPct = 100 - ownership;
        suggestions.push({
          consolidation_period_id: period_id,
          suggestion_type: 'nci',
          title: `Minoritetsintresse ${nciPct}% i ${company?.name ?? 'dotterbolag'}`,
          explanation: `Ägarandel är ${ownership}%. Minoritetsandelen om ${nciPct}% bör redovisas separat i koncernens egna kapital enligt ÅRL/K3.`,
          financial_impact: null,
          affected_section: 'EK',
          affected_companies: [(s as any).child_company_id],
          confidence: 0.92,
          severity: 'high',
          proposed_journal: { lines: [] },
          status: 'pending',
          model_version: 'heuristic-v1',
        });
      }
    }

    // Heuristic 2: Currency mismatch → FX translation
    const currencies = new Set((companies ?? []).map(c => c.currency).filter(Boolean));
    if (currencies.size > 1) {
      suggestions.push({
        consolidation_period_id: period_id,
        suggestion_type: 'fx_adjustment',
        title: 'FX-omräkning krävs',
        explanation: `Koncernen har bolag i ${currencies.size} olika valutor (${Array.from(currencies).join(', ')}). Omräkningsdifferenser bör redovisas i annat totalresultat (OCI).`,
        financial_impact: null,
        affected_section: 'EK',
        affected_companies: (companies ?? []).map(c => c.id),
        confidence: 0.88,
        severity: 'high',
        proposed_journal: { lines: [] },
        status: 'pending',
        model_version: 'heuristic-v1',
      });
    }

    // Heuristic 3: Goodwill if structure has acquisition_price
    for (const s of structure ?? []) {
      const acqPrice = Number((s as any).acquisition_price ?? 0);
      const netAssets = Number((s as any).net_identifiable_assets ?? 0);
      if (acqPrice > 0 && netAssets > 0 && acqPrice > netAssets) {
        const goodwill = acqPrice - netAssets;
        const company = companies?.find(c => c.id === (s as any).child_company_id);
        suggestions.push({
          consolidation_period_id: period_id,
          suggestion_type: 'goodwill',
          title: `Goodwill: ${company?.name ?? 'dotterbolag'}`,
          explanation: `Förvärvspris (${acqPrice.toLocaleString('sv-SE')} kr) överstiger netto identifierbara tillgångar (${netAssets.toLocaleString('sv-SE')} kr) med ${goodwill.toLocaleString('sv-SE')} kr. Redovisa som goodwill enligt K3 19 kap.`,
          financial_impact: goodwill,
          affected_section: 'BR',
          affected_companies: [(s as any).child_company_id],
          confidence: 0.85,
          severity: 'medium',
          proposed_journal: {
            lines: [
              { account_no: '1050', account_name: 'Goodwill', debit: goodwill, credit: 0 },
              { account_no: '1310', account_name: 'Andelar i koncernföretag', debit: 0, credit: goodwill },
            ],
          },
          status: 'pending',
          model_version: 'heuristic-v1',
        });
      }
    }

    if (suggestions.length > 0) {
      await supabase.from('consolidation_ai_suggestions').insert(suggestions);
    }

    return new Response(
      JSON.stringify({ ok: true, generated: suggestions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
