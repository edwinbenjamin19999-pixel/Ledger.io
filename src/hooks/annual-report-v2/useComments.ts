// useComments — threaded comments per AR draft with realtime + @mentions.
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ARComment {
  id: string;
  annual_report_id: string;
  section_id: string | null;
  block_id: string | null;
  anchor: string | null;
  parent_comment_id: string | null;
  author_id: string;
  body: string;
  mentions: string[];
  status: "open" | "resolved";
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function useComments(annualReportId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-v2-comments", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_comments" as never)
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ARComment[];
    },
  });

  useEffect(() => {
    if (!annualReportId) return;
    const ch = supabase
      .channel(`ar-comments-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ar_comments", filter: `annual_report_id=eq.${annualReportId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [annualReportId, qc]);

  const add = useMutation({
    mutationFn: async (input: {
      body: string;
      section_id?: string | null;
      block_id?: string | null;
      anchor?: string | null;
      parent_comment_id?: string | null;
      mentions?: string[];
    }) => {
      if (!annualReportId) throw new Error("Saknar utkast");
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Inte inloggad");
      const { error } = await supabase.from("ar_comments" as never).insert({
        annual_report_id: annualReportId,
        section_id: input.section_id ?? null,
        block_id: input.block_id ?? null,
        anchor: input.anchor ?? null,
        parent_comment_id: input.parent_comment_id ?? null,
        author_id: u.user.id,
        body: input.body,
        mentions: input.mentions ?? [],
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("ar_comments" as never)
        .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: u?.user?.id ?? null } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, add, resolve };
}
