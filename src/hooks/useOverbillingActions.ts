import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Args {
  invoiceId: string;
  companyId: string;
  supplierId?: string | null;
}

export function useOverbillingActions({ invoiceId, companyId, supplierId }: Args) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["risk-signals", invoiceId] });
    qc.invalidateQueries({ queryKey: ["ap-invoices", companyId] });
  };

  const acceptDeviation = useMutation({
    mutationFn: async (reason: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inte inloggad");
      const trimmed = reason.trim();
      if (!trimmed) throw new Error("Ange en motivering");

      const { error: re } = await supabase
        .from("invoice_risk_signals" as never)
        .update({ resolved_at: new Date().toISOString() } as never)
        .eq("invoice_id", invoiceId)
        .eq("kind", "overbilling")
        .is("resolved_at", null);
      if (re) throw re;

      const { error: oe } = await supabase.from("invoice_overrides" as never).insert({
        invoice_id: invoiceId,
        company_id: companyId,
        user_id: u.user.id,
        override_type: "accept_deviation",
        reason: trimmed,
      } as never);
      if (oe) throw oe;
    },
    onSuccess: () => {
      toast.success("Avvikelse accepterad och loggad");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const flagSupplier = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error("Leverantörsprofil saknas");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inte inloggad");

      const { error: ue } = await supabase
        .from("supplier_profiles" as never)
        .update({ flagged: true } as never)
        .eq("id", supplierId);
      if (ue) throw ue;

      await supabase.from("invoice_overrides" as never).insert({
        invoice_id: invoiceId,
        company_id: companyId,
        user_id: u.user.id,
        override_type: "flag_supplier",
        reason: "Leverantör flaggad p.g.a. prisavvikelse",
      } as never);
    },
    onSuccess: () => {
      toast.success("Leverantör flaggad — framtida fakturor får skärpt kontroll");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openInvestigation = useMutation({
    mutationFn: async (comment: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inte inloggad");
      const trimmed = comment.trim();
      if (!trimmed) throw new Error("Ange en kommentar");

      await supabase.from("invoice_overrides" as never).insert({
        invoice_id: invoiceId,
        company_id: companyId,
        user_id: u.user.id,
        override_type: "investigate",
        reason: trimmed,
      } as never);
    },
    onSuccess: () => {
      toast.success("Utredning påbörjad");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { acceptDeviation, flagSupplier, openInvestigation };
}
