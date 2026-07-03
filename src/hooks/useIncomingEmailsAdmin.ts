import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IncomingEmailAdminRow {
  id: string;
  company_id: string | null;
  from_email: string | null;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  attachments: Array<{ filename?: string }> | null;
  status: string | null;
  document_ids: string[] | null;
  error_message: string | null;
  created_at: string;
}

export interface CompanyInbox {
  id: string;
  name: string;
  org_number: string | null;
  email_inbox_address: string | null;
}

export const useIncomingEmailsAdmin = () => {
  const [rows, setRows] = useState<IncomingEmailAdminRow[]>([]);
  const [companies, setCompanies] = useState<CompanyInbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emailsRes, companiesRes] = await Promise.all([
        supabase
          .from("incoming_emails")
          .select("id, company_id, from_email, from_name, to_email, subject, attachments, status, document_ids, error_message, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("companies")
          .select("id, name, org_number, email_inbox_address")
          .order("name", { ascending: true })
          .limit(200),
      ]);
      if (emailsRes.error) throw emailsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      setRows((emailsRes.data as unknown as IncomingEmailAdminRow[]) || []);
      setCompanies((companiesRes.data as unknown as CompanyInbox[]) || []);
    } catch (e: any) {
      setError(e?.message ?? "Kunde inte ladda data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { rows, companies, loading, error, reload: load };
};
