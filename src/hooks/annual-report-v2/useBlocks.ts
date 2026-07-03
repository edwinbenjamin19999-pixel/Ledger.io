import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ARBlock {
  id: string;
  annual_report_id: string;
  company_id: string;
  section_id: string;
  block_type: string;
  sort_order: number;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  ai_generated: boolean;
  ai_confidence: number | null;
  is_locked: boolean;
}

export function useBlocks(annualReportId: string | null, companyId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-v2-blocks", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_blocks")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ARBlock[];
    },
  });

  // Realtime invalidation
  useEffect(() => {
    if (!annualReportId) return;
    const ch = supabase
      .channel(`ar-blocks-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ar_blocks", filter: `annual_report_id=eq.${annualReportId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [annualReportId, qc]);

  const add = useMutation({
    mutationFn: async (input: Partial<ARBlock> & { section_id: string; block_type: string }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar utkast");
      const { data, error } = await supabase
        .from("ar_blocks")
        .insert({
          annual_report_id: annualReportId,
          company_id: companyId,
          section_id: input.section_id,
          block_type: input.block_type,
          sort_order: input.sort_order ?? 0,
          content: (input.content ?? {}) as never,
          metadata: (input.metadata ?? {}) as never,
          ai_generated: input.ai_generated ?? false,
          ai_confidence: input.ai_confidence ?? null,
          is_locked: input.is_locked ?? false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ARBlock;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string } & Partial<ARBlock>) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("ar_blocks").update(rest as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, idx) =>
        supabase.from("ar_blocks").update({ sort_order: idx }).eq("id", id),
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const toggleLock = useMutation({
    mutationFn: async ({ id, is_locked }: { id: string; is_locked: boolean }) => {
      const { error } = await supabase.from("ar_blocks").update({ is_locked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, add, update, remove, reorder, toggleLock };
}

/**
 * Hook for debounced auto-save of a single block's content.
 */
export function useDebouncedBlockSave(
  annualReportId: string | null,
  companyId: string | null,
  delayMs = 800,
) {
  const { update } = useBlocks(annualReportId, companyId);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  return (id: string, content: Record<string, unknown>) => {
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      update.mutate({ id, content });
      timers.current.delete(id);
    }, delayMs);
    timers.current.set(id, t);
  };
}
