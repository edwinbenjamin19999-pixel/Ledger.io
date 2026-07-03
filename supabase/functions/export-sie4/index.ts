import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders, handleCors } from "../_shared/cors.ts";

function formatSIEDate(dateStr: string): string {
  return dateStr.replace(/-/g, '').slice(0, 8);
}

function encodeSIEString(str: string): string {
  if (!str) return '""';
  return `"${str.replace(/"/g, "'")}"`;
}

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Inte inloggad');

    const { companyId, fiscalYearStart, fiscalYearEnd } = await req.json();
    if (!companyId) throw new Error('Saknar company_id');

    // Default fiscal year: current calendar year
    const now = new Date();
    const yearStart = fiscalYearStart || `${now.getFullYear()}-01-01`;
    const yearEnd = fiscalYearEnd || `${now.getFullYear()}-12-31`;

    // 1. Load company info
    const { data: company } = await supabaseClient
      .from('companies')
      .select('name, org_number, currency')
      .eq('id', companyId)
      .maybeSingle();

    if (!company) throw new Error('Företag hittades inte');

    // 2. Load chart of accounts
    const { data: accounts } = await supabaseClient
      .from('chart_of_accounts')
      .select('id, account_number, account_name, account_type')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('account_number');

    const accountMap = new Map<string, { number: string; name: string }>();
    for (const a of (accounts || [])) {
      accountMap.set(a.id, { number: a.account_number, name: a.account_name });
    }

    // 3. Load ALL approved journal entries with lines for the fiscal year
    const allEntries: any[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabaseClient
        .from('journal_entries')
        .select(`
          id, entry_date, description, journal_number, series_code,
          journal_entry_lines (
            account_id, debit, credit
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .gte('entry_date', yearStart)
        .lte('entry_date', yearEnd)
        .order('entry_date')
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      allEntries.push(...(data || []));
      hasMore = (data?.length || 0) === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    // 4. Calculate opening balances (IB) — sum of all approved entries BEFORE yearStart for balance sheet accounts (1xxx-2xxx)
    const ibLines: any[] = [];
    let ibOffset = 0;
    let ibHasMore = true;

    while (ibHasMore) {
      const { data, error } = await supabaseClient
        .from('journal_entry_lines')
        .select(`
          account_id, debit, credit,
          journal_entries!inner (company_id, status, entry_date)
        `)
        .eq('journal_entries.company_id', companyId)
        .eq('journal_entries.status', 'approved')
        .lt('journal_entries.entry_date', yearStart)
        .range(ibOffset, ibOffset + PAGE_SIZE - 1);

      if (error) throw error;
      ibLines.push(...(data || []));
      ibHasMore = (data?.length || 0) === PAGE_SIZE;
      ibOffset += PAGE_SIZE;
    }

    // Aggregate IB per account
    const ibBalances = new Map<string, number>();
    for (const line of ibLines) {
      const acc = accountMap.get(line.account_id);
      if (!acc) continue;
      const num = parseInt(acc.number);
      // Only balance sheet accounts (1xxx-2xxx) have opening balances
      if (num < 1000 || num >= 3000) continue;
      const current = ibBalances.get(acc.number) || 0;
      ibBalances.set(acc.number, current + (line.debit || 0) - (line.credit || 0));
    }

    // 5. Calculate closing balances (UB) = IB + period movements for balance sheet accounts
    const periodMovements = new Map<string, number>();
    for (const entry of allEntries) {
      for (const line of (entry.journal_entry_lines || [])) {
        const acc = accountMap.get(line.account_id);
        if (!acc) continue;
        const current = periodMovements.get(acc.number) || 0;
        periodMovements.set(acc.number, current + (line.debit || 0) - (line.credit || 0));
      }
    }

    // Calculate result (RES) for income/expense accounts (3xxx-8xxx)
    const resBalances = new Map<string, number>();
    for (const [accNum, amount] of periodMovements) {
      const num = parseInt(accNum);
      if (num >= 3000 && num < 9000) {
        resBalances.set(accNum, amount);
      }
    }

    const ubBalances = new Map<string, number>();
    for (const acc of (accounts || [])) {
      const num = parseInt(acc.account_number);
      if (num >= 1000 && num < 3000) {
        const ib = ibBalances.get(acc.account_number) || 0;
        const movement = periodMovements.get(acc.account_number) || 0;
        const ub = ib + movement;
        if (ub !== 0) ubBalances.set(acc.account_number, ub);
      }
    }

    // 6. Build SIE4 file content
    const lines: string[] = [];

    // Header
    lines.push('#FILTYP 4');
    lines.push('#SIETYP 4');
    lines.push(`#PROGRAM ${encodeSIEString('NorthLedger')} "1.0"`);
    lines.push(`#FORMAT PC8`);
    lines.push(`#GEN ${formatSIEDate(new Date().toISOString().slice(0, 10))}`);
    lines.push(`#FNAMN ${encodeSIEString(company.name)}`);
    if (company.org_number) {
      lines.push(`#ORGNR ${company.org_number}`);
    }
    lines.push(`#VALUTA ${company.currency || 'SEK'}`);
    lines.push(`#RAR 0 ${formatSIEDate(yearStart)} ${formatSIEDate(yearEnd)}`);
    lines.push('');

    // Accounts (#KONTO)
    for (const acc of (accounts || [])) {
      lines.push(`#KONTO ${acc.account_number} ${encodeSIEString(acc.account_name)}`);
    }
    lines.push('');

    // Opening balances (#IB)
    for (const [accNum, amount] of ibBalances) {
      if (amount !== 0) {
        lines.push(`#IB 0 ${accNum} ${amount.toFixed(2)}`);
      }
    }
    lines.push('');

    // Closing balances (#UB) for balance sheet accounts
    for (const [accNum, amount] of ubBalances) {
      lines.push(`#UB 0 ${accNum} ${amount.toFixed(2)}`);
    }
    lines.push('');

    // Result (#RES) for income/expense accounts
    for (const [accNum, amount] of resBalances) {
      if (amount !== 0) {
        lines.push(`#RES 0 ${accNum} ${amount.toFixed(2)}`);
      }
    }
    lines.push('');

    // Verifications (#VER)
    for (const entry of allEntries) {
      const series = entry.series_code || 'A';
      const verNum = entry.journal_number || '';
      const date = formatSIEDate(entry.entry_date);
      const desc = encodeSIEString(entry.description || '');

      lines.push(`#VER ${encodeSIEString(series)} ${encodeSIEString(verNum)} ${date} ${desc}`);
      lines.push('{');

      for (const line of (entry.journal_entry_lines || [])) {
        const acc = accountMap.get(line.account_id);
        if (!acc) continue;
        // SIE uses signed amounts: debit positive, credit negative
        const amount = (line.debit || 0) - (line.credit || 0);
        const lineDesc = encodeSIEString(line.description || '');
        lines.push(`  #TRANS ${acc.number} {} ${amount.toFixed(2)} ${date} ${lineDesc}`);
      }

      lines.push('}');
    }

    const sieContent = lines.join('\r\n');
    const fileName = `SIE4_${company.name.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, '_')}_${yearStart}_${yearEnd}.se`;

    console.log(`SIE4 export: ${accounts?.length || 0} accounts, ${allEntries.length} verifications, ${ibBalances.size} IB, ${ubBalances.size} UB`);

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        content: sieContent,
        summary: {
          accounts: accounts?.length || 0,
          verifications: allEntries.length,
          openingBalances: ibBalances.size,
          closingBalances: ubBalances.size,
          resultAccounts: resBalances.size,
          period: `${yearStart} – ${yearEnd}`,
          company: company.name,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in export-sie4:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Export misslyckades',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
