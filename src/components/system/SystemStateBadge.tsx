import { useSystemContext, type ViewState } from "@/contexts/SystemContext";
import { useActiveScenario } from "@/lib/system/scenarioBus";
import { cn } from "@/lib/utils";
import { Activity, FileEdit, Sparkles, Lock } from "lucide-react";

const STATE_STYLES: Record<ViewState, { dot: string; text: string; ring: string; label: string; Icon: typeof Activity }> = {
  live:      { dot: "bg-emerald-500", text: "text-[#085041] dark:text-emerald-300", ring: "ring-emerald-500/20 bg-[#E1F5EE] dark:bg-emerald-950/30", label: "LIVE",      Icon: Activity },
  draft:     { dot: "bg-amber-500",   text: "text-[#7A5417] dark:text-amber-300",     ring: "ring-amber-500/20 bg-[#FAEEDA] dark:bg-amber-950/30",       label: "DRAFT",     Icon: FileEdit },
  scenario:  { dot: "bg-[#3b82f6]",    text: "text-[#3b82f6] dark:text-[#3b82f6]",       ring: "ring-[#3b82f6]/20 bg-[#EFF6FF] dark:bg-cyan-950/30",          label: "SCENARIO",  Icon: Sparkles },
  finalized: { dot: "bg-slate-500",   text: "text-slate-700 dark:text-slate-300",     ring: "ring-slate-500/20 bg-slate-100 dark:bg-slate-800/40",      label: "FINALIZED", Icon: Lock },
};

interface Props {
  className?: string;
  compact?: boolean;
}

/**
 * Sticky pill showing global system state — always visible so user knows
 * whether they're looking at live data, a draft, a scenario, or a locked period.
 */
export function SystemStateBadge({ className, compact = false }: Props) {
  const { viewState, period, setViewState } = useSystemContext();
  const { scenario } = useActiveScenario();
  const style = STATE_STYLES[viewState];
  const Icon = style.Icon;

  const subLabel = viewState === "scenario" && scenario ? scenario.name : period.label;

  return (
    <button
      type="button"
      onClick={() => {
        // Click to cycle: live → draft → finalized → live (scenario reached via activation)
        const order: ViewState[] = ["live", "draft", "finalized"];
        const idx = order.indexOf(viewState);
        setViewState(order[(idx + 1) % order.length] ?? "live");
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full ring-1 px-3 py-1.5 text-xs font-semibold transition-all hover:ring-2",
        style.ring,
        style.text,
        className,
      )}
      title="Klicka för att byta vy-läge"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot, viewState === "live" && "animate-pulse")} />
      <Icon className="h-3.5 w-3.5" />
      <span className="tracking-wide">{style.label}</span>
      {!compact && (
        <>
          <span className="opacity-40">·</span>
          <span className="font-medium opacity-80 normal-case">{subLabel}</span>
        </>
      )}
    </button>
  );
}
