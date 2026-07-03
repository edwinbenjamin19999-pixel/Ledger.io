import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // User-scoped client for writes
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { company_id, fiscal_year, action } = await req.json();
    if (!company_id || !fiscal_year) throw new Error('company_id and fiscal_year required');

    // ─── AUTO-FIX ACTION ───
    if (action === 'auto_fix') {
      return await handleAutoFix(supabase, supabaseUser, user, company_id, fiscal_year, LOVABLE_API_KEY);
    }

    // ─── STANDARD AUDIT ───
    // Fetch company info
    const { data: company } = await supabase
      .from('companies')
      .select('name, org_number, industry')
      .eq('id', company_id)
      .maybeSingle();

    // Fetch journal entries for the fiscal year
    const startDate = `${fiscal_year}-01-01`;
    const endDate = `${fiscal_year}-12-31`;

    const { data: entries } = await supabase
      .from('journal_entries')
      .select('id, entry_date, description, status, created_at')
      .eq('company_id', company_id)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date');

    // Fetch journal entry lines with account info
    const entryIds = (entries || []).map(e => e.id);
    let lines: any[] = [];
    if (entryIds.length > 0) {
      const { data: lineData } = await supabase
        .from('journal_entry_lines')
        .select('journal_entry_id, debit, credit, account:chart_of_accounts(account_number, account_name, account_type)')
        .in('journal_entry_id', entryIds);
      lines = lineData || [];
    }

    // Fetch annual report if exists
    const { data: annualReport } = await supabase
      .from('annual_reports')
      .select('*')
      .eq('company_id', company_id)
      .eq('fiscal_year', fiscal_year)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch VAT declarations for the period
    const { data: vatDeclarations } = await supabase
      .from('vat_declarations')
      .select('*')
      .eq('company_id', company_id)
      .gte('period_start', startDate)
      .lte('period_end', endDate);

    // Compute aggregated financial data
    const accountTotals: Record<string, { name: string; type: string; debit: number; credit: number }> = {};
    for (const line of lines) {
      const acct = line.account;
      if (!acct) continue;
      const key = acct.account_number;
      if (!accountTotals[key]) {
        accountTotals[key] = { name: acct.account_name, type: acct.account_type, debit: 0, credit: 0 };
      }
      accountTotals[key].debit += Number(line.debit || 0);
      accountTotals[key].credit += Number(line.credit || 0);
    }

    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    const balanceDiff = Math.abs(totalDebit - totalCredit);

    // Rule-based checks
    const ruleChecks: Array<{ id: string; name: string; status: 'pass' | 'fail' | 'warning'; detail: string; fixable: boolean; fix_action?: string }> = [];

    // 1. Ledger balance
    ruleChecks.push({
      id: 'ledger_balance',
      name: 'Huvudbok i balans',
      status: balanceDiff < 0.01 ? 'pass' : 'fail',
      detail: balanceDiff < 0.01
        ? `Debet och kredit balanserar (${totalDebit.toLocaleString('sv-SE')} kr)`
        : `Obalans: ${balanceDiff.toLocaleString('sv-SE')} kr skillnad`,
      fixable: balanceDiff >= 0.01,
      fix_action: 'balance_correction',
    });

    // 2. Check for unapproved entries
    const unapproved = (entries || []).filter(e => e.status === 'draft' || e.status === 'pending_approval');
    ruleChecks.push({
      id: 'unapproved_entries',
      name: 'Inga ogodkända verifikat',
      status: unapproved.length === 0 ? 'pass' : 'warning',
      detail: unapproved.length === 0
        ? 'Alla verifikat är godkända'
        : `${unapproved.length} verifikat i status draft/pending`,
      fixable: unapproved.length > 0,
      fix_action: 'approve_entries',
    });

    // 3. Revenue accounts (3xxx) exist
    const revenueAccounts = Object.entries(accountTotals).filter(([k]) => k.startsWith('3'));
    const totalRevenue = revenueAccounts.reduce((s, [, v]) => s + v.credit - v.debit, 0);
    ruleChecks.push({
      id: 'revenue_check',
      name: 'Intäkter bokförda',
      status: totalRevenue > 0 ? 'pass' : 'warning',
      detail: totalRevenue > 0
        ? `Total intäkt: ${totalRevenue.toLocaleString('sv-SE')} kr`
        : 'Inga intäkter hittade – kontrollera att försäljning är bokförd',
      fixable: false,
    });

    // 4. Tax account (8910) booked
    const taxAccount = accountTotals['8910'];
    const totalCosts = Object.entries(accountTotals)
      .filter(([k]) => k >= '4000' && k <= '7999')
      .reduce((s, [, v]) => s + v.debit - v.credit, 0);
    const preResult = totalRevenue - totalCosts;
    const expectedTax = Math.round(Math.max(0, preResult) * 0.206);
    
    ruleChecks.push({
      id: 'corporate_tax',
      name: 'Bolagsskatt bokförd',
      status: taxAccount ? 'pass' : 'warning',
      detail: taxAccount
        ? `Skatt bokförd: ${(taxAccount.debit - taxAccount.credit).toLocaleString('sv-SE')} kr`
        : `Konto 8910 (Skatt på årets resultat) saknas – beräknad skatt: ${expectedTax.toLocaleString('sv-SE')} kr`,
      fixable: !taxAccount && preResult > 0,
      fix_action: 'book_corporate_tax',
    });

    // 5. Year-end closing entries (8999)
    const closingAccount = accountTotals['8999'];
    ruleChecks.push({
      id: 'year_end_closing',
      name: 'Bokslutstransaktioner',
      status: closingAccount ? 'pass' : 'warning',
      detail: closingAccount
        ? 'Årets resultat har överförts'
        : 'Konto 8999 (Årets resultat) saknas – bokslutsbokningar kan behövas',
      fixable: !closingAccount,
      fix_action: 'book_year_end_closing',
    });

    // 6. VAT reconciliation
    const totalVatDeclared = (vatDeclarations || []).reduce((s, v) => s + Number(v.vat_to_pay || 0), 0);
    const vatBookedAccounts = Object.entries(accountTotals).filter(([k]) => k.startsWith('26'));
    const totalVatBooked = vatBookedAccounts.reduce((s, [, v]) => s + v.credit - v.debit, 0);
    const vatDiff = Math.abs(totalVatDeclared - totalVatBooked);
    ruleChecks.push({
      id: 'vat_reconciliation',
      name: 'Momsavstämning',
      status: vatDiff < 100 ? 'pass' : 'warning',
      detail: vatDiff < 100
        ? 'Deklarerad moms stämmer med bokförd moms'
        : `Skillnad: ${vatDiff.toLocaleString('sv-SE')} kr mellan deklarerat (${totalVatDeclared.toLocaleString('sv-SE')} kr) och bokfört (${totalVatBooked.toLocaleString('sv-SE')} kr)`,
      fixable: vatDiff >= 100,
      fix_action: 'vat_reconciliation',
    });

    // 7. Document count per month (gaps)
    const monthCounts: Record<number, number> = {};
    for (const e of (entries || [])) {
      const m = new Date(e.entry_date).getMonth() + 1;
      monthCounts[m] = (monthCounts[m] || 0) + 1;
    }
    const missingMonths: number[] = [];
    for (let m = 1; m <= 12; m++) {
      if (!monthCounts[m]) missingMonths.push(m);
    }
    ruleChecks.push({
      id: 'monthly_coverage',
      name: 'Löpande bokföring alla månader',
      status: missingMonths.length === 0 ? 'pass' : missingMonths.length > 6 ? 'fail' : 'warning',
      detail: missingMonths.length === 0
        ? 'Verifikat finns för alla 12 månader'
        : `Saknas verifikat för månad: ${missingMonths.join(', ')}. Systemet kräver komplett bokföring innan bokslut.`,
      fixable: false,
    });

    // AI-driven deep analysis
    let aiAnalysis: any = null;
    if (LOVABLE_API_KEY) {
      try {
        const topAccounts = Object.entries(accountTotals)
          .sort(([, a], [, b]) => (b.debit + b.credit) - (a.debit + a.credit))
          .slice(0, 30)
          .map(([num, v]) => `${num} ${v.name}: D ${Math.round(v.debit)} K ${Math.round(v.credit)}`);

        const prompt = `Du är en auktoriserad revisor som granskar ett svenskt företags bokslut för ${fiscal_year}.

Företag: ${company?.name || 'Okänt'} (${company?.org_number || '-'})
Bransch: ${company?.industry || 'Okänd'}
Antal verifikat: ${(entries || []).length}
Total debet: ${Math.round(totalDebit)} kr
Total kredit: ${Math.round(totalCredit)} kr
Obalans: ${Math.round(balanceDiff)} kr
Intäkter: ${Math.round(totalRevenue)} kr
Kostnader: ${Math.round(totalCosts)} kr
Resultat före skatt: ${Math.round(preResult)} kr

Kontosaldon (topp 30):
${topAccounts.join('\n')}

Årsredovisning status: ${annualReport?.status || 'Ej genererad'}
${annualReport ? `Omsättning: ${annualReport.revenue} kr, Resultat: ${annualReport.net_profit} kr` : ''}

Regelkontroller:
${ruleChecks.map(c => `- ${c.name}: ${c.status} (${c.detail})`).join('\n')}

Analysera och ge:
1. En övergripande riskbedömning (låg/medel/hög)
2. Max 5 specifika observationer med allvarlighetsgrad (kritisk/varning/info)
3. Rekommendationer för åtgärder innan inlämning till Bolagsverket/Skatteverket
4. Kontrollera om proportionerna mellan intäkter, kostnader och resultat verkar rimliga för branschen
5. För varje observation, ange om det kan åtgärdas automatiskt (fixable: true/false) och vilken åtgärd (fix_type)

Möjliga fix_type-värden:
- "approve_entries" - Godkänn utkast-verifikat
- "book_corporate_tax" - Bokför bolagsskatt (8910/2510)
- "book_year_end_closing" - Bokför årets resultat (8999/2099)
- "balance_correction" - Skapa korrigeringsverifikat
- null - Kräver manuell åtgärd

Svara BARA med JSON i detta format (ingen annan text):
{
  "risk_level": "low|medium|high",
  "summary": "kort sammanfattning",
  "observations": [
    {"severity": "critical|warning|info", "title": "titel", "detail": "beskrivning", "recommendation": "åtgärd", "fixable": true/false, "fix_type": "approve_entries|book_corporate_tax|book_year_end_closing|balance_correction|null"}
  ],
  "ready_for_submission": true/false
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-5',
            messages: [
              { role: 'system', content: 'Du är en erfaren svensk auktoriserad revisor. Svara alltid med valid JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
          try {
            aiAnalysis = JSON.parse(jsonMatch[1].trim());
          } catch {
            console.warn('Could not parse AI response as JSON:', content);
          }
        } else if (aiResponse.status === 429) {
          console.warn('AI rate limited');
        } else if (aiResponse.status === 402) {
          console.warn('AI payment required');
        }
      } catch (aiErr) {
        console.error('AI audit error:', aiErr);
      }
    }

    // Compute overall status
    const failCount = ruleChecks.filter(c => c.status === 'fail').length;
    const warningCount = ruleChecks.filter(c => c.status === 'warning').length;
    const criticalAI = (aiAnalysis?.observations || []).filter((o: any) => o.severity === 'critical').length;

    const overallStatus = failCount > 0 || criticalAI > 0
      ? 'fail'
      : warningCount > 3
        ? 'warning'
        : 'pass';

    // Count fixable issues
    const fixableRules = ruleChecks.filter(c => c.fixable && c.status !== 'pass');
    const fixableAI = (aiAnalysis?.observations || []).filter((o: any) => o.fixable);
    const totalFixable = fixableRules.length + fixableAI.length;

    return new Response(JSON.stringify({
      success: true,
      fiscal_year,
      overall_status: overallStatus,
      ready_for_submission: overallStatus !== 'fail' && (aiAnalysis?.ready_for_submission !== false),
      rule_checks: ruleChecks,
      ai_analysis: aiAnalysis,
      fixable_count: totalFixable,
      stats: {
        total_entries: (entries || []).length,
        total_debit: Math.round(totalDebit),
        total_credit: Math.round(totalCredit),
        total_revenue: Math.round(totalRevenue),
        total_costs: Math.round(totalCosts),
        pre_tax_result: Math.round(preResult),
        account_count: Object.keys(accountTotals).length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-year-end-audit:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── AUTO-FIX HANDLER ───
async function handleAutoFix(
  supabase: any,
  supabaseUser: any,
  user: any,
  companyId: string,
  fiscalYear: number,
  lovableApiKey: string | undefined,
) {
  const fixes: Array<{ action: string; success: boolean; detail: string }> = [];
  const startDate = `${fiscalYear}-01-01`;
  const endDate = `${fiscalYear}-12-31`;

  // 1. Auto-approve draft/pending entries
  const { data: unapproved } = await supabase
    .from('journal_entries')
    .select('id, description, status')
    .eq('company_id', companyId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .in('status', ['draft', 'pending_approval']);

  if (unapproved && unapproved.length > 0) {
    // Verify each entry is balanced before approving
    let approvedCount = 0;
    let skippedCount = 0;

    for (const entry of unapproved) {
      const { data: entryLines } = await supabase
        .from('journal_entry_lines')
        .select('debit, credit')
        .eq('journal_entry_id', entry.id);

      const totalD = (entryLines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
      const totalC = (entryLines || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0);

      if (Math.abs(totalD - totalC) < 0.01 && entryLines && entryLines.length > 0) {
        await supabaseUser
          .from('journal_entries')
          .update({ status: 'approved' })
          .eq('id', entry.id);
        approvedCount++;
      } else {
        skippedCount++;
      }
    }

    fixes.push({
      action: 'approve_entries',
      success: true,
      detail: `Godkände ${approvedCount} balanserade verifikat${skippedCount > 0 ? `, hoppade över ${skippedCount} obalanserade` : ''}`,
    });
  }

  // 2. Book corporate tax if missing
  const { data: taxCheck } = await supabase
    .from('journal_entry_lines')
    .select('id, account:chart_of_accounts!inner(account_number)')
    .eq('account.account_number', '8910')
    .eq('account.company_id', companyId)
    .limit(1);

  // Check if there are any existing tax entries for this fiscal year
  const hasTaxEntry = taxCheck && taxCheck.length > 0;

  if (!hasTaxEntry) {
    // Calculate revenue and costs
    const { data: allLines } = await supabase
      .from('journal_entry_lines')
      .select('debit, credit, account:chart_of_accounts!inner(account_number, company_id), journal_entry:journal_entries!inner(entry_date, company_id, status)')
      .eq('journal_entry.company_id', companyId)
      .eq('journal_entry.status', 'approved')
      .gte('journal_entry.entry_date', startDate)
      .lte('journal_entry.entry_date', endDate);

    let revenue = 0, costs = 0;
    for (const l of allLines || []) {
      const acc = l.account?.account_number || '';
      if (acc >= '3000' && acc <= '3999') revenue += (l.credit || 0) - (l.debit || 0);
      if (acc >= '4000' && acc <= '7999') costs += (l.debit || 0) - (l.credit || 0);
    }

    const preResult = revenue - costs;
    if (preResult > 0) {
      const taxAmount = Math.round(preResult * 0.206);

      // Get account IDs for 8910 and 2510
      const { data: taxAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number')
        .eq('company_id', companyId)
        .in('account_number', ['8910', '2510']);

      const acc8910 = taxAccounts?.find((a: any) => a.account_number === '8910');
      const acc2510 = taxAccounts?.find((a: any) => a.account_number === '2510');

      if (acc8910 && acc2510) {
        // Create journal entry for corporate tax
        const { data: je, error: jeErr } = await supabaseUser
          .from('journal_entries')
          .insert({
            company_id: companyId,
            entry_date: `${fiscalYear}-12-31`,
            description: `Beräknad bolagsskatt ${fiscalYear} (20,6%)`,
            status: 'draft',
            series_code: 'HB',
            created_by: user.id,
          })
          .select()
          .maybeSingle();

        if (!jeErr && je) {
          await supabaseUser.from('journal_entry_lines').insert([
            { journal_entry_id: je.id, account_id: acc8910.id, debit: taxAmount, credit: 0 },
            { journal_entry_id: je.id, account_id: acc2510.id, debit: 0, credit: taxAmount },
          ]);

          // Approve the entry
          await supabaseUser
            .from('journal_entries')
            .update({ status: 'approved' })
            .eq('id', je.id);

          fixes.push({
            action: 'book_corporate_tax',
            success: true,
            detail: `Bokfört bolagsskatt ${taxAmount.toLocaleString('sv-SE')} kr (20,6% av ${preResult.toLocaleString('sv-SE')} kr) på konto 8910/2510`,
          });
        }
      } else {
        fixes.push({
          action: 'book_corporate_tax',
          success: false,
          detail: 'Konto 8910 eller 2510 saknas i kontoplanen – skapa dessa först',
        });
      }
    }
  }

  // 3. Book year-end closing (8999/2099) if missing
  const { data: closingCheck } = await supabase
    .from('journal_entry_lines')
    .select('id, account:chart_of_accounts!inner(account_number)')
    .eq('account.account_number', '8999')
    .eq('account.company_id', companyId)
    .limit(1);

  if (!closingCheck || closingCheck.length === 0) {
    // Recalculate result after potential tax booking
    const { data: resultLines } = await supabase
      .from('journal_entry_lines')
      .select('debit, credit, account:chart_of_accounts!inner(account_number, company_id), journal_entry:journal_entries!inner(entry_date, company_id, status)')
      .eq('journal_entry.company_id', companyId)
      .eq('journal_entry.status', 'approved')
      .gte('journal_entry.entry_date', startDate)
      .lte('journal_entry.entry_date', endDate);

    let totalRevenue = 0, totalExpenses = 0;
    for (const l of resultLines || []) {
      const acc = l.account?.account_number || '';
      if (acc >= '3000' && acc <= '3999') totalRevenue += (l.credit || 0) - (l.debit || 0);
      if (acc >= '4000' && acc <= '8999' && acc !== '8999') totalExpenses += (l.debit || 0) - (l.credit || 0);
    }

    const netResult = totalRevenue - totalExpenses;

    const { data: closingAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number')
      .eq('company_id', companyId)
      .in('account_number', ['8999', '2099']);

    const acc8999 = closingAccounts?.find((a: any) => a.account_number === '8999');
    const acc2099 = closingAccounts?.find((a: any) => a.account_number === '2099');

    if (acc8999 && acc2099 && Math.abs(netResult) > 0) {
      const { data: je, error: jeErr } = await supabaseUser
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_date: `${fiscalYear}-12-31`,
          description: `Överföring av årets resultat ${fiscalYear}`,
          status: 'draft',
          series_code: 'HB',
          created_by: user.id,
        })
        .select()
        .maybeSingle();

      if (!jeErr && je) {
        if (netResult > 0) {
          // Profit: debit 8999, credit 2099
          await supabaseUser.from('journal_entry_lines').insert([
            { journal_entry_id: je.id, account_id: acc8999.id, debit: Math.round(netResult), credit: 0 },
            { journal_entry_id: je.id, account_id: acc2099.id, debit: 0, credit: Math.round(netResult) },
          ]);
        } else {
          // Loss: credit 8999, debit 2099
          const absResult = Math.round(Math.abs(netResult));
          await supabaseUser.from('journal_entry_lines').insert([
            { journal_entry_id: je.id, account_id: acc8999.id, debit: 0, credit: absResult },
            { journal_entry_id: je.id, account_id: acc2099.id, debit: absResult, credit: 0 },
          ]);
        }

        await supabaseUser
          .from('journal_entries')
          .update({ status: 'approved' })
          .eq('id', je.id);

        fixes.push({
          action: 'book_year_end_closing',
          success: true,
          detail: `Bokfört årets resultat ${Math.round(netResult).toLocaleString('sv-SE')} kr på konto 8999/2099`,
        });
      }
    } else if (!acc8999 || !acc2099) {
      fixes.push({
        action: 'book_year_end_closing',
        success: false,
        detail: 'Konto 8999 eller 2099 saknas i kontoplanen – skapa dessa först',
      });
    }
  }

  // 4. VAT reconciliation — create correcting entry for VAT difference
  const { data: vatDeclarations } = await supabase
    .from('vat_declarations')
    .select('*')
    .eq('company_id', companyId)
    .gte('period_start', startDate)
    .lte('period_end', endDate);

  const totalVatDeclared = (vatDeclarations || []).reduce((s: number, v: any) => s + Number(v.vat_to_pay || 0), 0);

  // Get all VAT account lines
  const { data: vatLines } = await supabase
    .from('journal_entry_lines')
    .select('debit, credit, account:chart_of_accounts!inner(account_number, company_id), journal_entry:journal_entries!inner(entry_date, company_id, status)')
    .eq('journal_entry.company_id', companyId)
    .eq('journal_entry.status', 'approved')
    .gte('journal_entry.entry_date', startDate)
    .lte('journal_entry.entry_date', endDate);

  let vatBooked = 0;
  for (const l of vatLines || []) {
    const acc = l.account?.account_number || '';
    if (acc.startsWith('26')) {
      vatBooked += (l.credit || 0) - (l.debit || 0);
    }
  }

  const vatDiff = totalVatDeclared - vatBooked;
  if (Math.abs(vatDiff) >= 100) {
    // Get or create account 2650 (Redovisningskonto för moms)
    let { data: vatAdjustAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number')
      .eq('company_id', companyId)
      .in('account_number', ['2650', '3740']);

    const acc2650 = vatAdjustAccounts?.find((a: any) => a.account_number === '2650');
    const acc3740 = vatAdjustAccounts?.find((a: any) => a.account_number === '3740');

    if (acc2650) {
      // Create a VAT adjustment entry
      const adjustAccountId = acc3740?.id || acc2650.id; // Use öresavrundning if available, else moms clearing
      const { data: je, error: jeErr } = await supabaseUser
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_date: `${fiscalYear}-12-31`,
          description: `Momsavstämning ${fiscalYear} — korrigering av differens ${Math.round(vatDiff).toLocaleString('sv-SE')} kr`,
          status: 'draft',
          series_code: 'HB',
          created_by: user.id,
        })
        .select()
        .maybeSingle();

      if (!jeErr && je) {
        if (vatDiff > 0) {
          // More declared than booked — need to increase VAT liability
          await supabaseUser.from('journal_entry_lines').insert([
            { journal_entry_id: je.id, account_id: adjustAccountId, debit: Math.round(Math.abs(vatDiff)), credit: 0 },
            { journal_entry_id: je.id, account_id: acc2650.id, debit: 0, credit: Math.round(Math.abs(vatDiff)) },
          ]);
        } else {
          // Less declared than booked — reduce VAT liability
          await supabaseUser.from('journal_entry_lines').insert([
            { journal_entry_id: je.id, account_id: acc2650.id, debit: Math.round(Math.abs(vatDiff)), credit: 0 },
            { journal_entry_id: je.id, account_id: adjustAccountId, debit: 0, credit: Math.round(Math.abs(vatDiff)) },
          ]);
        }

        // Auto-approve
        await supabaseUser
          .from('journal_entries')
          .update({ status: 'approved' })
          .eq('id', je.id);

        fixes.push({
          action: 'vat_reconciliation',
          success: true,
          detail: `Momsavstämning: korrigerat differens på ${Math.round(Math.abs(vatDiff)).toLocaleString('sv-SE')} kr mellan deklarerad och bokförd moms via konto 2650`,
        });
      }
    } else {
      fixes.push({
        action: 'vat_reconciliation',
        success: false,
        detail: 'Konto 2650 (Redovisningskonto för moms) saknas — skapa kontot först',
      });
    }
  }

  // Log all fixes in audit trail
  for (const fix of fixes) {
    if (fix.success) {
      await supabase.from('audit_events').insert({
        user_id: user.id,
        entity_type: 'year_end_audit',
        entity_id: companyId,
        event_type: `auto_fix_${fix.action}`,
        new_data: { detail: fix.detail, fiscal_year: fiscalYear },
        processing_purpose: 'Automatisk bokslutskorrigering',
        legal_basis: 'legitimate_interest',
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    fixes,
    message: fixes.filter(f => f.success).length > 0
      ? `Åtgärdade ${fixes.filter(f => f.success).length} problem automatiskt`
      : 'Inga automatiska åtgärder kunde utföras',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
