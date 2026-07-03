/**
 * useScenarios — list/save/update/delete scenarios + version snapshots.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ScenarioKind } from "@/lib/scenarios/aiPresets";

export interface SavedScenario {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  kind: ScenarioKind;
  driver_patch: Record<string, number> | null;
  target_kpis: Record<string, number> | null;
  is_pinned: boolean;
  growth_pct: number;
  cost_pct: number;
  assumptions: unknown;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ScenarioInput {
  budgetId: string;
  name: string;
  description?: string;
  kind: ScenarioKind;
  driverPatch: Record<string, number>;
  targetKpis?: Record<string, number>;
  isPinned?: boolean;
}

export function useScenarios(budgetId: string | null) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["scenarios", budgetId],
    enabled: !!budgetId,
    queryFn: async () => {
      if (!budgetId) return [] as SavedScenario[];
      const { data, error } = await supabase
        .from("budget_scenarios")
        .select("*")
        .eq("budget_id", budgetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SavedScenario[];
    },
  });

  const save = useMutation({
    mutationFn: async (input: ScenarioInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("budget_scenarios")
        .insert({
          budget_id: input.budgetId,
          name: input.name,
          description: input.description ?? null,
          kind: input.kind,
          driver_patch: input.driverPatch as never,
          target_kpis: (input.targetKpis ?? null) as never,
          is_pinned: input.isPinned ?? false,
          created_by: userData.user?.id ?? null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SavedScenario;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scenarios", budgetId] }),
  });

  const update = useMutation({
    mutationFn: async (args: { id: string; patch: Partial<ScenarioInput> & { driverPatch?: Record<string, number> } }) => {
      // Snapshot existing first
      const { data: existing } = await supabase
        .from("budget_scenarios")
        .select("*")
        .eq("id", args.id)
        .maybeSingle();
      if (existing) {
        const { data: userData } = await supabase.auth.getUser();
        await supabase.from("scenario_versions").insert({
          scenario_id: args.id,
          snapshot: existing as never,
          created_by: userData.user?.id ?? null,
        } as never);
      }
      const updatePayload: Record<string, unknown> = {};
      if (args.patch.name) updatePayload.name = args.patch.name;
      if (args.patch.description !== undefined) updatePayload.description = args.patch.description;
      if (args.patch.driverPatch) updatePayload.driver_patch = args.patch.driverPatch;
      if (args.patch.targetKpis) updatePayload.target_kpis = args.patch.targetKpis;
      if (args.patch.kind) updatePayload.kind = args.patch.kind;
      if (args.patch.isPinned !== undefined) updatePayload.is_pinned = args.patch.isPinned;
      const { data, error } = await supabase
        .from("budget_scenarios")
        .update(updatePayload as never)
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SavedScenario;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scenarios", budgetId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_scenarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scenarios", budgetId] }),
  });

  return { list, save, update, remove };
}
