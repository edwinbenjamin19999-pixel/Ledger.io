import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { DEFAULT_AGENTS } from "./agentSeed";

export interface AgentRow {
  id: string;
  company_id: string;
  agent_key: string;
  name: string;
  mission: string | null;
  owned_modules: string[];
  triggers: string[];
  allowed_actions: string[];
  confidence_threshold: number;
  review_required: boolean;
  is_paused: boolean;
  last_run_at: string | null;
}

export function useAgentRegistry() {
  const companyId = useCompanyId();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setAgents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_agent_registry" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("agent_key");

    if (error) {
      console.error("[useAgentRegistry] load error", error);
      setAgents([]);
      setLoading(false);
      return;
    }

    let rows = (data ?? []) as unknown as AgentRow[];

    // Auto-seed if empty (covers companies created before the seed trigger existed)
    if (rows.length === 0) {
      const inserts = DEFAULT_AGENTS.map((a) => ({
        company_id: companyId,
        agent_key: a.agent_key,
        name: a.name,
        mission: a.mission,
        owned_modules: a.owned_modules,
        triggers: a.triggers,
        allowed_actions: a.allowed_actions,
        confidence_threshold: a.confidence_threshold,
        review_required: a.review_required,
      }));
      const { data: seeded } = await supabase
        .from("ai_agent_registry" as any)
        .insert(inserts as any)
        .select();
      rows = (seeded ?? []) as unknown as AgentRow[];
    }

    setAgents(rows);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePause = useCallback(
    async (agentId: string, paused: boolean) => {
      await supabase
        .from("ai_agent_registry" as any)
        .update({ is_paused: paused } as any)
        .eq("id", agentId);
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, is_paused: paused } : a))
      );
    },
    []
  );

  const updateThreshold = useCallback(
    async (agentId: string, threshold: number) => {
      await supabase
        .from("ai_agent_registry" as any)
        .update({ confidence_threshold: threshold } as any)
        .eq("id", agentId);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId ? { ...a, confidence_threshold: threshold } : a
        )
      );
    },
    []
  );

  return { agents, loading, reload: load, togglePause, updateThreshold };
}
