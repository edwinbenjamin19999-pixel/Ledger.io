import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { StatusNowCard } from "./StatusNowCard";
import { KpiStrip } from "./KpiStrip";
import { ActivityFeed } from "./ActivityFeed";
import { SettingsPanel } from "./SettingsPanel";
import { ManualActions } from "./ManualActions";
import type { AgentLayoutProps } from "./types";

/**
 * AgentLayout — shared template for every AI agent page in Bokfy.
 *
 * Structure (top to bottom):
 *   1. Header (icon, name, description, status pill, pause/resume switch)
 *   2. Status nu (working / idle / paused / error)
 *   3. Denna månad (KPI strip)
 *   4. Senaste arbete (activity feed with filters)
 *   5. Inställningar (collapsed; universal autonomy + threshold + agent-specific)
 *   6. Manuella åtgärder
 *
 * Individual agents (CNT-36..CNT-43) consume this template and only supply
 * their own data and `agentSpecificSettings`.
 */
export function AgentLayout(props: AgentLayoutProps) {
  const {
    icon: Icon,
    name,
    description,
    isActive,
    isPaused,
    onToggleActive,
    statusNow,
    kpis,
    activity,
    initialActivityCount = 10,
    settings,
    onSettingsChange,
    agentSpecificSettings,
    manualActions,
    extraSection,
  } = props;

  const pillState: "active" | "paused" | "inactive" = isPaused
    ? "paused"
    : isActive
      ? "active"
      : "inactive";

  const pill = {
    active: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Aktiv" },
    paused: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Pausad" },
    inactive: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50 border-slate-200", label: "Inaktiv" },
  }[pillState];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-6 space-y-6">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 text-[#3b82f6]">
            <Icon size={32} strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-[20px] font-medium leading-tight text-slate-900 dark:text-slate-100">
              {name}
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              pill.bg,
              pill.text,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", pill.dot)} />
            {pill.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {isActive ? "På" : "Av"}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={onToggleActive}
              aria-label={isActive ? "Pausa agenten" : "Återaktivera agenten"}
            />
          </div>
        </div>
      </header>

      {/* SECTION 1 — STATUS NU */}
      <section>
        <StatusNowCard
          status={statusNow}
          onResume={
            statusNow.state === "paused" ? () => onToggleActive(true) : undefined
          }
        />
      </section>

      {/* SECTION 2 — DENNA MÅNAD */}
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Denna månad
        </div>
        <KpiStrip kpis={kpis} />
      </section>

      {/* SECTION 3 — SENASTE ARBETE */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Senaste arbete
          </div>
        </div>
        <ActivityFeed rows={activity} initialCount={initialActivityCount} />
      </section>

      {extraSection}

      {/* SECTION 4 — INSTÄLLNINGAR */}
      <section>
        <SettingsPanel
          value={settings}
          onChange={onSettingsChange}
          agentSpecific={agentSpecificSettings}
        />
      </section>

      {/* SECTION 5 — MANUELLA ÅTGÄRDER */}
      <section>
        <ManualActions handlers={manualActions} />
      </section>
    </div>
  );
}

export default AgentLayout;
