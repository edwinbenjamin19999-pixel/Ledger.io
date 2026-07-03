import { Bot } from "lucide-react";
import { BlockShell } from "./BlockShell";
import { AgentCard } from "./AgentCard";
import type { AgentRow } from "./useAgentRegistry";

interface Props {
  agents: AgentRow[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTogglePause: (id: string, next: boolean) => void;
  fireCounts: Record<string, number>;
  liveConfidence: Record<string, number>;
}

export function AgentGrid({
  agents, loading, selectedId, onSelect, onTogglePause, fireCounts, liveConfidence,
}: Props) {
  return (
    <BlockShell
      label="L2 · AGENT REGISTRY"
      title="Aktiva intelligensenheter"
      subtitle={`${agents.filter((a) => !a.is_paused).length} aktiva av ${agents.length}`}
      icon={Bot}
    >
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[124px] rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Inga agenter registrerade.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              selected={selectedId === a.id}
              onSelect={() => onSelect(a.id)}
              onTogglePause={() => onTogglePause(a.id, !a.is_paused)}
              fireCount24h={fireCounts[a.agent_key] ?? 0}
              liveConfidence={liveConfidence[a.agent_key]}
            />
          ))}
        </div>
      )}
    </BlockShell>
  );
}
