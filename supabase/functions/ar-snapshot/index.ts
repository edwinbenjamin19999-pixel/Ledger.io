// ar-snapshot — freeze current AR state into ar_versions.
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { annualReportId, label, status } = await req.json();
    if (!annualReportId) return corsError("annualReportId krävs", 400);
    const validStatuses = ["draft", "review", "approved", "signed", "submitted"];
    const finalStatus = validStatuses.includes(status) ? status : "draft";

    // Identify the calling user via the user JWT.
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return corsError("Inte inloggad", 401);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [report, sections, blocks, mapping, validations] = await Promise.all([
      sb.from("annual_reports").select("*").eq("id", annualReportId).maybeSingle(),
      sb.from("annual_report_sections").select("*").eq("annual_report_id", annualReportId),
      sb.from("ar_blocks").select("*").eq("annual_report_id", annualReportId),
      sb.from("ar_section_account_map").select("*").eq("annual_report_id", annualReportId),
      sb.from("ar_validations").select("*").eq("annual_report_id", annualReportId),
    ]);
    if (!report.data) return corsError("Utkast saknas", 404);

    const { data: latest } = await sb
      .from("ar_versions")
      .select("version_number")
      .eq("annual_report_id", annualReportId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const next = ((latest?.version_number as number | undefined) ?? 0) + 1;

    const snapshot = {
      report: report.data,
      sections: sections.data ?? [],
      blocks: blocks.data ?? [],
      mapping: mapping.data ?? [],
      validations: validations.data ?? [],
      taken_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await sb.from("ar_versions").insert({
      annual_report_id: annualReportId,
      version_number: next,
      label: label ?? `v${next}`,
      status: finalStatus,
      snapshot,
      created_by: u.user.id,
    }).select("id, version_number").single();
    if (error) return corsError(error.message, 500);

    return corsJson(inserted);
  } catch (e) {
    console.error("ar-snapshot error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
