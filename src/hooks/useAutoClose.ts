import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutoCloseResult {
  run_id: string;
  status: "ready" | "blocked" | "completed";
  dry_run?: boolean;
  live_preview: {
    net_result: number;
    tax_estimate: number;
    cash: number;
    equity: number;
    br_diff: number;
  };
  adjustments_applied: Array<{ id: string; account: string; impact: number }>;
  blockers?: Array<{ key: string; title: string; severity: string; fix_cta: string }>;
  annual_report_id?: string;
}

export function useAutoClose() {
  const qc = useQueryClient();

  const preview = useMutation({
    mutationFn: async (input: { companyId: string; fiscalYear: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("auto-close-year", {
        body: {
          company_id: input.companyId,
          fiscal_year: input.fiscalYear,
          dry_run: true,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      return data as AutoCloseResult;
    },
    onError: (e: Error) => toast.error(e.message || "Kunde inte simulera bokslut"),
  });

  const execute = useMutation({
    mutationFn: async (input: { companyId: string; fiscalYear: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("auto-close-year", {
        body: {
          company_id: input.companyId,
          fiscal_year: input.fiscalYear,
          dry_run: false,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      return data as AutoCloseResult;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["closing-status"] });
      qc.invalidateQueries({ queryKey: ["ar-ai-suggestions"] });
      if (data.status === "completed") {
        toast.success("Räkenskapsåret är stängt");
      } else if (data.status === "blocked") {
        toast.error(`Stängning blockerad: ${data.blockers?.length ?? 0} problem`);
      }
    },
    onError: (e: Error) => toast.error(e.message || "Kunde inte stänga året"),
  });

  return { preview, execute };
}
