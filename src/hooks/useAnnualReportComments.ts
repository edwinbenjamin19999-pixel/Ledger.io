import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnnualReportComment {
  id: string;
  annual_report_id: string;
  company_id: string;
  section_id: string | null;
  parent_comment_id: string | null;
  anchor_key: string | null;
  author_id: string;
  content: string;
  status: "open" | "resolved";
  mentions: string[];
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export function useAnnualReportComments(annualReportId: string | null, companyId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ar-comments", annualReportId],
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_report_comments")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as AnnualReportComment[];
    },
  });

  useEffect(() => {
    if (!annualReportId) return;
    const channel = supabase
      .channel(`ar-com-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "annual_report_comments", filter: `annual_report_id=eq.${annualReportId}` },
        () => qc.invalidateQueries({ queryKey: ["ar-comments", annualReportId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [annualReportId, qc]);

  const add = useMutation({
    mutationFn: async (input: { content: string; section_id?: string | null; anchor_key?: string | null; parent_comment_id?: string | null }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar rapport-ID");
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Inte inloggad");
      const { error } = await supabase.from("annual_report_comments").insert({
        annual_report_id: annualReportId,
        company_id: companyId,
        section_id: input.section_id ?? null,
        parent_comment_id: input.parent_comment_id ?? null,
        anchor_key: input.anchor_key ?? null,
        author_id: u.user.id,
        content: input.content,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-comments", annualReportId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("annual_report_comments")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: u?.user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-comments", annualReportId] }),
  });

  return { ...query, add, resolve };
}
