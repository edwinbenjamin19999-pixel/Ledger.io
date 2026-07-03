import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnnualReportAdjustment {
  id: string;
  annual_report_id: string;
  company_id: string;
  account_number: string;
  debit: number;
  credit: number;
  description: string | null;
  affected_areas: string[];
  source: "manual" | "ai_suggestion" | "depreciation" | "accrual";
  ai_suggestion_id: string | null;
  confidence: number | null;
  is_reversed: boolean;
  created_by: string;
  created_at: string;
}

export function useAnnualReportAdjustments(annualReportId: string | null, companyId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ar-adjustments", annualReportId],
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_report_adjustments")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .eq("is_reversed", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AnnualReportAdjustment[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!annualReportId) return;
    const channel = supabase
      .channel(`ar-adj-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "annual_report_adjustments", filter: `annual_report_id=eq.${annualReportId}` },
        () => qc.invalidateQueries({ queryKey: ["ar-adjustments", annualReportId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [annualReportId, qc]);

  const create = useMutation({
    mutationFn: async (input: {
      account_number: string;
      debit: number;
      credit: number;
      description?: string;
      affected_areas?: string[];
      source?: AnnualReportAdjustment["source"];
      ai_suggestion_id?: string | null;
      confidence?: number | null;
    }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar rapport-ID");
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Inte inloggad");
      const { data, error } = await supabase
        .from("annual_report_adjustments")
        .insert({
          annual_report_id: annualReportId,
          company_id: companyId,
          account_number: input.account_number,
          debit: input.debit,
          credit: input.credit,
          description: input.description ?? null,
          affected_areas: input.affected_areas ?? [],
          source: input.source ?? "manual",
          ai_suggestion_id: input.ai_suggestion_id ?? null,
          confidence: input.confidence ?? null,
          created_by: u.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar-adjustments", annualReportId] });
      toast.success("Justering skapad");
    },
    onError: (e: Error) => toast.error(e.message || "Kunde inte skapa justering"),
  });

  const reverse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("annual_report_adjustments")
        .update({ is_reversed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-adjustments", annualReportId] }),
  });

  return { ...query, create, reverse };
}

/**
 * Build a Map<account_number, netDelta> from active adjustments.
 * netDelta is debit - credit (positive = debit balance increase).
 */
export function buildAdjustmentDeltaMap(adjustments: AnnualReportAdjustment[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of adjustments) {
    const cur = m.get(a.account_number) || 0;
    m.set(a.account_number, cur + (Number(a.debit) - Number(a.credit)));
  }
  return m;
}
