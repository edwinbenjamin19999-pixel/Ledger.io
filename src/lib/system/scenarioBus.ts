import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSystemContext } from "@/contexts/SystemContext";

export interface ActiveScenario {
  id: string;
  name: string;
  growth_pct?: number;
  cost_pct?: number;
}

/**
 * Single global active scenario. When set, all modules render scenario-data
 * instead of live data. Visual indicator: cyan glow + "SCENARIO" pill.
 */
export function useActiveScenario() {
  const { scenarioId, companyId, setScenarioId } = useSystemContext();
  const [scenario, setScenario] = useState<ActiveScenario | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scenarioId || !companyId) { setScenario(null); return; }
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("budget_scenarios")
        .select("id, name, growth_pct, cost_pct")
        .eq("id", scenarioId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        // Stale scenario id — clear it
        setScenario(null);
        setScenarioId(null);
      } else {
        setScenario({
          id: data.id,
          name: data.name,
          growth_pct: data.growth_pct ?? undefined,
          cost_pct: data.cost_pct ?? undefined,
        });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [scenarioId, companyId, setScenarioId]);

  return {
    scenario,
    loading,
    isActive: !!scenario,
    activate: setScenarioId,
    deactivate: () => setScenarioId(null),
  };
}
