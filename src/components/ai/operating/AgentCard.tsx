import { cn } from "@/lib/utils";
import { Pause, Play, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AgentRow } from "./useAgentRegistry";
import { getAgentMeta } from "./agentSeed";
import { thresholdFractionForAgent, useDecisionThresholds } from "@/lib/ai/decisionThresholds";

interface Props {
  agent: AgentRow;
  selected?: boolean;
  onSelect?: () => void;
  onTogglePause?: () => void;
  fireCount24h?: number;
  liveConfidence?: number; // 0–1
}

const ACCENT_RING: Record<string, string> = {
  cyan: "ring-[#3b82f6]",
  emerald: "ring-emerald-300",
  amber: "ring-amber-300",
  rose: "ring-rose-300",
  slate: "ring-slate-300",
};

const ACCENT_BG: Record<string, string> = {
  cyan: "bg-[#EFF6FF] text-[#3b82f6]",
  emerald: "bg-[#E1F5EE] text-[#085041]",
  amber: "bg-[#FAEEDA] text-[#7A5417]",
  rose: "bg-[#FCE8E8] text-[#7A1A1A]",
  slate: "bg-slate-100 text-slate-700",
};

export function AgentCard({
  agent, selected, onSelect, onTogglePause, fireCount24h = 0, liveConfidence,
}: Props) {
  // Re-render when user edits thresholds in Beslutsmotor.
  useDecisionThresholds();
  const meta = getAgentMeta(agent.agent_key);
  const Icon = meta?.icon ?? Activity;
  const accent = meta?.accent ?? "slate";

  const status = agent.is_paused
    ? { label: "Paused", cls: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]" }
    : fireCount24h > 0
    ? { label: "Running", cls: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" }
    : { label: "Idle", cls: "bg-slate-100 text-slate-700 border-slate-200" };

  const conf = liveConfidence ?? thresholdFractionForAgent(agent.agent_key);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative text-left w-full min-h-[124px] rounded-2xl border bg-white p-4",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]",
        "transition-all duration-150",
        selected
          ? `border-[#3b82f6] ring-2 ${ACCENT_RING[accent]}`
          : "border-slate-200/70 hover:border-slate-300"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", ACCENT_BG[accent])}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 tracking-tight truncate">
              {agent.name}
            </div>
            <div className={cn("inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-medium tabular-nums", status.cls)}>
              <span className="w-1 h-1 rounded-full bg-current" />
              {status.label}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-[11px] text-slate-600 line-clamp-2 leading-snug">
        {agent.mission}
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <div className="text-slate-400 uppercase tracking-wider">Triggers 24h</div>
          <div className="font-semibold text-slate-800 tabular-nums">{fireCount24h}</div>
        </div>
        <div>
          <div className="text-slate-400 uppercase tracking-wider">Konfidens</div>
          <div className="font-semibold text-slate-800 tabular-nums">{Math.round(conf * 100)}%</div>
        </div>
        <div>
          <div className="text-slate-400 uppercase tracking-wider">Moduler</div>
          <div className="font-semibold text-slate-800 tabular-nums">{agent.owned_modules.length}</div>
        </div>
      </div>

      <div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onTogglePause?.(); }}
      >
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
          <span>{agent.is_paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}</span>
        </Button>
      </div>
    </button>
  );
}
