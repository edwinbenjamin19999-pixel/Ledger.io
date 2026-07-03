import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReportVersion {
  id: string;
  annual_report_id: string;
  version_number: number;
  label: string;
  snapshot: any;
  created_by: string;
  is_locked: boolean;
  created_at: string;
}

export function useReportVersions(annualReportId: string | null, companyId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ar-versions", annualReportId],
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_report_versions")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReportVersion[];
    },
  });

  const snapshot = useMutation({
    mutationFn: async (input: { label: string; snapshot: any; is_locked?: boolean }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar rapport-ID");
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Inte inloggad");
      const next = ((query.data?.[0]?.version_number) || 0) + 1;
      const { error } = await supabase.from("annual_report_versions").insert({
        annual_report_id: annualReportId,
        company_id: companyId,
        version_number: next,
        label: input.label,
        snapshot: input.snapshot,
        is_locked: input.is_locked ?? false,
        created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar-versions", annualReportId] });
      toast.success("Version sparad");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, snapshot };
}
