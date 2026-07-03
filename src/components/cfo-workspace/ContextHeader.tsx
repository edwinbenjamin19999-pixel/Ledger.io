import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CFOContextPayload } from "@/hooks/useCFOContext";

interface Props {
  context: CFOContextPayload;
  onNewConversation: () => void;
}

export const ContextHeader = ({ context, onNewConversation }: Props) => {
  const label = context.label || (context.type === "kpi" && context.kpi
    ? `${context.kpi.toUpperCase()}-analys`
    : context.scenario_name
      ? `Scenario: ${context.scenario_name}`
      : context.type === "benchmark"
        ? "Branschanalys"
        : context.type === "action"
          ? "Åtgärd"
          : "Strategisk dialog");

  return (
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#0F1F3D] flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">{label}</h2>
          <p className="text-xs text-slate-500">AI CFO Workspace</p>
        </div>
        {context.percentile != null && (
          <Badge variant="outline" className="ml-2 border-[#C8DDF5] text-[#3b82f6] dark:text-[#3b82f6]">P{context.percentile}</Badge>
        )}
      </div>
      <Button onClick={onNewConversation} variant="outline" size="sm" className="gap-1.5">
        <Plus className="h-4 w-4" />
        Ny dialog
      </Button>
    </div>
  );
};
