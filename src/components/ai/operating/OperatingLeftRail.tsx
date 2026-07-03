import { Bot, Zap, ShieldCheck, Megaphone, Activity, Clock, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

export type CanvasSection = "system" | "agents" | "triggers" | "rules" | "outputs" | "observability";

interface Props {
  active: CanvasSection;
  onSelect: (s: CanvasSection) => void;
  counts: {
    agents: number;
    activeAgents: number;
    triggers: number;
    rules: number;
    outputs: number;
    activations: number;
  };
}

export function OperatingLeftRail({ active, onSelect, counts }: Props) {
  const groups: Array<{ heading: string; items: Array<{ key: CanvasSection | "recent" | "archive"; label: string; icon: typeof Bot; count?: number; disabled?: boolean }> }> = [
    {
      heading: "Workspace",
      items: [
        { key: "system", label: "System Definition", icon: ShieldCheck },
        { key: "recent", label: "Recent activity", icon: Clock, count: counts.activations, disabled: true },
      ],
    },
    {
      heading: "Operating layers",
      items: [
        { key: "agents", label: "Agents", icon: Bot, count: counts.activeAgents },
        { key: "triggers", label: "Triggers", icon: Zap, count: counts.triggers },
        { key: "rules", label: "Rules", icon: ShieldCheck, count: counts.rules },
        { key: "outputs", label: "Output surfaces", icon: Megaphone, count: counts.outputs },
        { key: "observability", label: "Observability", icon: Activity },
      ],
    },
    {
      heading: "Library",
      items: [
        { key: "archive", label: "Archived", icon: Archive, disabled: true },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex flex-col bg-white border border-slate-200/70 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">Console</div>
        <div className="text-sm font-semibold text-slate-900 tracking-tight mt-0.5">AI Operating</div>
      </div>
      <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.heading}>
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {g.heading}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = it.icon;
                const isActive = active === (it.key as CanvasSection);
                const isDisabled = it.disabled;
                return (
                  <button
                    key={it.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && onSelect(it.key as CanvasSection)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left",
                      isActive && "bg-[#EFF6FF] text-[#3b82f6] font-medium",
                      !isActive && !isDisabled && "text-slate-700 hover:bg-slate-50",
                      isDisabled && "text-slate-400 cursor-not-allowed",
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#3b82f6]" : "text-slate-500")} />
                    <span className="flex-1 truncate">{it.label}</span>
                    {typeof it.count === "number" && (
                      <span className={cn(
                        "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full font-medium",
                        isActive ? "bg-[#EFF6FF] text-[#3b82f6]" : "bg-slate-100 text-slate-600"
                      )}>
                        {it.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
