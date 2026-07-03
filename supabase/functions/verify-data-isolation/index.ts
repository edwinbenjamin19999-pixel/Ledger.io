import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsError("Missing authorization", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return corsError("Unauthorized", 401);

    // Check admin role
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);

    if (!adminRole || adminRole.length === 0) {
      return corsError("Admin access required", 403);
    }

    // Query all tables in public schema
    const { data: tables } = await supabase.rpc("get_table_info" as any);

    // Fallback: query information_schema directly
    const { data: columns } = await supabase
      .from("information_schema.columns" as any)
      .select("table_name, column_name")
      .eq("table_schema", "public")
      .eq("column_name", "company_id");

    // Get RLS status for all tables
    const { data: rlsStatus } = await supabase
      .from("pg_tables" as any)
      .select("tablename, rowsecurity")
      .eq("schemaname", "public");

    // Financial tables that MUST have company_id and RLS
    const criticalTables = [
      "journal_entries", "journal_entry_lines", "chart_of_accounts",
      "transactions", "invoices", "bank_accounts", "bank_transactions",
      "budget_plans", "budget_rows", "budget_scenarios", "budget_forecasts",
      "budget_comments", "financial_cache",
      "payroll_runs", "employees", "fixed_assets",
      "vat_declarations", "annual_reports",
    ];

    const tablesWithCompanyId = new Set(
      (columns || []).map((c: any) => c.table_name)
    );

    const rlsMap = new Map(
      (rlsStatus || []).map((t: any) => [t.tablename, t.rowsecurity])
    );

    const issues: { table: string; issue: string; severity: "critical" | "warning" }[] = [];
    const passed: string[] = [];

    for (const table of criticalTables) {
      if (!tablesWithCompanyId.has(table)) {
        issues.push({ table, issue: "Missing company_id column", severity: "critical" });
      } else {
        passed.push(`${table}: has company_id ✓`);
      }

      const hasRls = rlsMap.get(table);
      if (hasRls === false) {
        issues.push({ table, issue: "RLS not enabled", severity: "critical" });
      } else if (hasRls === true) {
        passed.push(`${table}: RLS enabled ✓`);
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      total_tables_checked: criticalTables.length,
      tables_with_company_id: tablesWithCompanyId.size,
      critical_issues: issues.filter(i => i.severity === "critical").length,
      warnings: issues.filter(i => i.severity === "warning").length,
      issues,
      passed,
      overall_status: issues.filter(i => i.severity === "critical").length === 0 ? "PASS" : "FAIL",
    };

    return corsJson(report);
  } catch (err) {
    console.error("verify-data-isolation error:", err);
    return corsError(err instanceof Error ? err.message : "Internal error", 500);
  }
});
