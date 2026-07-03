import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ReportShellProps {
  /** Optional page-level filters slot (period chips, date pickers). */
  filters?: ReactNode;
  /** KPI row slot — pass a grid of <ReportKpiCard /> children. */
  kpis?: ReactNode;
  /** Tabs slot — pass <ReportTabs />. */
  tabs?: ReactNode;
  /** Optional side panel (e.g. health drawer). */
  aside?: ReactNode;
  className?: string;
}

/**
 * Layout wrapper for report pages.
 * Provides consistent vertical rhythm (24px) between filters → KPIs → tabs.
 * Page-level <PageHeader /> is rendered upstream by the route.
 */
export const ReportShell = ({
  filters,
  kpis,
  tabs,
  aside,
  className,
}: ReportShellProps) => {
  return (
    <div className={cn("flex", className)}>
      <main className="flex-1 px-8 pb-12 min-w-0 space-y-6">
        {filters && <div>{filters}</div>}
        {kpis && <div>{kpis}</div>}
        {tabs && <div>{tabs}</div>}
      </main>
      {aside}
    </div>
  );
};

/**
 * Convenience grid wrapper for KPI rows.
 * `auto-rows-fr` ensures every card matches the tallest sibling.
 * Defaults to 4-col on lg, 5-col on xl. Pass `cols` to override.
 */
export const KpiRow = ({
  children,
  cols = "lg:grid-cols-4 xl:grid-cols-5",
}: {
  children: ReactNode;
  cols?: string;
}) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols} gap-4 auto-rows-fr`}>
    {children}
  </div>
);
