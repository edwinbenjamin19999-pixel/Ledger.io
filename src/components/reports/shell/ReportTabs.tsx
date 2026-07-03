import { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface ReportTabItem {
  value: string;
  label: string;
}

interface ReportTabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  tabs: ReportTabItem[];
  /** Tab panels — pass <TabsContent value="...">…</TabsContent> children. */
  children: ReactNode;
  className?: string;
}

/**
 * Premium pill-style tabs wrapper around shadcn Tabs.
 * Active tab uses brand cyan; idle tabs are muted with hover state.
 */
export const ReportTabs = ({
  value,
  defaultValue,
  onValueChange,
  tabs,
  children,
  className,
}: ReportTabsProps) => {
  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? tabs[0]?.value}
      onValueChange={onValueChange}
      className={cn("space-y-4", className)}
    >
      <div className="flex items-center justify-start">
        <TabsList className="bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 rounded-full h-auto p-1 gap-1 flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                "text-slate-600 dark:text-slate-300",
                "hover:bg-white/60 dark:hover:bg-slate-700/60",
                "data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white",
                "data-[state=active]:shadow-[0_2px_6px_rgba(37,99,235,0.25)]",
                "focus-visible:ring-2 focus-visible:ring-[#3b82f6]/40",
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
};
