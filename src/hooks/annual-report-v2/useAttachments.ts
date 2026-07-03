import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ARAttachment {
  id: string;
  annual_report_id: string;
  company_id: string;
  section_id: string | null;
  file_name: string;
  file_path: string;
  status: string;
  description: string | null;
  account_number: string | null;
  uploaded_by: string;
  created_at: string;
}

const BUCKET = "annual-report-attachments";

export function useAttachments(annualReportId: string | null, companyId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-v2-attachments", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_report_attachments")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ARAttachment[];
    },
  });

  const upload = useMutation({
    mutationFn: async (input: { file: File; sectionId?: string | null; description?: string }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar utkast");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Ej inloggad");
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${companyId}/${annualReportId}/${Date.now()}_${safeName}`;
      const up = await supabase.storage.from(BUCKET).upload(path, input.file, { upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.from("annual_report_attachments").insert({
        annual_report_id: annualReportId,
        company_id: companyId,
        section_id: input.sectionId ?? null,
        file_name: input.file.name,
        file_path: path,
        status: "pending",
        description: input.description ?? null,
        uploaded_by: auth.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bilaga uppladdad");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "reconciled" | "pending" | "missing" }) => {
      const { error } = await supabase
        .from("annual_report_attachments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const att = query.data?.find((a) => a.id === id);
      if (att) await supabase.storage.from(BUCKET).remove([att.file_path]);
      const { error } = await supabase.from("annual_report_attachments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  return { ...query, upload, updateStatus, remove, getSignedUrl };
}
