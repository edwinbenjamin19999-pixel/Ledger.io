// ar-restore-version — soft-restore: replace current sections+blocks from snapshot.
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

    const { versionId } = await req.json();
    if (!versionId) return corsError("versionId krävs", 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: version } = await sb.from("ar_versions").select("*").eq("id", versionId).maybeSingle();
    if (!version) return corsError("Version saknas", 404);

    const annualReportId = version.annual_report_id as string;
    const snap = version.snapshot as { sections?: any[]; blocks?: any[] };

    // Wipe current rows for this draft (cascade on blocks via section delete).
    await sb.from("ar_blocks").delete().eq("annual_report_id", annualReportId);
    await sb.from("annual_report_sections").delete().eq("annual_report_id", annualReportId);

    // Re-create sections (preserving original ids would conflict if not deleted; we accept new ids).
    const idMap = new Map<string, string>();
    for (const s of snap.sections ?? []) {
      const { data, error } = await sb.from("annual_report_sections").insert({
        annual_report_id: annualReportId,
        company_id: s.company_id,
        parent_id: null,
        section_type: s.section_type,
        label: s.label,
        content: s.content ?? null,
        order_index: s.order_index ?? 0,
        visible: s.visible ?? true,
        ai_generated: s.ai_generated ?? false,
        locked: s.locked ?? false,
        metadata: s.metadata ?? {},
      }).select("id").single();
      if (!error && data) idMap.set(s.id, data.id);
    }
    // Re-link parent_ids in a second pass.
    for (const s of snap.sections ?? []) {
      if (s.parent_id && idMap.has(s.id) && idMap.has(s.parent_id)) {
        await sb.from("annual_report_sections").update({ parent_id: idMap.get(s.parent_id) }).eq("id", idMap.get(s.id));
      }
    }
    // Re-create blocks.
    for (const b of snap.blocks ?? []) {
      const newSection = idMap.get(b.section_id);
      if (!newSection) continue;
      await sb.from("ar_blocks").insert({
        annual_report_id: annualReportId,
        company_id: b.company_id,
        section_id: newSection,
        block_type: b.block_type,
        sort_order: b.sort_order ?? 0,
        content: b.content ?? {},
        ai_generated: b.ai_generated ?? false,
        ai_confidence: b.ai_confidence ?? null,
        is_locked: b.is_locked ?? false,
        metadata: { ...(b.metadata ?? {}), restored_from: versionId },
      });
    }

    return corsJson({ ok: true, restored_sections: idMap.size });
  } catch (e) {
    console.error("ar-restore-version error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
