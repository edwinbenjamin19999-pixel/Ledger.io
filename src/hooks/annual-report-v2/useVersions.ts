// useVersions — list, snapshot and restore AR draft versions.
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ARVersion {
  id: string;
  annual_report_id: string;
  version_number: number;
  label: string | null;
  status: "draft" | "review" | "approved" | "signed" | "submitted";
  snapshot: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export function useVersions(annualReportId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-v2-versions", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_versions" as never)
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ARVersion[];
    },
  });

  useEffect(() => {
    if (!annualReportId) return;
    const ch = supabase
      .channel(`ar-versions-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ar_versions", filter: `annual_report_id=eq.${annualReportId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [annualReportId, qc]);

  const snapshot = useMutation({
    mutationFn: async (input: { label?: string; status?: ARVersion["status"] }) => {
      if (!annualReportId) throw new Error("Saknar utkast");
      const { data, error } = await supabase.functions.invoke("ar-snapshot", {
        body: { annualReportId, label: input.label ?? null, status: input.status ?? "draft" },
      });
      if (error) throw error;
      return data as { id: string; version_number: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Version sparad");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restore = useMutation({
    mutationFn: async (versionId: string) => {
      const { data, error } = await supabase.functions.invoke("ar-restore-version", { body: { versionId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Version återställd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, snapshot, restore };
}
