/**
 * Loads a unified report template (sections + rows + mappings + views) from DB.
 * Fetches the 5 related tables in parallel and returns a normalized
 * `LoadedTemplate`. React Query hook wraps the plain async loader and is keyed
 * on companyDataVersion so a `data_version` bump invalidates the cache.
 */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LoadedTemplate } from "./types/dbSchema";

export class TemplateNotFoundError extends Error {
  constructor(code: string) {
    super(`Report template not found: ${code}`);
    this.name = "TemplateNotFoundError";
  }
}

/** Plain async loader — usable outside React (edge fns, server scripts). */
export async function loadTemplate(code: string): Promise<LoadedTemplate> {
  const { data: template, error: tErr } = await supabase
    .from("report_templates")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (tErr) throw tErr;
  if (!template) throw new TemplateNotFoundError(code);

  const [sectionsRes, rowsRes, viewsRes] = await Promise.all([
    supabase.from("report_sections").select("*").eq("template_id", template.id),
    supabase.from("report_rows").select("*").eq("template_id", template.id),
    supabase.from("report_views").select("*").eq("template_id", template.id),
  ]);

  if (sectionsRes.error) throw sectionsRes.error;
  if (rowsRes.error) throw rowsRes.error;
  if (viewsRes.error) throw viewsRes.error;

  const rowIds = (rowsRes.data ?? []).map((r) => r.id);
  const mappingsRes = rowIds.length
    ? await supabase.from("account_mappings").select("*").in("row_id", rowIds)
    : { data: [], error: null as null };
  if (mappingsRes.error) throw mappingsRes.error;

  return {
    template,
    sections: sectionsRes.data ?? [],
    rows: rowsRes.data ?? [],
    mappings: mappingsRes.data ?? [],
    views: viewsRes.data ?? [],
  };
}

/** React Query hook — caches per (template code, company data_version). */
export function useReportTemplate(
  code: string | null | undefined,
  companyDataVersion: number | string | null | undefined,
  options?: Omit<UseQueryOptions<LoadedTemplate, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<LoadedTemplate, Error>({
    queryKey: ["report-template", code, companyDataVersion],
    queryFn: () => loadTemplate(code!),
    enabled: !!code,
    staleTime: 5 * 60 * 1000, // system templates change rarely
    ...options,
  });
}
