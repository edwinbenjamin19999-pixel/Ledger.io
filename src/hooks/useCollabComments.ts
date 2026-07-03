import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { useEffect } from "react";
import { toast } from "sonner";

export interface CollabComment {
  id: string;
  company_id: string;
  entity_type: string;
  entity_key: string;
  parent_id: string | null;
  body: string;
  mentions: string[];
  author_id: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseEntity(entity: string): { entity_type: string; entity_key: string } {
  const idx = entity.indexOf(":");
  if (idx === -1) return { entity_type: "row", entity_key: entity };
  return { entity_type: entity.slice(0, idx), entity_key: entity.slice(idx + 1) };
}

export function useCollabComments(entity: string | null) {
  const qc = useQueryClient();
  const companyId = getStoredActiveCompanyId();

  const query = useQuery({
    queryKey: ["collab-comments", companyId, entity],
    enabled: !!companyId && !!entity,
    queryFn: async () => {
      const { entity_type, entity_key } = parseEntity(entity!);
      const { data, error } = await supabase
        .from("collab_comments")
        .select("*")
        .eq("company_id", companyId!)
        .eq("entity_type", entity_type)
        .eq("entity_key", entity_key)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CollabComment[];
    },
  });

  useEffect(() => {
    if (!companyId || !entity) return;
    const { entity_type, entity_key } = parseEntity(entity);
    const ch = supabase
      .channel(`collab:${entity_type}:${entity_key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collab_comments",
          filter: `entity_key=eq.${entity_key}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["collab-comments", companyId, entity] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [companyId, entity, qc]);

  return query;
}

export function useCreateComment() {
  const qc = useQueryClient();
  const companyId = getStoredActiveCompanyId();
  return useMutation({
    mutationFn: async ({
      entity,
      body,
      parentId,
      mentions,
    }: {
      entity: string;
      body: string;
      parentId?: string;
      mentions?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error("Saknar bolag eller användare");
      const { entity_type, entity_key } = parseEntity(entity);
      const { error } = await supabase.from("collab_comments").insert({
        company_id: companyId,
        entity_type,
        entity_key,
        parent_id: parentId ?? null,
        body,
        mentions: mentions ?? [],
        author_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["collab-comments", companyId, vars.entity] });
      qc.invalidateQueries({ queryKey: ["collab-comment-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResolveComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("collab_comments")
        .update({ resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collab-comments"] }),
  });
}

export function useCommentCount(entity: string | null) {
  const companyId = getStoredActiveCompanyId();
  return useQuery({
    queryKey: ["collab-comment-counts", companyId, entity],
    enabled: !!companyId && !!entity,
    queryFn: async () => {
      const { entity_type, entity_key } = parseEntity(entity!);
      const { count, error } = await supabase
        .from("collab_comments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("entity_type", entity_type)
        .eq("entity_key", entity_key)
        .is("resolved_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useCreateExplanation() {
  const qc = useQueryClient();
  const companyId = getStoredActiveCompanyId();
  return useMutation({
    mutationFn: async (input: {
      entity_key: string;
      explanation_text: string;
      attached_amount_sek?: number;
      period?: string;
      ai_generated?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error("Saknar bolag eller användare");
      const { error } = await supabase.from("collab_explanations").insert({
        company_id: companyId,
        author_id: user.id,
        entity_key: input.entity_key,
        explanation_text: input.explanation_text,
        attached_amount_sek: input.attached_amount_sek ?? null,
        period: input.period ?? null,
        ai_generated: input.ai_generated ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collab-explanations"] });
      toast.success("Förklaring bifogad");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
