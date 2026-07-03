/**
 * FinOS — ModuleShell. Enforces the same 5-region layout for every core module:
 *
 *   ┌─ HeroSummary       (props: hero)
 *   ├─ AIInsightLayer    (props: insights — usually <FinOSInsightStack>)
 *   ├─ ActionLayer       (props: actions  — usually <FinOSActionQueue>)
 *   ├─ OperationalDetail (props: children — module-specific)
 *   └─ DrilldownDrawer   (props: drawer — mounted, opens on demand)
 *
 * Modules fill slots; they never reinvent the order.
 */
import { cn } from "@/lib/utils";

interface Props {
  hero: React.ReactNode;
  insights?: React.ReactNode;
  insightsTitle?: string;
  actions?: React.ReactNode;
  actionsTitle?: string;
  /** Operational detail (charts, tables, module-specific content). */
  children?: React.ReactNode;
  /** Drawers / portals mounted at the end of the shell. */
  drawer?: React.ReactNode;
  className?: string;
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3 px-1">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function ModuleShell({
  hero,
  insights,
  insightsTitle = "AI-insikter",
  actions,
  actionsTitle = "Nästa åtgärder",
  children,
  drawer,
  className,
}: Props) {
  return (
    <div className={cn("max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-8", className)}>
      <div className="animate-fade-in">{hero}</div>

      {insights && (
        <section className="animate-fade-in" style={{ animationDelay: "60ms" }}>
          <SectionHeader title={insightsTitle} hint="Sorterat efter allvar" />
          {insights}
        </section>
      )}

      {actions && (
        <section className="animate-fade-in" style={{ animationDelay: "120ms" }}>
          <SectionHeader title={actionsTitle} hint="Klicka för att utföra" />
          {actions}
        </section>
      )}

      {children && (
        <section className="animate-fade-in space-y-6" style={{ animationDelay: "180ms" }}>
          {children}
        </section>
      )}

      {drawer}
    </div>
  );
}
