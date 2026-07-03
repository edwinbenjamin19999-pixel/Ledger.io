// AI Autofix - Apply engine
// Applies one or many findings; logs result.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

// Authoritative kommun -> skattetabell map for fix application (subset of KOMMUN_SKATT_2026).
// Source: Skatteverket skattesatser-kommuner-2026 (sum exkl. kyrkoavgift, rounded).
async function fetchKommunMap(): Promise<Record<string, number>> {
  // Embedded minimal subset is risky; instead pull from a system_secrets row if present
  // OR from a future-deployed JSON. For now, do nothing if not provided in payload.
  return {};
}

interface FixContext {
  supabase: any;
  companyId: string;
  userId: string;
  finding: any;
}

function kolumnFromBirthDate(birth?: string | null, pn?: string | null): number | null {
  let year: number | null = null;
  if (birth) year = new Date(birth).getFullYear();
  else if (pn && pn.length >= 6) {
    const y = parseInt(pn.slice(0, 2), 10);
    const c = pn.length >= 8 ? parseInt(pn.slice(0, 4), 10) : (y < 25 ? 2000 + y : 1900 + y);
    year = c;
  }
  if (!year) return null;
  // Kolumn 2 = fyllt 66 vid årets ingång (1960 eller tidigare för 2026)
  return year <= 1960 ? 2 : 1;
}

async function applyFinding(ctx: FixContext): Promise<{ ok: boolean; message?: string }> {
  const f = ctx.finding;
  const kind = (f.payload as any)?.fix_kind as string | undefined;
  if (!kind) return { ok: false, message: "Ingen fix_kind i payload" };

  switch (kind) {
    case "manual":
      return { ok: false, message: "Kräver manuell åtgärd" };

    case "hr.set_tax_table_from_municipality": {
      const muni: string | undefined = (f.payload as any).municipality;
      const provided: Record<string, number> | undefined = (f.payload as any).kommun_map;
      const map = provided ?? await fetchKommunMap();
      const tab = muni ? map[muni] : undefined;
      if (!tab) return { ok: false, message: "Saknar skattetabell för kommun (skicka kommun_map i payload)" };
      const { error } = await ctx.supabase.from("employees")
        .update({ tax_table: String(tab) })
        .eq("id", f.entity_id);
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    }

    case "hr.set_tax_column_from_age": {
      const { data: emp } = await ctx.supabase.from("employees")
        .select("birth_date, personal_number_encrypted").eq("id", f.entity_id).maybeSingle();
      const col = kolumnFromBirthDate(emp?.birth_date, null);
      if (!col) return { ok: false, message: "Kunde inte härleda ålder" };
      const { error } = await ctx.supabase.from("employees")
        .update({ tax_column: col }).eq("id", f.entity_id);
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    }

    case "journal.delete_orphan_draft": {
      // Only delete if still 0 lines and still draft
      const { count } = await ctx.supabase.from("journal_entry_lines")
        .select("*", { count: "exact", head: true }).eq("journal_entry_id", f.entity_id);
      if ((count ?? 0) > 0) return { ok: false, message: "Verifikationen har nu rader" };
      const { error } = await ctx.supabase.from("journal_entries")
        .delete().eq("id", f.entity_id).eq("status", "draft");
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    }

    case "payroll.create_journal_entry": {
      // Re-trigger by toggling status (approved -> approved is no-op, so we use a small dance)
      const { data: run } = await ctx.supabase.from("payroll_runs")
        .select("status").eq("id", f.entity_id).maybeSingle();
      if (!run || run.status !== "approved") return { ok: false, message: "Lönekörning ej godkänd" };
      // Set to draft then back to approved so trigger fires
      const { error: e1 } = await ctx.supabase.from("payroll_runs")
        .update({ status: "draft" }).eq("id", f.entity_id);
      if (e1) return { ok: false, message: e1.message };
      const { error: e2 } = await ctx.supabase.from("payroll_runs")
        .update({ status: "approved", approved_by: ctx.userId }).eq("id", f.entity_id);
      if (e2) return { ok: false, message: e2.message };
      return { ok: true };
    }

    default:
      return { ok: false, message: `Okänd fix_kind: ${kind}` };
  }
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const body = await req.json();
    const { finding_ids, company_id, dismiss, kommun_map } = body as {
      finding_ids: string[]; company_id: string; dismiss?: boolean; kommun_map?: Record<string, number>;
    };
    if (!company_id || !Array.isArray(finding_ids) || finding_ids.length === 0) {
      return corsError("company_id och finding_ids krävs", 400);
    }
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return corsError("Ej inloggad", 401);

    const { data: findings } = await supabase
      .from("autofix_findings").select("*")
      .in("id", finding_ids).eq("company_id", company_id).eq("status", "open");
    if (!findings || findings.length === 0) return corsJson({ applied: 0, failed: 0 });

    let applied = 0, failed = 0;
    const t0 = Date.now();
    for (const f of findings) {
      if (dismiss) {
        await supabase.from("autofix_findings").update({
          status: "dismissed", dismissed_by: user.id, dismissed_at: new Date().toISOString(),
        }).eq("id", f.id);
        applied++;
        continue;
      }
      // inject kommun_map for HR fixes
      if (kommun_map && f.module === "hr") {
        f.payload = { ...(f.payload || {}), kommun_map };
      }
      const r = await applyFinding({ supabase, companyId: company_id, userId: user.id, finding: f });
      if (r.ok) {
        await supabase.from("autofix_findings").update({
          status: "applied", applied_by: user.id, applied_at: new Date().toISOString(),
        }).eq("id", f.id);
        applied++;
      } else {
        await supabase.from("autofix_findings").update({
          status: "failed", error_message: r.message ?? "okänt fel",
        }).eq("id", f.id);
        failed++;
      }
    }

    await supabase.from("autofix_runs").insert({
      company_id, triggered_by: user.id, kind: dismiss ? "dismiss" : "apply",
      findings_total: findings.length, findings_applied: applied, findings_failed: failed,
      duration_ms: Date.now() - t0,
    });

    return corsJson({ applied, failed });
  } catch (e) {
    console.error("autofix-apply error", e);
    return corsError(e instanceof Error ? e.message : "Okänt fel");
  }
});
