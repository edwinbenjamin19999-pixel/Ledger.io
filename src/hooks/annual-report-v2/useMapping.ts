import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MappingEntry {
  id: string;
  annual_report_id: string;
  company_id: string;
  section_id: string;
  account_number: string;
  weight: number;
  is_locked: boolean;
  ai_confidence: number | null;
  source: "auto" | "user" | "prior_year" | "bas_template";
  override_reason: string | null;
}

export interface SplitDef {
  section_id: string;
  weight: number; // 0..1
}

export function useMapping(annualReportId: string | null, companyId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-mapping", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async (): Promise<MappingEntry[]> => {
      const { data, error } = await supabase
        .from("ar_section_account_map")
        .select("*")
        .eq("annual_report_id", annualReportId!);
      if (error) throw error;
      return (data ?? []) as unknown as MappingEntry[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!annualReportId) return;
    const ch = supabase
      .channel(`ar-mapping-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ar_section_account_map", filter: `annual_report_id=eq.${annualReportId}` },
        () => {
          qc.invalidateQueries({ queryKey: key });
          qc.invalidateQueries({ queryKey: ["ar-report-engine", annualReportId] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [annualReportId, qc]);

  const mappings = useMemo(() => {
    const m = new Map<string, MappingEntry[]>();
    for (const row of query.data ?? []) {
      const arr = m.get(row.account_number) ?? [];
      arr.push(row);
      m.set(row.account_number, arr);
    }
    return m;
  }, [query.data]);

  const duplicates = useMemo(() => {
    const out: string[] = [];
    for (const [acc, rows] of mappings) {
      const sum = rows.reduce((a, r) => a + Number(r.weight ?? 1), 0);
      if (sum > 1.0001) out.push(acc);
    }
    return out;
  }, [mappings]);

  const assign = useMutation({
    mutationFn: async (input: { account: string; sectionId: string; weight?: number }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar utkast");
      const { error } = await supabase.from("ar_section_account_map").upsert(
        {
          annual_report_id: annualReportId,
          company_id: companyId,
          section_id: input.sectionId,
          account_number: input.account,
          weight: input.weight ?? 1.0,
          source: "user",
          is_locked: false,
        },
        { onConflict: "section_id,account_number" },
      );
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unassign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_section_account_map").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const split = useMutation({
    mutationFn: async (input: { account: string; splits: SplitDef[] }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar utkast");
      const sum = input.splits.reduce((a, s) => a + s.weight, 0);
      if (Math.abs(sum - 1) > 0.001) throw new Error("Vikter måste summera till 100%");
      // Remove existing for this account
      await supabase.from("ar_section_account_map")
        .delete()
        .eq("annual_report_id", annualReportId)
        .eq("account_number", input.account);
      const rows = input.splits.map((s) => ({
        annual_report_id: annualReportId,
        company_id: companyId,
        section_id: s.section_id,
        account_number: input.account,
        weight: s.weight,
        source: "user" as const,
      }));
      const { error } = await supabase.from("ar_section_account_map").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Konto splittrat"),
    onError: (e: Error) => toast.error(e.message),
  });

  const lock = useMutation({
    mutationFn: async (input: { id: string; locked: boolean }) => {
      const { error } = await supabase.from("ar_section_account_map")
        .update({ is_locked: input.locked })
        .eq("id", input.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkAssign = useMutation({
    mutationFn: async (input: { accounts: string[]; sectionId: string }) => {
      if (!annualReportId || !companyId) throw new Error("Saknar utkast");
      const rows = input.accounts.map((a) => ({
        annual_report_id: annualReportId,
        company_id: companyId,
        section_id: input.sectionId,
        account_number: a,
        weight: 1.0,
        source: "user" as const,
      }));
      const { error } = await supabase.from("ar_section_account_map").upsert(rows, { onConflict: "section_id,account_number" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => toast.success(`${v.accounts.length} konton mappade`),
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: async () => {
      if (!annualReportId) throw new Error("Saknar utkast");
      const { error } = await supabase.from("ar_section_account_map")
        .delete()
        .eq("annual_report_id", annualReportId)
        .eq("is_locked", false);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Mappning återställd"),
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    ...query,
    mappings,
    duplicates,
    assign,
    unassign,
    split,
    lock,
    bulkAssign,
    reset,
  };
}
