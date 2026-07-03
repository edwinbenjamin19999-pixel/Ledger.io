import { AlertTriangle, Lightbulb, TrendingDown, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaxInsight, InsightActionKind, InsightSeverity } from "@/lib/skatteagent/aiTaxAdvisor";

interface AITaxInsightsProps {
  insights: TaxInsight[];
  onAction: (kind: InsightActionKind, insight: TaxInsight) => void;
}

const SEV_BORDER: Record<InsightSeverity, string> = {
  critical: "border-l-rose-500",
  warning: "border-l-amber-500",
  info: "border-l-indigo-500",
  success: "border-l-emerald-500",
};

const SEV_BG: Record<InsightSeverity, string> = {
  critical: "bg-[#FCE8E8] text-[#7A1A1A]",
  warning: "bg-[#FAEEDA] text-[#7A5417]",
  info: "bg-[#EFF6FF] text-indigo-700",
  success: "bg-[#E1F5EE] text-[#085041]",
};

function iconFor(insight: TaxInsight) {
  if (insight.severity === "success") return CheckCircle2;
  if (insight.type === "overpayment") return TrendingDown;
  if (insight.type === "underpayment" || insight.type === "overdue") return AlertTriangle;
  if (insight.type === "cashflow_risk") return AlertTriangle;
  return Lightbulb;
}

export function AITaxInsights({ insights, onAction }: AITaxInsightsProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#0F1F3D] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Skatteagent — AI-insikter</h2>
        <span className="text-xs text-slate-500">{insights.length} {insights.length === 1 ? "insikt" : "insikter"}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((ins) => {
          const Icon = iconFor(ins);
          return (
            <Card
              key={ins.id}
              className={cn(
                "p-5 border-l-4 hover:-translate-y-0.5 transition-all duration-200",
                SEV_BORDER[ins.severity],
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", SEV_BG[ins.severity])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 truncate">{ins.title}</h3>
                    {ins.impactKr > 0 && (
                      <span className="text-sm font-bold tabular-nums text-slate-900 whitespace-nowrap">
                        {Math.round(ins.impactKr).toLocaleString("sv-SE")} kr
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-3">{ins.message}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-wide text-slate-400">
                      Konfidens {Math.round(ins.confidence * 100)} %
                    </span>
                  </div>
                  {ins.actions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ins.actions.map((a, i) => (
                        <Button
                          key={a.kind + i}
                          size="sm"
                          variant={i === 0 ? "default" : "outline"}
                          onClick={() => onAction(a.kind, ins)}
                        >
                          {a.label}
                          {i === 0 && <ArrowRight className="w-3.5 h-3.5" />}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
