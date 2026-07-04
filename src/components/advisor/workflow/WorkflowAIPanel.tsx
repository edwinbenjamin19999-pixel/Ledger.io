import { Sparkles, AlertOctagon, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowInsight } from "@/hooks/useWorkflowAIInsights";

const SEVERITY: Record<
  WorkflowInsight["severity"],
  { icon: typeof Info; iconCls: string; ring: string }
> = {
  critical: {
    icon: AlertOctagon,
    iconCls: "text-[#7A1A1A] bg-[#FCE8E8]",
    ring: "border-[#F4C8C8]",
  },
  warning: {
    icon: AlertTriangle,
    iconCls: "text-[#7A5417] bg-[#FAEEDA]",
    ring: "border-[#F0DDB7]",
  },
  info: {
    icon: Info,
    iconCls: "text-[#3b82f6] bg-[#EFF6FF]",
    ring: "border-[#C8DDF5]",
  },
};

interface Props {
  insights: WorkflowInsight[];
}

export const WorkflowAIPanel = ({ insights }: Props) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-[#0F1F3D] flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">AI Workflow-analys</h3>
          <p className="text-[11px] text-slate-500">Föreslagna prioriteringar och flaskhalsar</p>
        </div>
      </div>

      <div className="space-y-2">
        {insights.map((ins) => {
          const meta = SEVERITY[ins.severity];
          const Icon = meta.icon;
          return (
            <div
              key={ins.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 bg-slate-50/40",
                meta.ring,
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                  meta.iconCls,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                  {ins.title}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">{ins.detail}</p>
                {ins.suggestedAction && (
                  <button
                    type="button"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#3b82f6] hover:text-[#3b82f6]"
                  >
                    {ins.suggestedAction}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
