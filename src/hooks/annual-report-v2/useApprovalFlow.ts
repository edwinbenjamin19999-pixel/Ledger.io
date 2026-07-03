// useApprovalFlow — drives workflow_status transitions for an AR draft.
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WorkflowStatus = "draft" | "review" | "approved" | "signed" | "submitted";

const ALLOWED: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ["review"],
  review: ["draft", "approved"],
  approved: ["review", "signed"],
  signed: ["submitted"],
  submitted: [],
};

export interface ARApproval {
  id: string;
  annual_report_id: string;
  from_status: WorkflowStatus;
  to_status: WorkflowStatus;
  actor_id: string;
  note: string | null;
  created_at: string;
}

export function useApprovalFlow(annualReportId: string | null) {
  const qc = useQueryClient();
  const statusKey = ["ar-v2-status", annualReportId];
  const logKey = ["ar-v2-approvals", annualReportId];

  const status = useQuery({
    queryKey: statusKey,
    enabled: !!annualReportId,
    queryFn: async (): Promise<WorkflowStatus> => {
      const { data, error } = await supabase
        .from("annual_reports")
        .select("workflow_status")
        .eq("id", annualReportId!)
        .maybeSingle();
      if (error) throw error;
      return ((data as { workflow_status?: WorkflowStatus } | null)?.workflow_status ?? "draft") as WorkflowStatus;
    },
  });

  const log = useQuery({
    queryKey: logKey,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_approvals" as never)
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ARApproval[];
    },
  });

  useEffect(() => {
    if (!annualReportId) return;
    const ch = supabase
      .channel(`ar-approvals-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ar_approvals", filter: `annual_report_id=eq.${annualReportId}` },
        () => {
          qc.invalidateQueries({ queryKey: logKey });
          qc.invalidateQueries({ queryKey: statusKey });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [annualReportId, qc]);

  const transition = useMutation({
    mutationFn: async (input: { to: WorkflowStatus; note?: string }) => {
      if (!annualReportId) throw new Error("Saknar utkast");
      const current = status.data ?? "draft";
      if (!ALLOWED[current].includes(input.to)) {
        throw new Error(`Otillåten övergång: ${current} → ${input.to}`);
      }
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Inte inloggad");

      // 1. Snapshot current state with the new status label.
      await supabase.functions.invoke("ar-snapshot", {
        body: { annualReportId, label: `${input.to} ${new Date().toISOString().slice(0, 10)}`, status: input.to },
      });

      // 2. Update annual_reports.workflow_status.
      const { error: updErr } = await supabase
        .from("annual_reports")
        .update({ workflow_status: input.to } as never)
        .eq("id", annualReportId);
      if (updErr) throw updErr;

      // 3. Log approval event.
      const { error: logErr } = await supabase.from("ar_approvals" as never).insert({
        annual_report_id: annualReportId,
        from_status: current,
        to_status: input.to,
        actor_id: u.user.id,
        note: input.note ?? null,
      } as never);
      if (logErr) throw logErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: statusKey });
      qc.invalidateQueries({ queryKey: logKey });
      toast.success(`Status ändrad till ${vars.to}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { status, log, transition, allowedNext: ALLOWED[status.data ?? "draft"] };
}
