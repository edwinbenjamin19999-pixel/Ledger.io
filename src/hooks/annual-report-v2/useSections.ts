import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ARSection {
  id: string;
  annual_report_id: string;
  company_id: string;
  parent_id: string | null;
  section_type: string;
  label: string;
  content: string | null;
  order_index: number;
  visible: boolean;
  ai_generated: boolean;
  locked: boolean;
  metadata: Record<string, unknown>;
}

/**
 * CRUD + reorder + lock for annual_report_sections.
 * v2 reuses this table — `locked` maps to plan's is_locked,
 * metadata.is_required gates delete.
 */
export function useSections(annualReportId: string | null, companyId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-v2-sections", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_report_sections")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ARSection[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: Partial<ARSection> & { label: string; section_type: string }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar utkast");
      const { data, error } = await supabase
        .from("annual_report_sections")
        .insert({
          annual_report_id: annualReportId,
          company_id: companyId,
          parent_id: input.parent_id ?? null,
          section_type: input.section_type,
          label: input.label,
          content: input.content ?? null,
          order_index: input.order_index ?? (query.data?.length ?? 0),
          visible: input.visible ?? true,
          ai_generated: input.ai_generated ?? false,
          locked: input.locked ?? false,
          metadata: (input.metadata ?? {}) as never,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ARSection;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string } & Partial<ARSection>) => {
      const { id, ...rest } = input;
      const { error } = await supabase
        .from("annual_report_sections")
        .update(rest as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const section = query.data?.find((s) => s.id === id);
      if (section?.metadata && (section.metadata as Record<string, unknown>).is_required) {
        throw new Error("Sektionen är obligatorisk enligt lag och kan inte tas bort.");
      }
      const { error } = await supabase.from("annual_report_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, idx) =>
        supabase.from("annual_report_sections").update({ order_index: idx }).eq("id", id),
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const toggleLock = useMutation({
    mutationFn: async ({ id, locked }: { id: string; locked: boolean }) => {
      const { error } = await supabase.from("annual_report_sections").update({ locked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, add, update, remove, reorder, toggleLock };
}
