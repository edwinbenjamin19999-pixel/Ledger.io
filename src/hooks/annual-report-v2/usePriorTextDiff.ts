// usePriorTextDiff — calls ar-prior-text-diff to compare current vs prior year text.
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PriorTextDiffEntry {
  sectionType: string;
  status: "reuse" | "update" | "remove" | "new";
  current: string | null;
  prior: string | null;
  suggestion: string | null;
}

export function usePriorTextDiff() {
  return useMutation({
    mutationFn: async (input: { annualReportId: string; priorReportId: string }) => {
      const { data, error } = await supabase.functions.invoke("ar-prior-text-diff", { body: input });
      if (error) throw error;
      return (data?.diff ?? []) as PriorTextDiffEntry[];
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
