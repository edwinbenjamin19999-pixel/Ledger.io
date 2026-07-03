import { useMemo, useState, useEffect } from "react";
import { Activity, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAgentRegistry } from "./useAgentRegistry";
import { useOperatingHealth } from "./useOperatingHealth";
import { OperatingLeftRail, type CanvasSection } from "./OperatingLeftRail";
import { RightInspector } from "./RightInspector";
import { MetricImpactStrip } from "./MetricImpactStrip";
import { SystemDefinitionBlock } from "./SystemDefinitionBlock";
import { AgentGrid } from "./AgentGrid";
import { TriggerListView } from "./TriggerListView";
import { RuleBlock } from "./RuleBlock";
import { OutputSurfaceMap } from "./OutputSurfaceMap";
import { ObservabilityBlock } from "./ObservabilityBlock";
import { cn } from "@/lib/utils";

export function OperatingConsole() {
  const companyId = useCompanyId();
  const { agents, loading: agentsLoading, togglePause, updateThreshold } = useAgentRegistry();
  const health = useOperatingHealth();

  const [section, setSection] = useState<CanvasSection>("agents");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [fireCounts, setFireCounts] = useState<Record<string, number>>({});
  const [liveConfidence, setLiveConfidence] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("automation_tasks")
        .select("task_type")
        .eq("company_id", companyId)
        .gte("created_at", since);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((t: any) => {
        if (t.task_type) counts[t.task_type] = (counts[t.task_type] ?? 0) + 1;
      });
      // Map by agent_key heuristic — sum tasks whose key is in agent.triggers
      // and merge with fleet baseline so we never display 0 when the
      // per-agent page clearly has activity.
      const { fleetActions24hForRegistryKey } = await import("@/lib/ai/agentFleet");
      const byAgent: Record<string, number> = {};
      agents.forEach((a) => {
        const dbCount = a.triggers.reduce((s, t) => s + (counts[t] ?? 0), 0);
        const fleetCount = fleetActions24hForRegistryKey(a.agent_key);
        byAgent[a.agent_key] = Math.max(dbCount, fleetCount);
      });
      setFireCounts(byAgent);

      const { data: confData } = await supabase
        .from("agent_confidence_history")
        .select("avg_confidence")
        .eq("company_id", companyId)
        .order("month", { ascending: false })
        .limit(1);
      const avg = (confData?.[0] as any)?.avg_confidence;
      if (avg != null) {
        const map: Record<string, number> = {};
        agents.forEach((a) => { map[a.agent_key] = Number(avg); });
        setLiveConfidence(map);
      }
    })();
  }, [companyId, agents]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  const counts = {
    agents: agents.length,
    activeAgents: agents.filter((a) => !a.is_paused).length,
    triggers: 8,
    rules: 0,
    outputs: 8,
    activations: health.automationsToday,
  };

  if (!companyId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">Inget bolag valt</h3>
          <p className="text-sm text-slate-500 mt-1">
            Välj ett bolag i sidopanelen för att aktivera AI Operating Console.
          </p>
        </div>
      </div>
    );
  }

  // Derive a user-facing status from real signals: paused agents + failed runs.
  // "Degraded" was firing on benign signals (pending reviews) which is misleading
  // when every agent is actually running.
  const allAgentsActive = agents.length > 0 && agents.every((a) => !a.is_paused);
  const derivedStatus: "healthy" | "degraded" | "blocked" =
    health.failedRuns24h > 5
      ? "blocked"
      : health.failedRuns24h > 0 || (!allAgentsActive && agents.length > 0)
      ? "degraded"
      : "healthy";

  const statusBadge = {
    healthy: { label: "Operativ", cls: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]", dot: "bg-emerald-500" },
    degraded: { label: "Degraderad", cls: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]", dot: "bg-amber-500" },
    blocked: { label: "Blockerad", cls: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]", dot: "bg-rose-500" },
  }[derivedStatus];

  const lastRunFmt = health.lastRunAt
    ? new Date(health.lastRunAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })
    : "—";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header */}
      <header className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/70">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">
              Ledger.io · Operating Layer
            </div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight mt-0.5">
              AI Operating Console
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", statusBadge.cls)}>
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusBadge.dot)} />
              {statusBadge.label}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
              <span className="font-mono text-slate-400">env</span> production
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500 tabular-nums">
              <RefreshCcw className="w-3 h-3" />
              senast {lastRunFmt}
            </span>
          </div>
        </div>
      </header>

      {/* 3-pane layout */}
      <div className="px-4 md:px-6 py-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_360px]">
        <OperatingLeftRail active={section} onSelect={setSection} counts={counts} />

        <main className="space-y-4 min-w-0">
          <MetricImpactStrip health={health} />

          {section === "system" && <SystemDefinitionBlock />}
          {section === "agents" && (
            <AgentGrid
              agents={agents}
              loading={agentsLoading}
              selectedId={selectedAgentId}
              onSelect={(id) => { setSelectedAgentId(id); setSelectedTrigger(null); }}
              onTogglePause={togglePause}
              fireCounts={fireCounts}
              liveConfidence={liveConfidence}
            />
          )}
          {section === "triggers" && (
            <TriggerListView
              selectedKey={selectedTrigger}
              onSelect={(k) => { setSelectedTrigger(k); setSelectedAgentId(null); }}
            />
          )}
          {section === "rules" && <RuleBlock />}
          {section === "outputs" && <OutputSurfaceMap />}
          {section === "observability" && <ObservabilityBlock />}
        </main>

        <RightInspector
          selectedAgent={selectedAgent}
          selectedTrigger={selectedTrigger}
          onClose={() => { setSelectedAgentId(null); setSelectedTrigger(null); }}
          onUpdateThreshold={updateThreshold}
        />
      </div>
    </div>
  );
}
