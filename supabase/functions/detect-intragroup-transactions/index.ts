import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface DetectedElimination {
  company_a_id: string;
  company_a_name: string;
  company_b_id: string;
  company_b_name: string;
  elimination_type: string;
  amount: number;
  currency: string;
  description: string;
  confidence: number;
  journal_a_id: string;
  journal_b_id: string;
  date: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { group_id, year } = await req.json();
    if (!group_id || !year) throw new Error("Missing group_id or year");

    // Get group with companies
    const { data: group, error: groupErr } = await supabase
      .from("groups")
      .select("*, companies:companies!companies_group_id_fkey(id, name, currency)")
      .eq("id", group_id)
      .maybeSingle();

    if (groupErr) throw groupErr;
    if (!group || !group.companies || group.companies.length < 2) {
      return new Response(JSON.stringify({ detected: [], message: "Minst 2 bolag krävs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fiscalStart = group.fiscal_year_start || 1;
    const periodStart = `${year}-${String(fiscalStart).padStart(2, "0")}-01`;
    const endYear = fiscalStart === 1 ? year : year + 1;
    const endMonth = fiscalStart === 1 ? 12 : fiscalStart - 1;
    const lastDay = new Date(endYear, endMonth, 0).getDate();
    const periodEnd = `${endYear}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

    const companyIds = group.companies.map((c: any) => c.id);
    const companyMap = new Map(group.companies.map((c: any) => [c.id, c]));

    console.log(`Detecting intra-group transactions for ${companyIds.length} companies, period ${periodStart} to ${periodEnd}`);

    // Load all approved journal entries with lines for all companies in the group
    const { data: entries, error: entriesErr } = await supabase
      .from("journal_entries")
      .select(`
        id, company_id, entry_date, description,
        journal_entry_lines(id, debit, credit, account_id,
          chart_of_accounts:account_id(account_number, account_name, account_type)
        )
      `)
      .in("company_id", companyIds)
      .eq("status", "approved")
      .gte("entry_date", periodStart)
      .lte("entry_date", periodEnd);

    if (entriesErr) throw entriesErr;

    console.log(`Loaded ${entries?.length || 0} journal entries`);

    // Group entries by company
    const entriesByCompany = new Map<string, typeof entries>();
    for (const entry of entries || []) {
      const list = entriesByCompany.get(entry.company_id) || [];
      list.push(entry);
      entriesByCompany.set(entry.company_id, list);
    }

    // Load existing eliminations to avoid duplicates
    const { data: existingElims } = await supabase
      .from("eliminations")
      .select("company_a_id, company_b_id, amount, elimination_type")
      .eq("group_id", group_id)
      .gte("period_start", periodStart)
      .lte("period_end", periodEnd);

    const existingSet = new Set(
      (existingElims || []).map(e =>
        `${e.company_a_id}|${e.company_b_id}|${Math.round(e.amount * 100)}|${e.elimination_type}`
      )
    );

    const detected: DetectedElimination[] = [];

    // Compare pairs of companies
    for (let i = 0; i < companyIds.length; i++) {
      for (let j = i + 1; j < companyIds.length; j++) {
        const compA = companyIds[i];
        const compB = companyIds[j];
        const entriesA = entriesByCompany.get(compA) || [];
        const entriesB = entriesByCompany.get(compB) || [];

        // Build amount index for company B entries
        const bAmountIndex = new Map<number, any[]>();
        for (const entryB of entriesB) {
          for (const line of entryB.journal_entry_lines || []) {
            const amt = Math.round(((line.debit || 0) + (line.credit || 0)) * 100);
            if (amt === 0) continue;
            const list = bAmountIndex.get(amt) || [];
            list.push({ ...line, entry: entryB });
            bAmountIndex.set(amt, list);
          }
        }

        // For each entry in A, look for matching opposite amounts in B
        for (const entryA of entriesA) {
          for (const lineA of entryA.journal_entry_lines || []) {
            const debitA = lineA.debit || 0;
            const creditA = lineA.credit || 0;
            if (debitA === 0 && creditA === 0) continue;

            const accNum = lineA.chart_of_accounts?.account_number || "";
            const accType = lineA.chart_of_accounts?.account_type || "";

            // Look for receivable/payable matches (1500-1699 vs 2400-2499)
            const isReceivable = accNum >= "1500" && accNum <= "1699";
            const isPayable = accNum >= "2400" && accNum <= "2499";
            const isRevenue = accNum >= "3000" && accNum <= "3999";
            const isExpense = accNum >= "4000" && accNum <= "7999";

            if (!isReceivable && !isPayable && !isRevenue && !isExpense) continue;

            const searchAmt = Math.round((debitA + creditA) * 100);
            const candidates = bAmountIndex.get(searchAmt) || [];

            for (const candLine of candidates) {
              const candAccNum = candLine.chart_of_accounts?.account_number || "";
              const candDebit = candLine.debit || 0;
              const candCredit = candLine.credit || 0;

              let isMatch = false;
              let elimType = "";
              let confidence = 0.5;

              // Receivable in A vs Payable in B
              if (isReceivable && candAccNum >= "2400" && candAccNum <= "2499" && debitA > 0 && candCredit > 0) {
                isMatch = true;
                elimType = "intercompany_receivable";
                confidence = 0.9;
              }
              // Payable in A vs Receivable in B
              else if (isPayable && candAccNum >= "1500" && candAccNum <= "1699" && creditA > 0 && candDebit > 0) {
                isMatch = true;
                elimType = "intercompany_payable";
                confidence = 0.9;
              }
              // Revenue in A vs Expense in B
              else if (isRevenue && candAccNum >= "4000" && candAccNum <= "7999") {
                isMatch = true;
                elimType = "intercompany_revenue";
                confidence = 0.7;
              }
              // Expense in A vs Revenue in B
              else if (isExpense && candAccNum >= "3000" && candAccNum <= "3999") {
                isMatch = true;
                elimType = "intercompany_expense";
                confidence = 0.7;
              }

              if (!isMatch) continue;

              // Date proximity boost
              const dateA = new Date(entryA.entry_date);
              const dateB = new Date(candLine.entry.entry_date);
              const dayDiff = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
              if (dayDiff <= 3) confidence = Math.min(confidence + 0.1, 1.0);

              // Description similarity boost
              const descA = (entryA.description || "").toLowerCase();
              const descB = (candLine.entry.description || "").toLowerCase();
              if (descA && descB && (descA.includes(descB) || descB.includes(descA))) {
                confidence = Math.min(confidence + 0.05, 1.0);
              }

              const amount = debitA || creditA;
              const key = `${compA}|${compB}|${Math.round(amount * 100)}|${elimType}`;
              const keyReverse = `${compB}|${compA}|${Math.round(amount * 100)}|${elimType}`;

              // Skip if already exists
              if (existingSet.has(key) || existingSet.has(keyReverse)) continue;

              // Skip if already detected
              if (detected.some(d =>
                d.company_a_id === compA && d.company_b_id === compB &&
                Math.abs(d.amount - amount) < 0.01 && d.elimination_type === elimType
              )) continue;

              const compAData = companyMap.get(compA)!;
              const compBData = companyMap.get(compB)!;

              detected.push({
                company_a_id: compA,
                company_a_name: compAData.name,
                company_b_id: compB,
                company_b_name: compBData.name,
                elimination_type: elimType,
                amount,
                currency: compAData.currency || group.currency,
                description: `${entryA.description || ""} / ${candLine.entry.description || ""}`.trim(),
                confidence,
                journal_a_id: entryA.id,
                journal_b_id: candLine.entry.id,
                date: entryA.entry_date,
              });
            }
          }
        }
      }
    }

    // Sort by confidence desc
    detected.sort((a, b) => b.confidence - a.confidence);

    console.log(`Detected ${detected.length} potential intra-group eliminations`);

    return new Response(JSON.stringify({ detected, period: { start: periodStart, end: periodEnd } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Detection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
