// supabase/functions/detect-adjustment-suggestions/index.ts
// Heuristic + AI-driven detection of bokslutsjusteringar.
// Scans GL data for: missing accruals, missing depreciation, variance vs prior year, missing notes.
// Writes results to annual_report_ai_suggestions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIWithFallback, MODEL_CHAINS } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  annual_report_id: string;
  company_id: string;
  fiscal_year: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as ReqBody;
    if (!body.annual_report_id || !body.company_id || !body.fiscal_year) {
      return new Response(JSON.stringify({ error: "missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPA_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPA_URL, SUPA_KEY);

    const start = `${body.fiscal_year}-01-01`;
    const end = `${body.fiscal_year}-12-31`;
    const prevStart = `${body.fiscal_year - 1}-01-01`;
    const prevEnd = `${body.fiscal_year - 1}-12-31`;

    // Fetch GL aggregated by account for current + prior year
    const { data: entries } = await supa
      .from("journal_entries")
      .select("id, entry_date")
      .eq("company_id", body.company_id)
      .eq("status", "approved")
      .gte("entry_date", prevStart)
      .lte("entry_date", end);

    const entryIds = (entries || []).map((e: any) => e.id);
    const entryDateById = new Map<string, string>();
    (entries || []).forEach((e: any) => entryDateById.set(e.id, e.entry_date));

    type Agg = { name: string; debit: number; credit: number; debitPrev: number; creditPrev: number; monthsHit: Set<number> };
    const map = new Map<string, Agg>();

    for (let i = 0; i < entryIds.length; i += 100) {
      const batch = entryIds.slice(i, i + 100);
      const { data: lines } = await supa
        .from("journal_entry_lines")
        .select("debit, credit, journal_entry_id, chart_of_accounts(account_number, account_name)")
        .in("journal_entry_id", batch);
      for (const l of lines || []) {
        const num: string = (l as any).chart_of_accounts?.account_number || "";
        const name: string = (l as any).chart_of_accounts?.account_name || "";
        const date = entryDateById.get((l as any).journal_entry_id) || "";
        const inCurrent = date >= start && date <= end;
        if (!map.has(num)) map.set(num, { name, debit: 0, credit: 0, debitPrev: 0, creditPrev: 0, monthsHit: new Set() });
        const a = map.get(num)!;
        if (inCurrent) {
          a.debit += Number((l as any).debit) || 0;
          a.credit += Number((l as any).credit) || 0;
          const m = parseInt(date.slice(5, 7), 10);
          if (!isNaN(m)) a.monthsHit.add(m);
        } else {
          a.debitPrev += Number((l as any).debit) || 0;
          a.creditPrev += Number((l as any).credit) || 0;
        }
      }
    }

    const suggestions: Array<{
      suggestion_type: string;
      title: string;
      explanation: string;
      impact_amount: number | null;
      affected_accounts: string[];
      proposed_adjustment: any;
      confidence: number;
      severity: string;
      source_refs: any;
    }> = [];

    // ── 1. ACCRUAL DETECTION
    // Recurring monthly cost (>=8 months) without booking in December
    for (const [num, a] of map.entries()) {
      if (!num.startsWith("5") && !num.startsWith("6") && !num.startsWith("7")) continue;
      if (a.monthsHit.size >= 8 && !a.monthsHit.has(12)) {
        const avgMonthly = (a.debit - a.credit) / Math.max(1, a.monthsHit.size);
        if (avgMonthly > 1000) {
          suggestions.push({
            suggestion_type: "accrual",
            title: `Saknad periodisering: ${num} ${a.name}`,
            explanation: `Kontot har bokningar under ${a.monthsHit.size} månader men ingen i december. Genomsnittlig månadskostnad ~${Math.round(avgMonthly).toLocaleString("sv-SE")} kr. Förslag: periodisera december.`,
            impact_amount: -Math.round(avgMonthly),
            affected_accounts: [num],
            proposed_adjustment: {
              account_number: num,
              debit: Math.round(avgMonthly),
              credit: 0,
              description: `Periodisering december ${body.fiscal_year}`,
              affected_areas: ["RR", "BR"],
            },
            confidence: 0.78,
            severity: "medium",
            source_refs: { months_hit: Array.from(a.monthsHit), avg_monthly: avgMonthly },
          });
        }
      }
    }

    // ── 2. DEPRECIATION DETECTION
    // Accounts 1210-1259 (machinery/equipment) without matching 7820-7829 entry
    let hasMaterialAssets = false;
    let materialAssetsValue = 0;
    for (const [num, a] of map.entries()) {
      if (num >= "1210" && num <= "1259") {
        const net = a.debit - a.credit;
        if (net > 0) {
          hasMaterialAssets = true;
          materialAssetsValue += net;
        }
      }
    }
    let hasDepreciation = false;
    for (const [num, a] of map.entries()) {
      if (num >= "7820" && num <= "7829" && (a.debit - a.credit) !== 0) hasDepreciation = true;
    }
    if (hasMaterialAssets && !hasDepreciation && materialAssetsValue > 0) {
      const fiveYearStraightLine = Math.round(materialAssetsValue / 5);
      suggestions.push({
        suggestion_type: "depreciation",
        title: "Avskrivning saknas på materiella anläggningstillgångar",
        explanation: `Anläggningstillgångar finns på konto 1210-1259 (~${Math.round(materialAssetsValue).toLocaleString("sv-SE")} kr) men ingen avskrivning är bokförd på 7820-7829. Förslag: 5-årig linjär avskrivning.`,
        impact_amount: -fiveYearStraightLine,
        affected_accounts: ["1219", "7820"],
        proposed_adjustment: {
          account_number: "7820",
          debit: fiveYearStraightLine,
          credit: 0,
          description: `Avskrivning maskiner/inventarier ${body.fiscal_year} (5-årig linjär)`,
          affected_areas: ["RR", "BR"],
        },
        confidence: 0.72,
        severity: "high",
        source_refs: { asset_value: materialAssetsValue, method: "5y_straight_line" },
      });
    }

    // ── 3. VARIANCE DETECTION (>150% vs prior year)
    for (const [num, a] of map.entries()) {
      if (!num.startsWith("5") && !num.startsWith("6") && !num.startsWith("7")) continue;
      const cur = Math.abs(a.debit - a.credit);
      const prev = Math.abs(a.debitPrev - a.creditPrev);
      if (prev > 5000 && cur > prev * 1.5) {
        const pct = Math.round((cur / prev - 1) * 100);
        suggestions.push({
          suggestion_type: "variance",
          title: `Ovanlig avvikelse: ${num} ${a.name}`,
          explanation: `${num} ${a.name} ökade med ${pct}% jämfört med föregående år (${Math.round(prev).toLocaleString("sv-SE")} → ${Math.round(cur).toLocaleString("sv-SE")} kr). Granska om det är korrekt eller om periodisering saknas.`,
          impact_amount: null,
          affected_accounts: [num],
          proposed_adjustment: null,
          confidence: 0.6,
          severity: pct > 300 ? "high" : "medium",
          source_refs: { prev_year: prev, current_year: cur, pct_change: pct },
        });
      }
    }

    // ── 4. MISSING NOTES (heuristic: classes that trigger required K2 notes)
    let hasEmployees = false;
    let hasFixedAssets = false;
    let hasLoans = false;
    for (const [num, a] of map.entries()) {
      if (num >= "7000" && num <= "7699" && (a.debit - a.credit) !== 0) hasEmployees = true;
      if (num >= "1010" && num <= "1299" && (a.debit - a.credit) > 0) hasFixedAssets = true;
      if (num >= "2350" && num <= "2399" && (a.credit - a.debit) > 0) hasLoans = true;
    }
    const { data: report } = await supa.from("annual_reports").select("notes").eq("id", body.annual_report_id).maybeSingle();
    const existingNotes = ((report?.notes as any) || {}) as Record<string, string>;
    const noteRequired = (key: string, title: string, hint: string) => {
      if (!existingNotes[key] || existingNotes[key].trim().length < 20) {
        suggestions.push({
          suggestion_type: "missing_note",
          title: `Saknad not: ${title}`,
          explanation: hint,
          impact_amount: null,
          affected_accounts: [],
          proposed_adjustment: null,
          confidence: 0.85,
          severity: "high",
          source_refs: { note_key: key },
        });
      }
    };
    if (hasEmployees) noteRequired("anstallda", "Medelantal anställda", "Bokföring på 7000-7699 indikerar anställda. K2/K3 kräver upplysning om medelantal anställda.");
    if (hasFixedAssets) noteRequired("avskrivningsprinciper", "Avskrivningsprinciper", "Materiella/immateriella anläggningstillgångar finns. K2/K3 kräver beskrivning av avskrivningsprinciper.");
    if (hasLoans) noteRequired("langfristiga_skulder", "Långfristiga skulder", "Långfristiga skulder finns på 2350-2399. K2/K3 kräver specifikation av förfallotid.");

    // Insert all suggestions (idempotent: clear existing 'pending' first to avoid duplicates)
    await supa
      .from("annual_report_ai_suggestions")
      .delete()
      .eq("annual_report_id", body.annual_report_id)
      .eq("status", "pending");

    if (suggestions.length > 0) {
      const rows = suggestions.map((s) => ({
        annual_report_id: body.annual_report_id,
        company_id: body.company_id,
        suggestion_type: s.suggestion_type,
        title: s.title,
        explanation: s.explanation,
        impact_amount: s.impact_amount,
        affected_accounts: s.affected_accounts,
        proposed_adjustment: s.proposed_adjustment,
        confidence: s.confidence,
        severity: s.severity,
        status: "pending",
        source_refs: s.source_refs,
        model_version: "heuristic-v1",
      }));
      const { error } = await supa.from("annual_report_ai_suggestions").insert(rows);
      if (error) console.error("insert err", error);
    }

    return new Response(JSON.stringify({ ok: true, count: suggestions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
