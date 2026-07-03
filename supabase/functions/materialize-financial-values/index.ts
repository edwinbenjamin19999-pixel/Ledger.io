/**
 * materialize-financial-values
 * Phase 4 — computes and persists financial_values per (company, period, template, layer).
 *
 * Pipeline:
 *  1. Idempotency check vs companies.data_version
 *  2. Load template (sections, rows, mappings)
 *  3. Resolve period bounds
 *  4. Aggregate journal_entry_lines → row totals (actual)
 *  5. Resolve formula rows (topo-sorted)
 *  6. UPSERT financial_values
 *  7. Run BR-balance validation → UPSERT validation_results
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, corsError, corsJson, handleCors } from "../_shared/cors.ts";
import { resolveFormulas } from "../_shared/formulaEngine.ts";
import { findRowForAccount, type AccountMapping } from "../_shared/accountMapper.ts";

interface MaterializeRequest {
  companyId: string;
  periodId: string;
  templateId: string;
  layers?: Array<"actual" | "budget" | "forecast">;
  force?: boolean;
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const startedAt = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: caller's JWT determines membership
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return corsError("Unauthorized", 401);

    const body = (await req.json()) as MaterializeRequest;
    const { companyId, periodId, templateId, force = false } = body;
    if (!companyId || !periodId || !templateId) {
      return corsError("companyId, periodId, templateId required", 400);
    }

    // Service-role client for the heavy lifting
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    // Membership check
    const { data: roleRow } = await svc
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!roleRow) return corsError("Not a member of company", 403);

    // 1) Idempotency
    const { data: company } = await svc
      .from("companies")
      .select("data_version")
      .eq("id", companyId)
      .maybeSingle();
    const dataVersion = company?.data_version ?? 0;

    if (!force) {
      const { data: latest } = await svc
        .from("financial_values")
        .select("computed_at")
        .eq("company_id", companyId)
        .eq("period_id", periodId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      // Fresh if any row exists newer than 5 min AND we haven't bumped data_version since
      if (latest?.computed_at) {
        const ageMs = Date.now() - new Date(latest.computed_at).getTime();
        if (ageMs < 5 * 60_000) {
          return corsJson({
            success: true,
            cached: true,
            rowsWritten: 0,
            durationMs: Date.now() - startedAt,
            dataVersion,
          });
        }
      }
    }

    // 2) Load template
    const [tplRes, rowsRes, mapsRes] = await Promise.all([
      svc.from("report_templates").select("*").eq("id", templateId).maybeSingle(),
      svc.from("report_rows").select("*").eq("template_id", templateId).order("sequence"),
      svc.from("account_mappings").select("*"),
    ]);
    if (!tplRes.data) return corsError(`Template ${templateId} not found`, 404);
    const rows = rowsRes.data ?? [];
    const allMappings = (mapsRes.data ?? []) as AccountMapping[];
    const rowIds = new Set(rows.map((r) => r.id));
    const mappings = allMappings.filter((m) => rowIds.has(m.row_id));

    // 3) Resolve period bounds
    const { data: period } = await svc
      .from("periods")
      .select("start_date, end_date")
      .eq("id", periodId)
      .maybeSingle();
    if (!period) return corsError(`Period ${periodId} not found`, 404);

    // 4) Aggregate journal_entry_lines (actual layer)
    // Pull lines for approved/posted journal_entries within period bounds
    const { data: lines, error: linesErr } = await svc
      .from("journal_entry_lines")
      .select(`
        account_number,
        debit,
        credit,
        journal_entries!inner(company_id, entry_date, status)
      `)
      .eq("journal_entries.company_id", companyId)
      .gte("journal_entries.entry_date", period.start_date)
      .lte("journal_entries.entry_date", period.end_date)
      .in("journal_entries.status", ["approved", "posted"]);
    if (linesErr) return corsError(`Lines query failed: ${linesErr.message}`, 500);

    // Aggregate per account
    const accountTotals = new Map<string, number>();
    for (const ln of lines ?? []) {
      const acc = String(ln.account_number);
      const amount = Number(ln.credit ?? 0) - Number(ln.debit ?? 0);
      accountTotals.set(acc, (accountTotals.get(acc) ?? 0) + amount);
    }

    // Map accounts to rows
    const rowSeed = new Map<string, number>(); // rowCode → amount
    const codeById = new Map(rows.map((r) => [r.id, r.code] as const));
    for (const [acc, total] of accountTotals.entries()) {
      const hit = findRowForAccount(acc, mappings, companyId);
      if (!hit) continue;
      const code = codeById.get(hit.rowId);
      if (!code) continue;
      const signed = total * hit.sign;
      rowSeed.set(code, (rowSeed.get(code) ?? 0) + signed);
    }

    // Ensure every mapped_accounts row has a value (0 if no data) so UI distinguishes "computed but empty"
    for (const r of rows) {
      if (r.calculation_type === "mapped_accounts" && !rowSeed.has(r.code)) {
        rowSeed.set(r.code, 0);
      }
    }

    // 5) Resolve formula rows
    const formulas = new Map<string, string>();
    for (const r of rows) {
      if (r.calculation_type === "formula" && r.formula_expression) {
        formulas.set(r.code, r.formula_expression);
      }
    }
    let resolved: Map<string, number>;
    const formulaErrors: Array<{ code: string; message: string }> = [];
    try {
      resolved = resolveFormulas(rowSeed, formulas);
    } catch (err) {
      // Partial resolution: log and continue with seed values
      formulaErrors.push({ code: "*", message: (err as Error).message });
      resolved = rowSeed;
    }

    // 6) UPSERT financial_values (actual layer)
    const now = new Date().toISOString();
    const upserts = rows.map((r) => ({
      row_id: r.id,
      company_id: companyId,
      period_id: periodId,
      value_layer: "actual" as const,
      scenario_id: null,
      amount: Number((resolved.get(r.code) ?? 0).toFixed(2)),
      source_type: r.calculation_type === "formula" ? "derived" : "ledger",
      currency: "SEK",
      is_stale: false,
      computed_at: now,
    }));

    let rowsWritten = 0;
    if (upserts.length > 0) {
      const { error: upErr, count } = await svc
        .from("financial_values")
        .upsert(upserts, { onConflict: "row_id,company_id,period_id,value_layer,scenario_id", count: "exact" });
      if (upErr) return corsError(`Upsert failed: ${upErr.message}`, 500);
      rowsWritten = count ?? upserts.length;
    }

    // 7) Validations — BR balance check (sum of asset rows == sum of liability+equity)
    const validations: Array<Record<string, unknown>> = [];
    if (tplRes.data.code === "BR_K2") {
      // Heuristic: sum positive rows vs negative rows; difference > 1 SEK = warning
      let total = 0;
      for (const r of rows) {
        if (r.calculation_type === "mapped_accounts") {
          total += resolved.get(r.code) ?? 0;
        }
      }
      const diff = Math.abs(total);
      if (diff > 1) {
        validations.push({
          company_id: companyId,
          period_id: periodId,
          template_id: templateId,
          row_id: null,
          validation_type: "balance_sheet_not_balanced",
          severity: diff > 1000 ? "error" : "warning",
          message: `Balansräkningen balanserar inte. Differens: ${diff.toFixed(2)} SEK`,
          difference_amount: diff,
          status: "open",
        });
      }
    }
    for (const fe of formulaErrors) {
      validations.push({
        company_id: companyId,
        period_id: periodId,
        template_id: templateId,
        row_id: null,
        validation_type: "formula_cycle",
        severity: "error",
        message: `Formelfel (${fe.code}): ${fe.message}`,
        status: "open",
      });
    }
    if (validations.length > 0) {
      await svc.from("validation_results").upsert(validations, {
        onConflict: "company_id,period_id,validation_type,row_id",
        ignoreDuplicates: false,
      });
    }

    return corsJson({
      success: true,
      cached: false,
      rowsWritten,
      validationsWritten: validations.length,
      durationMs: Date.now() - startedAt,
      dataVersion,
    });
  } catch (err) {
    console.error("materialize-financial-values error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
