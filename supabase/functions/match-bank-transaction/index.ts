import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callAIWithFallback, MODEL_CHAINS } from "../_shared/ai-gateway.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { transaction_id } = await req.json();

    if (!transaction_id) {
      throw new Error('transaction_id is required');
    }

    console.log('Matching transaction:', transaction_id);

    // Get transaction details
    const { data: transaction, error: txError } = await supabaseClient
      .from('bank_transactions')
      .select('*')
      .eq('id', transaction_id)
      .maybeSingle();

    if (txError) throw txError;
    if (!transaction) throw new Error('Transaction not found');

    // Get company's chart of accounts
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', transaction.company_id)
      .eq('is_active', true);

    if (accountsError) throw accountsError;

    // Check matching rules
    const { data: rules, error: rulesError } = await supabaseClient
      .from('bank_matching_rules')
      .select('*')
      .eq('company_id', transaction.company_id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) throw rulesError;

    // Try to match with rules first
    let suggestedAccountId = null;
    let suggestedVatCode = null;
    let matchConfidence = 0;

    for (const rule of rules || []) {
      const fieldValue = transaction[rule.match_field as keyof typeof transaction];
      if (fieldValue && String(fieldValue).toLowerCase().includes(rule.match_pattern.toLowerCase())) {
        suggestedAccountId = rule.suggested_account_id;
        suggestedVatCode = rule.suggested_vat_code;
        matchConfidence = 0.95;
        console.log('Matched with rule:', rule.rule_name);
        break;
      }
    }

    // If no rule match, use AI with enhanced analysis
    if (!suggestedAccountId) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (!LOVABLE_API_KEY) {
        console.log('AI matching not available - LOVABLE_API_KEY not configured');
      } else {
        // Get recent transactions for pattern analysis
        const { data: recentTransactions } = await supabaseClient
          .from('bank_transactions')
          .select('*, chart_of_accounts:suggested_account_id(account_number, account_name)')
          .eq('company_id', transaction.company_id)
          .not('suggested_account_id', 'is', null)
          .order('booking_date', { ascending: false })
          .limit(20);

        const prompt = `Du är en expert på svensk bokföring. Analysera denna banktransaktion och ge detaljerad vägledning:

Transaktion att matcha:
- Belopp: ${transaction.amount} ${transaction.currency}
- Beskrivning: ${transaction.description || transaction.reference || 'Saknas'}
- Motpart: ${transaction.counterparty_name || 'Okänd'}
- Motpartens konto: ${transaction.counterparty_account || 'Saknas'}
- Datum: ${transaction.booking_date}

Tillgängliga konton (kontoplanen):
${accounts.map((a: any) => `- ${a.account_number}: ${a.account_name} (${a.account_type})`).join('\n')}

${recentTransactions && recentTransactions.length > 0 ? `
Tidigare matchade transaktioner (för mönsterigenkänning):
${recentTransactions.slice(0, 10).map((t: any) => 
  `- ${t.counterparty_name || 'Okänd'}: ${t.amount} ${t.currency} → ${t.chart_of_accounts?.account_number} ${t.chart_of_accounts?.account_name || ''}`
).join('\n')}
` : ''}

Uppgift:
1. Identifiera vilket konto från kontoplanen som bäst matchar transaktionen
2. Förklara VARFÖR detta konto är rätt val
3. Om något ser konstigt ut (t.ex. ovanligt belopp, okänd motpart), flagga det
4. Ge konkreta förbättringsförslag om data saknas eller är otydlig`;

        let aiResult: any = null;
        try {
          const r = await callAIWithFallback({
            ...MODEL_CHAINS.classification,
            messages: [
              { role: 'system', content: 'Du är en svensk redovisningsexpert med djup kunskap om bokföring och kontoplaner. Ge alltid detaljerade, pedagogiska förklaringar.' },
              { role: 'user', content: prompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "match_transaction",
                  description: "Matcha en banktransaktion med konto och ge detaljerad analys",
                  parameters: {
                    type: "object",
                    properties: {
                      account_number: { type: "string", description: "Kontonummer från kontoplanen som bäst matchar" },
                      confidence: { type: "number", description: "Säkerhet mellan 0.0 och 1.0" },
                      explanation: { type: "string", description: "Detaljerad förklaring om varför detta konto valdes" },
                      warnings: { type: "array", items: { type: "string" }, description: "Eventuella varningar eller konstigheter som upptäckts" },
                      suggestions: { type: "array", items: { type: "string" }, description: "Förbättringsförslag för bättre matchning i framtiden" }
                    },
                    required: ["account_number", "confidence", "explanation"],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "match_transaction" } },
          });
          aiResult = r.data;
          console.log(`[match-bank-transaction] modelUsed=${r.modelUsed}`);
        } catch (e) {
          console.warn('[match-bank-transaction] AI fallback chain exhausted:', e);
        }

        if (aiResult) {
          const toolCall = aiResult.choices[0].message.tool_calls?.[0];
          
          if (toolCall) {
            const result = JSON.parse(toolCall.function.arguments);
            
            const matchedAccount = accounts.find(
              (a: any) => a.account_number === result.account_number
            );

            if (matchedAccount) {
              suggestedAccountId = matchedAccount.id;
              suggestedVatCode = matchedAccount.vat_code;
              matchConfidence = result.confidence;
              
              let fullExplanation = result.explanation;
              
              if (result.warnings && result.warnings.length > 0) {
                fullExplanation += '\n\n⚠️ Varningar:\n' + result.warnings.map((w: string) => `• ${w}`).join('\n');
              }
              
              if (result.suggestions && result.suggestions.length > 0) {
                fullExplanation += '\n\n💡 Förslag:\n' + result.suggestions.map((s: string) => `• ${s}`).join('\n');
              }
              
              // Update with detailed explanation
              const { error: updateError } = await supabaseClient
                .from('bank_transactions')
                .update({
                  suggested_account_id: suggestedAccountId,
                  ai_confidence: matchConfidence,
                  ai_explanation: fullExplanation,
                })
                .eq('id', transaction_id);

              if (updateError) throw updateError;

              console.log('AI suggested account with detailed analysis:', result.account_number);
              
              return new Response(
                JSON.stringify({
                  success: true,
                  suggested_account_id: suggestedAccountId,
                  confidence: matchConfidence,
                  explanation: fullExplanation,
                  warnings: result.warnings || [],
                  suggestions: result.suggestions || [],
                }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
              );
            }
          }
        }
      }
    }

    // Update transaction with suggestion
    const { error: updateError } = await supabaseClient
      .from('bank_transactions')
      .update({
        suggested_account_id: suggestedAccountId,
        ai_confidence: matchConfidence,
        ai_explanation: suggestedAccountId 
          ? `Matched with confidence: ${(matchConfidence * 100).toFixed(0)}%`
          : 'No matching account found',
      })
      .eq('id', transaction_id);

    if (updateError) throw updateError;

    // Auto-generate matching rules from patterns after each successful match
    try {
      await supabaseClient.rpc('auto_generate_matching_rules', { _company_id: transaction.company_id });
    } catch (ruleErr) {
      console.warn('Auto-rule generation failed (non-critical):', ruleErr);
    }

    console.log('Transaction matched successfully');

    return new Response(
      JSON.stringify({
        success: true,
        suggested_account_id: suggestedAccountId,
        confidence: matchConfidence,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in match-bank-transaction:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});