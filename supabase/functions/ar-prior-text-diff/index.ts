// ar-prior-text-diff — compare current AR draft text blocks vs prior year.
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function plain(html: string | null | undefined): string {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { annualReportId, priorReportId } = await req.json();
    if (!annualReportId || !priorReportId) return corsError("annualReportId + priorReportId krävs", 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const fetchSecBlocks = async (id: string) => {
      const { data: secs } = await sb.from("annual_report_sections").select("id, section_type, label").eq("annual_report_id", id);
      const { data: blks } = await sb.from("ar_blocks").select("section_id, block_type, content").eq("annual_report_id", id).eq("block_type", "text");
      const map = new Map<string, string>();
      for (const s of secs ?? []) {
        const html = (blks ?? [])
          .filter((b: any) => b.section_id === s.id)
          .map((b: any) => (b.content?.html ?? "")).join("\n");
        map.set(s.section_type, html);
      }
      return map;
    };

    const [cur, prior] = await Promise.all([fetchSecBlocks(annualReportId), fetchSecBlocks(priorReportId)]);
    const allTypes = new Set<string>([...cur.keys(), ...prior.keys()]);

    const diff: Array<{ sectionType: string; status: string; current: string | null; prior: string | null; suggestion: string | null }> = [];
    for (const t of allTypes) {
      const c = cur.get(t) ?? null;
      const p = prior.get(t) ?? null;
      let status: "reuse" | "update" | "remove" | "new";
      if (!p && c) status = "new";
      else if (p && !c) status = "remove";
      else if (plain(c) === plain(p)) status = "reuse";
      else status = "update";
      diff.push({
        sectionType: t,
        status,
        current: c,
        prior: p,
        suggestion: status === "remove" ? null : status === "update" ? p : c,
      });
    }

    return corsJson({ diff });
  } catch (e) {
    console.error("ar-prior-text-diff error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
