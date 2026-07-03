// ar-import-prior-mapping — copy mapping from a prior year's annual report draft.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    if (!req.headers.get("Authorization")) return corsError("Saknar auth", 401);
    const { annualReportId, priorReportId } = await req.json();
    if (!annualReportId || !priorReportId) return corsError("annualReportId + priorReportId krävs", 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: report } = await sb.from("annual_reports").select("id, company_id").eq("id", annualReportId).single();
    if (!report) return corsError("Utkast hittades inte", 404);

    const [{ data: priorMaps }, { data: currentSections }, { data: priorSections }, { data: existing }] = await Promise.all([
      sb.from("ar_section_account_map")
        .select("account_number, weight, section_id")
        .eq("annual_report_id", priorReportId),
      sb.from("annual_report_sections")
        .select("id, section_type, label")
        .eq("annual_report_id", annualReportId),
      sb.from("annual_report_sections")
        .select("id, section_type, label")
        .eq("annual_report_id", priorReportId),
      sb.from("ar_section_account_map")
        .select("account_number, is_locked, section_id")
        .eq("annual_report_id", annualReportId),
    ]);

    const priorSecMap = new Map<string, string>();
    for (const s of (priorSections ?? []) as Array<{ id: string; section_type: string; label: string }>) {
      priorSecMap.set(s.id, `${s.section_type}::${s.label}`);
    }
    const currentByKey = new Map<string, string>();
    for (const s of (currentSections ?? []) as Array<{ id: string; section_type: string; label: string }>) {
      currentByKey.set(`${s.section_type}::${s.label}`, s.id);
    }

    const lockedAccounts = new Set(
      (existing ?? []).filter((m: { is_locked: boolean }) => m.is_locked).map((m: { account_number: string }) => m.account_number),
    );

    const toInsert: Array<{ account_number: string; section_id: string; weight: number }> = [];
    let reused = 0, changed = 0;

    for (const m of (priorMaps ?? []) as Array<{ account_number: string; weight: number; section_id: string }>) {
      if (lockedAccounts.has(m.account_number)) continue;
      const key = priorSecMap.get(m.section_id);
      if (!key) continue;
      const newSecId = currentByKey.get(key);
      if (!newSecId) continue;
      toInsert.push({ account_number: m.account_number, section_id: newSecId, weight: m.weight });
      reused++;
    }

    if (toInsert.length) {
      const accs = toInsert.map((r) => r.account_number);
      const { count } = await sb.from("ar_section_account_map")
        .select("id", { count: "exact", head: true })
        .eq("annual_report_id", annualReportId)
        .eq("is_locked", false)
        .in("account_number", accs);
      changed = count ?? 0;

      await sb.from("ar_section_account_map")
        .delete()
        .eq("annual_report_id", annualReportId)
        .eq("is_locked", false)
        .in("account_number", accs);

      await sb.from("ar_section_account_map").insert(
        toInsert.map((r) => ({
          annual_report_id: annualReportId,
          company_id: report.company_id,
          section_id: r.section_id,
          account_number: r.account_number,
          weight: r.weight,
          source: "prior_year",
        })),
      );
    }

    return corsJson({ ok: true, reused, changed, removed: 0 });
  } catch (e) {
    console.error("ar-import-prior-mapping error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
