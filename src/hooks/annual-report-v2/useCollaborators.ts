// useCollaborators — manage editor/reviewer/approver roles for a draft.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CollabRole = "editor" | "reviewer" | "approver";

export interface ARCollaborator {
  id: string;
  annual_report_id: string;
  user_id: string;
  role: CollabRole;
  invited_by: string | null;
  created_at: string;
}

export function useCollaborators(annualReportId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-v2-collaborators", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_collaborators" as never)
        .select("*")
        .eq("annual_report_id", annualReportId!);
      if (error) throw error;
      return (data ?? []) as unknown as ARCollaborator[];
    },
  });

  const invite = useMutation({
    mutationFn: async (input: { user_id: string; role: CollabRole }) => {
      if (!annualReportId) throw new Error("Saknar utkast");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("ar_collaborators" as never).insert({
        annual_report_id: annualReportId,
        user_id: input.user_id,
        role: input.role,
        invited_by: u?.user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Användare inbjuden");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_collaborators" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  /** Returns the current user's role on this draft (or 'editor' for company members by default). */
  const myRole = (uid: string | null): CollabRole | null => {
    if (!uid) return null;
    return query.data?.find((c) => c.user_id === uid)?.role ?? null;
  };

  return { ...query, invite, remove, myRole };
}
