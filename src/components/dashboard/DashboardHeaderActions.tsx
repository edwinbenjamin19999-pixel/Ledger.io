import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderActionsProps {
  kpiCount: number;
  widgetCount: number;
  onOpenCustomize: () => void;
  aiOptimized?: boolean;
}

export function DashboardHeaderActions({
  kpiCount,
  widgetCount,
  onOpenCustomize,
  aiOptimized,
}: DashboardHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenCustomize}
        className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
        title="Öppna anpassning"
      >
        <span className="font-medium text-foreground">{kpiCount}</span>
        <span>KPI:er</span>
        <span className="text-slate-300">·</span>
        <span className="font-medium text-foreground">{widgetCount}</span>
        <span>widgets</span>
        {aiOptimized && (
          <span className="ml-1 inline-flex items-center rounded-full bg-[hsl(var(--brand-primary)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--brand-primary))]">
            AI
          </span>
        )}
      </button>
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenCustomize}
        className="gap-2"
      >
        <Settings2 className="h-4 w-4" />
        <span className="hidden sm:inline">Anpassa</span>
      </Button>
    </div>
  );
}
