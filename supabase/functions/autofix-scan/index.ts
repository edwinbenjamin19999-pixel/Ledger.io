// AI Autofix - Scan engine
// Detects fixable issues across modules and upserts findings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface Finding {
  module: string;
  rule_key: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  title: string;
  description: string;
  suggested_action: string;
  entity_table?: string;
  entity_id?: string;
  payload?: Record<string, unknown>;
}

// Round summa exkl. kyrkoavgift to nearest int = skattetabell.
// We can't import the kommun map from src/, so we keep authoritative table on the client
// and only flag mismatches the caller passes in. To keep this self-contained, we
// instead detect HR cases that are clearly wrong: missing tax_table or tax_table outside 1-40.
async function detectHR(supabase: any, companyId: string): Promise<Finding[]> {
  const out: Finding[] = [];
  const { data: emps } = await supabase
    .from("employees")
    .select("id, first_name, last_name, municipality, tax_table, tax_column, birth_date")
    .eq("company_id", companyId)
    .eq("is_active", true);
  if (!emps) return out;
  for (const e of emps) {
    const name = `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "Anställd";
    if (!e.municipality) {
      out.push({
        module: "hr",
        rule_key: "hr.missing_municipality",
        severity: "high",
        confidence: 100,
        title: `${name}: kommun saknas`,
        description: "Utan kommun kan vi inte beräkna korrekt skattetabell.",
        suggested_action: "Sätt kommun manuellt på den anställde.",
        entity_table: "employees",
        entity_id: e.id,
        payload: { fix_kind: "manual" },
      });
      continue;
    }
    const tt = parseInt(String(e.tax_table ?? ""), 10);
    if (!tt || tt < 29 || tt > 40) {
      out.push({
        module: "hr",
        rule_key: "hr.tax_table_invalid",
        severity: "high",
        confidence: 98,
        title: `${name}: skattetabell saknas eller ogiltig`,
        description: `Skattetabell "${e.tax_table ?? "(tom)"}" är inte giltig. Hämta från kommun.`,
        suggested_action: "Sätt skattetabell automatiskt från kommun.",
        entity_table: "employees",
        entity_id: e.id,
        payload: { fix_kind: "hr.set_tax_table_from_municipality", municipality: e.municipality },
      });
    }
    const col = parseInt(String(e.tax_column ?? ""), 10);
    if (!col || col < 1 || col > 6) {
      out.push({
        module: "hr",
        rule_key: "hr.tax_column_invalid",
        severity: "medium",
        confidence: 95,
        title: `${name}: skattekolumn saknas`,
        description: "Kolumn bestäms av ålder (1 = under 66, 2 = fyllt 66).",
        suggested_action: "Beräkna kolumn från personnummer/födelsedatum.",
        entity_table: "employees",
        entity_id: e.id,
        payload: { fix_kind: "hr.set_tax_column_from_age" },
      });
    }
  }
  return out;
}

async function detectJournal(supabase: any, companyId: string): Promise<Finding[]> {
  const out: Finding[] = [];
  // Draft journal entries with 0 lines older than 24h => orphaned
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, description, status, created_at")
    .eq("company_id", companyId)
    .eq("status", "draft")
    .lt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if (!entries) return out;
  for (const je of entries) {
    const { count } = await supabase
      .from("journal_entry_lines")
      .select("*", { count: "exact", head: true })
      .eq("journal_entry_id", je.id);
    if ((count ?? 0) === 0) {
      out.push({
        module: "accounting",
        rule_key: "journal.draft_no_lines",
        severity: "medium",
        confidence: 99,
        title: `Tom utkastverifikation: ${je.description ?? je.id.slice(0, 8)}`,
        description: "Verifikationen saknar konteringsrader och har inte rörts på över 24h.",
        suggested_action: "Ta bort den tomma verifikationen.",
        entity_table: "journal_entries",
        entity_id: je.id,
        payload: { fix_kind: "journal.delete_orphan_draft" },
      });
    }
  }
  return out;
}

async function detectPayroll(supabase: any, companyId: string): Promise<Finding[]> {
  const out: Finding[] = [];
  const { data: runs } = await supabase
    .from("payroll_runs")
    .select("id, period_start, status, total_gross, total_net")
    .eq("company_id", companyId)
    .eq("status", "approved");
  if (!runs) return out;
  for (const r of runs) {
    const { data: je } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", companyId)
      .eq("series_code", "LN")
      .ilike("description", `%${String(r.period_start).slice(0, 7)}%`)
      .limit(1);
    if (!je || je.length === 0) {
      out.push({
        module: "payroll",
        rule_key: "payroll.missing_journal_entry",
        severity: "high",
        confidence: 96,
        title: `Lönekörning ${String(r.period_start).slice(0, 7)} saknar verifikation`,
        description: "Godkänd lönekörning har ingen kopplad bokföringsverifikation.",
        suggested_action: "Skapa LN-verifikation från lönekörningen.",
        entity_table: "payroll_runs",
        entity_id: r.id,
        payload: { fix_kind: "payroll.create_journal_entry" },
      });
    }
  }
  return out;
}

// Balansräkningen i balans? Tillgångar (1xxx) = EK+Skulder (2xxx) + Resultat (3-8xxx).
// Flaggas som CRITICAL — blockerar periodstängning och måste åtgärdas.
async function detectBalance(supabase: any, companyId: string): Promise<Finding[]> {
  const out: Finding[] = [];
  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(company_id, status)")
    .eq("journal_entries.company_id", companyId)
    .eq("chart_of_accounts.company_id", companyId)
    .in("journal_entries.status", ["posted", "approved"]);
  if (!lines || lines.length === 0) return out;

  let assets = 0, liabEq = 0, result = 0;
  for (const l of lines as Array<{ debit: number | null; credit: number | null; chart_of_accounts: { account_number: string } }>) {
    const acc = l.chart_of_accounts?.account_number ?? "";
    const d = Number(l.debit ?? 0), c = Number(l.credit ?? 0);
    if (acc.startsWith("1")) assets += d - c;
    else if (acc.startsWith("2")) liabEq += c - d;
    else if (/^[3-8]/.test(acc)) result += c - d;
  }
  const diff = assets - (liabEq + result);
  if (Math.abs(diff) > 1) {
    out.push({
      module: "accounting",
      rule_key: "accounting.br_imbalance",
      severity: "critical",
      confidence: 100,
      title: `Balansräkningen är ur balans (${Math.round(diff).toLocaleString("sv-SE")} kr)`,
      description: `Tillgångar (${Math.round(assets).toLocaleString("sv-SE")} kr) ≠ Eget kapital + Skulder + Resultat (${Math.round(liabEq + result).toLocaleString("sv-SE")} kr). Periodstängning blockerad tills BR balanserar.`,
      suggested_action: "Öppna Undersök obalans i Rapporter för att se vilken verifikation som skapar differensen.",
      payload: { fix_kind: "manual", diff, assets, liabEq, result, route: "/reports?lens=BR&investigate=1" },
    });
  }
  return out;

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const { company_id, modules } = await req.json();
    if (!company_id) return corsError("company_id krävs", 400);

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const t0 = Date.now();
    const want: string[] = Array.isArray(modules) && modules.length
      ? modules
      : ["hr", "accounting", "payroll"];
    const all: Finding[] = [];
    if (want.includes("hr")) all.push(...await detectHR(supabase, company_id));
    if (want.includes("accounting")) {
      all.push(...await detectJournal(supabase, company_id));
      all.push(...await detectBalance(supabase, company_id));
    }
    if (want.includes("payroll")) all.push(...await detectPayroll(supabase, company_id));

    let inserted = 0;
    for (const f of all) {
      const { error } = await supabase.from("autofix_findings").upsert(
        {
          company_id,
          module: f.module,
          rule_key: f.rule_key,
          severity: f.severity,
          confidence: f.confidence,
          title: f.title,
          description: f.description,
          suggested_action: f.suggested_action,
          entity_table: f.entity_table ?? null,
          entity_id: f.entity_id ?? null,
          payload: f.payload ?? {},
          status: "open",
        },
        { onConflict: "company_id,rule_key,entity_table,entity_id", ignoreDuplicates: false },
      );
      if (!error) inserted++;
    }

    await supabase.from("autofix_runs").insert({
      company_id,
      kind: "scan",
      module: want.join(","),
      findings_total: all.length,
      findings_new: inserted,
      duration_ms: Date.now() - t0,
      details: { modules: want },
    });

    return corsJson({ findings: all.length, inserted, duration_ms: Date.now() - t0 });
  } catch (e) {
    console.error("autofix-scan error", e);
    return corsError(e instanceof Error ? e.message : "Okänt fel");
  }
});
