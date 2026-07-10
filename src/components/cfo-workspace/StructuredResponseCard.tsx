import { AlertTriangle, Lightbulb, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useExecuteCFOAction } from "@/hooks/useExecuteCFOAction";
import { useCFOPreferences } from "@/hooks/useCFOPreferences";
import { useAuth } from "@/hooks/useAuth";
import type { CFOStructured } from "@/hooks/useCFOChat";
import { cn } from "@/lib/utils";

interface Props {
  structured: CFOStructured;
  companyId: string;
  insightId?: string;
}

export const StructuredResponseCard = ({ structured, companyId }: Props) => {
  const navigate = useNavigate();
  const { execute, pendingId } = useExecuteCFOAction();
  const { user } = useAuth();
  const { signal } = useCFOPreferences(companyId, user?.id);

  const ro = structured.risk_or_opportunity;
  const isRisk = ro.kind === "risk";
  const isOpportunity = ro.kind === "opportunity";
  const roColor = isRisk
    ? "border-[#F4C8C8] bg-[#FCE8E8] text-[#7A1A1A] dark:text-red-300"
    : isOpportunity
      ? "border-[#BFE6D6] bg-[#E1F5EE] text-[#085041] dark:text-emerald-300"
      : "border-slate-500/30 bg-slate-500/5 text-slate-700 dark:text-slate-300";
  const RoIcon = isRisk ? AlertTriangle : isOpportunity ? Sparkles : Lightbulb;

  const onAction = async (action: CFOStructured["suggested_actions"][number]) => {
    if (action.action_type === "navigate_to" && action.payload?.path) {
      signal("growth_bias", 0.05);
      navigate(action.payload.path as string);
      return;
    }
    if (action.action_type === "simulate_scenario") {
      signal("growth_bias", 0.1);
      navigate("/budget?tab=scenarios");
      return;
    }
    if (action.action_type === "open_account_analysis") {
      navigate("/account-analysis");
      return;
    }
    // fallthrough → execute action via existing engine
    try {
      await execute(
        {
          id: crypto.randomUUID(),
          tier: "medium",
          title: action.label,
          explanation: structured.recommendation,
          impact_sek: 0,
          confidence: structured.confidence,
          action_type: "none",
          source: "cfo-chat",
          cta_label: action.label,
          priority_score: 0,
        },
        companyId,
        "assisted",
        action.payload,
      );
      signal("growth_bias", 0.1);
    } catch { /* toast already shown */ }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-6 shadow-sm">
      {/* Summary */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-[#0052FF] dark:text-[#1E3A5F] mb-2">Sammanfattning</div>
        <p className="text-lg font-medium text-slate-900 dark:text-white leading-relaxed">{structured.summary}</p>
      </div>

      {/* Interpretation */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tolkning</div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{structured.interpretation}</p>
      </div>

      {/* Risk/Opportunity */}
      <div className={cn("rounded-xl border-2 p-4 flex gap-3", roColor)}>
        <RoIcon className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1">
            {isRisk ? "Risk" : isOpportunity ? "Möjlighet" : "Observation"}
            {ro.severity && ` · ${ro.severity}`}
          </div>
          <p className="text-sm leading-relaxed">{ro.text}</p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl bg-[#EFF6FF] border border-[#C8DDF5] p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#0052FF] dark:text-[#1E3A5F] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0052FF] dark:text-[#0052FF] mb-1">Rekommendation</div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{structured.recommendation}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {structured.suggested_actions?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {structured.suggested_actions.map((a, i) => (
            <Button
              key={i}
              size="sm"
              onClick={() => onAction(a)}
              disabled={!!pendingId}
              className="gap-1.5 bg-[#0052FF] hover:bg-[#0052FF] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {a.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      )}

      {/* Confidence */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs text-slate-500">Konfidens: {Math.round((structured.confidence || 0) * 100)}%</span>
        <span className="text-xs text-[#0052FF] dark:text-[#1E3A5F] font-medium">AI CFO</span>
      </div>
    </div>
  );
};
