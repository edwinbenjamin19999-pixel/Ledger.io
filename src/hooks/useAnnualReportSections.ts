import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnnualReportSection {
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
  created_at: string;
  updated_at: string;
}

export function useAnnualReportSections(annualReportId: string | null, companyId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ar-sections", annualReportId],
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_report_sections")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as AnnualReportSection[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<AnnualReportSection> & { label: string; section_type: string }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar rapport-ID");
      const payload: any = {
        annual_report_id: annualReportId,
        company_id: companyId,
        parent_id: input.parent_id ?? null,
        section_type: input.section_type,
        label: input.label,
        content: input.content ?? null,
        order_index: input.order_index ?? 0,
        visible: input.visible ?? true,
        ai_generated: input.ai_generated ?? false,
        locked: input.locked ?? false,
        metadata: input.metadata ?? {},
      };
      if (input.id) {
        const { error } = await supabase.from("annual_report_sections").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("annual_report_sections").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-sections", annualReportId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("annual_report_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-sections", annualReportId] }),
  });

  return { ...query, upsert, remove };
}
