import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceComment {
  id: string;
  invoice_id: string;
  company_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export function useInvoiceComments(invoiceId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["invoice-comments", invoiceId],
    enabled: !!invoiceId,
    queryFn: async (): Promise<InvoiceComment[]> => {
      const { data, error } = await supabase
        .from("invoice_comments")
        .select("id,invoice_id,company_id,user_id,content,created_at")
        .eq("invoice_id", invoiceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InvoiceComment[];
    },
  });

  useEffect(() => {
    if (!invoiceId) return;
    const channel = supabase
      .channel(`invoice-comments-${invoiceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoice_comments", filter: `invoice_id=eq.${invoiceId}` },
        () => qc.invalidateQueries({ queryKey: ["invoice-comments", invoiceId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [invoiceId, qc]);

  return query;
}

export function useAddInvoiceComment(invoiceId: string | null, companyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!invoiceId || !companyId) throw new Error("Saknar faktura/bolag");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inte inloggad");
      const { error } = await supabase.from("invoice_comments").insert({
        invoice_id: invoiceId,
        company_id: companyId,
        user_id: u.user.id,
        content,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-comments", invoiceId] });
    },
  });
}
