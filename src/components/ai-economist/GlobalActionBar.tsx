import { Wrench, Droplets, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CFOPriority } from "@/hooks/useCFOPriorities";
import { executionLevel } from "@/lib/ai-ekonom/executionLevel";

interface Props {
  insights: CFOPriority[];
  pending: boolean;
  onFixAllCritical: (items: CFOPriority[]) => void;
  onImproveLiquidity: (items: CFOPriority[]) => void;
  onSendAllReminders: (items: CFOPriority[]) => void;
}

function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n))) + " kr";
}

export function GlobalActionBar({ insights, pending, onFixAllCritical, onImproveLiquidity, onSendAllReminders }: Props) {
  const critical = insights.filter(i =>
    i.tier === "critical" &&
    i.action_type !== "none" &&
    executionLevel(i.action_type, i.confidence, i.impact_sek) === "AUTO"
  );
  const liquidity = insights.filter(i => {
    const src = (i.source || "").toLowerCase();
    const title = (i.title || "").toLowerCase();
    return src.includes("liquid") || src.includes("cashflow") || src.includes("overdue") ||
           title.includes("likvid") || title.includes("kassa") || title.includes("förfall");
  });
  const reminders = insights.filter(i => i.action_type === "send_reminder");

  const criticalImpact = critical.reduce((s, i) => s + Math.abs(i.impact_sek || 0), 0);
  const liquidityImpact = liquidity.reduce((s, i) => s + Math.abs(i.impact_sek || 0), 0);
  const reminderImpact = reminders.reduce((s, i) => s + Math.abs(i.impact_sek || 0), 0);

  if (critical.length === 0 && liquidity.length === 0 && reminders.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-white via-blue-50/30 to-white dark:from-white/[0.04] dark:via-[#3b82f6]/[0.04] dark:to-white/[0.04] backdrop-blur-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-700 dark:text-white/70 px-2">Snabbåtgärder</span>

        <ActionPill
          icon={<Wrench className="h-3.5 w-3.5" />}
          label={`Fixa kritiska (${critical.length})`}
          impact={criticalImpact > 0 ? `+${fmtSEK(criticalImpact)}` : undefined}
          disabled={pending || critical.length === 0}
          onClick={() => onFixAllCritical(critical)}
          tone="critical"
        />
        <ActionPill
          icon={<Droplets className="h-3.5 w-3.5" />}
          label={`Förbättra likviditet (${liquidity.length})`}
          impact={liquidityImpact > 0 ? `+${fmtSEK(liquidityImpact)}` : undefined}
          disabled={pending || liquidity.length === 0}
          onClick={() => onImproveLiquidity(liquidity)}
          tone="info"
        />
        <ActionPill
          icon={<Send className="h-3.5 w-3.5" />}
          label={`Skicka påminnelser (${reminders.length})`}
          impact={reminderImpact > 0 ? `+${fmtSEK(reminderImpact)}` : undefined}
          disabled={pending || reminders.length === 0}
          onClick={() => onSendAllReminders(reminders)}
          tone="info"
        />

        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3b82f6] dark:text-[#1E3A5F]" />}
      </div>
    </div>
  );
}

function ActionPill({ icon, label, impact, disabled, onClick, tone }: {
  icon: React.ReactNode; label: string; impact?: string; disabled: boolean; onClick: () => void;
  tone: "critical" | "info";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border",
        tone === "critical"
          ? "bg-[#FCE8E8] dark:bg-[#FCE8E8] border-[#F4C8C8] dark:border-[#F4C8C8] text-[#7A1A1A] dark:text-rose-200 hover:bg-[#FCE8E8] dark:hover:bg-[#FCE8E8]"
          : "bg-[#EFF6FF] dark:bg-[#EFF6FF] border-[#C8DDF5] dark:border-[#C8DDF5] text-[#3b82f6] dark:text-[#3b82f6] hover:bg-[#EFF6FF] dark:hover:bg-[#EFF6FF]",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {icon}
      {label}
      {impact && <span className="text-[10px] opacity-70 ml-1 tabular-nums">{impact}</span>}
    </button>
  );
}
