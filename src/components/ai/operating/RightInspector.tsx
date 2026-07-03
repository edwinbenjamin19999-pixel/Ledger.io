import { useEffect, useState } from "react";
import { X, Play, AlertCircle, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentRow } from "./useAgentRegistry";
import { getAgentMeta } from "./agentSeed";
import {
  thresholdKeyForAgent,
  thresholdFractionForAgent,
  useDecisionThresholds,
  DEFAULT_THRESHOLDS,
} from "@/lib/ai/decisionThresholds";
import { toast } from "sonner";

interface Props {
  selectedAgent: AgentRow | null;
  selectedTrigger: string | null;
  onClose: () => void;
  /** Kept for prop-compat; thresholds are now edited in Beslutsmotor only. */
  onUpdateThreshold?: (id: string, v: number) => void;
}

export function RightInspector({ selectedAgent, selectedTrigger, onClose }: Props) {
  const companyId = useCompanyId();
  const [logs, setLogs] = useState<Array<{ id: string; task_type: string; status: string; created_at: string }>>([]);
  // Subscribe so the read-only value re-renders when Beslutsmotor changes it.
  useDecisionThresholds();


  useEffect(() => {
    if (!companyId) return;
    if (!selectedAgent && !selectedTrigger) {
      setLogs([]);
      return;
    }
    (async () => {
      let q = supabase
        .from("automation_tasks")
        .select("id,task_type,status,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (selectedTrigger) q = q.ilike("task_type", `%${selectedTrigger}%`);
      const { data } = await q;
      const dbLogs = (data ?? []) as Array<{ id: string; task_type: string; status: string; created_at: string }>;
      if (dbLogs.length > 0) {
        setLogs(dbLogs);
        return;
      }
      // Fall back to fleet-derived activity so the inspector mirrors what
      // the agent page itself shows when DB telemetry is empty.
      const { getFleetRecentActivity, getFleetByRegistryKey } = await import("@/lib/ai/agentFleet");
      let fleet = getFleetRecentActivity();
      if (selectedAgent) {
        const entries = getFleetByRegistryKey(selectedAgent.agent_key);
        const allowed = new Set(entries.flatMap((e) => e.triggers ?? []));
        if (allowed.size > 0) {
          fleet = fleet.filter((e) =>
            [...allowed].some((t) => e.task_type.startsWith(t)),
          );
        }
      }
      if (selectedTrigger) {
        fleet = fleet.filter((e) => e.task_type.startsWith(selectedTrigger));
      }
      setLogs(fleet);
    })();
  }, [companyId, selectedAgent?.id, selectedTrigger]);

  if (!selectedAgent && !selectedTrigger) {
    return (
      <aside className="hidden xl:flex flex-col bg-white border border-slate-200/70 rounded-2xl">
        <div className="p-5 text-center my-auto">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Välj en agent eller trigger för att inspektera</p>
          <p className="text-xs text-slate-400 mt-1">Runtime-state, körningar och policy visas här.</p>
        </div>
      </aside>
    );
  }

  const meta = selectedAgent ? getAgentMeta(selectedAgent.agent_key) : null;
  const Icon = meta?.icon;

  return (
    <aside className="hidden xl:flex flex-col bg-white border border-slate-200/70 rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">Inspector</div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {selectedAgent && (
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className="w-4 h-4 text-slate-700" />}
              <h4 className="text-sm font-semibold text-slate-900 tracking-tight">{selectedAgent.name}</h4>
            </div>
            <p className="text-xs text-slate-600 leading-snug">{selectedAgent.mission}</p>

            <div className="mt-3 space-y-2.5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Owned modules</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedAgent.owned_modules.map((m) => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">{m}</span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Allowed actions</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedAgent.allowed_actions.map((a) => (
                    <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#3b82f6] font-mono">{a}</span>
                  ))}
                </div>
              </div>

              <div>
                {(() => {
                  const tKey = thresholdKeyForAgent(selectedAgent.agent_key);
                  const pct = Math.round(thresholdFractionForAgent(selectedAgent.agent_key) * 100);
                  const label = DEFAULT_THRESHOLDS.find((t) => t.key === tKey)?.label ?? tKey;
                  return (
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Konfidenströskel
                          </div>
                          <div className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                            {pct}%
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                            Styrs av <span className="font-mono">{label}</span> i Beslutsmotor
                          </div>
                        </div>
                        <Link
                          to="/agents/beslutsmotor"
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <SlidersHorizontal className="h-3 w-3" />
                          Justera
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}


        {selectedTrigger && (
          <div className="p-4 border-b border-slate-100">
            <div className="font-mono text-[11px] text-slate-700">{selectedTrigger}</div>
            <Button size="sm" className="mt-3 w-full" onClick={() => toast.info("Test run dispatched")}>
              <Play className="w-3 h-3" /> Kör testkörning
            </Button>
          </div>
        )}

        <div className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Execution log ({logs.length})
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-400">Inga körningar registrerade.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-2 text-[11px]">
                  <span className={cn(
                    "w-1 h-1 rounded-full",
                    l.status === "completed" && "bg-emerald-500",
                    l.status === "failed" && "bg-rose-500",
                    l.status === "running" && "bg-[#3b82f6] animate-pulse",
                    !["completed", "failed", "running"].includes(l.status) && "bg-slate-300",
                  )} />
                  <span className="font-mono text-slate-700 flex-1 truncate">{l.task_type}</span>
                  <span className="text-slate-400 tabular-nums">
                    {new Date(l.created_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
