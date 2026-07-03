import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { generateCFOInsights, type CFOInsight } from "@/lib/ai-cfo-insights";
import { AICFOInsightCard } from "./AICFOInsightCard";
import { useTenant } from "@/contexts/TenantContext";

interface Props {
  companyId: string;
}

/**
 * AI CFO Insights Panel.
 * Generates real, data-driven insights from journal/invoices/bank/VAT and
 * displays them in priority order (action > insight > info).
 */
export function AICFOInsightsPanel({ companyId }: Props) {
  const [insights, setInsights] = useState<CFOInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenant } = useTenant();
  const aiName = tenant?.ai?.ai_name || "AI CFO";

  useEffect(() => {
    let active = true;
    setLoading(true);
    generateCFOInsights(companyId)
      .then((data) => active && setInsights(data))
      .catch(() => active && setInsights([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="rounded-ds-card border-0.5 border-ds-border bg-ds-surface h-32 animate-pulse" />
        <div className="rounded-ds-card border-0.5 border-ds-border bg-ds-surface h-32 animate-pulse" />
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-ds-card border-0.5 border-ds-border bg-ds-surface p-6 text-center">
        <Brain className="w-8 h-8 text-ds-ai/40 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">Inga aktuella insikter</p>
        <p className="text-xs text-slate-500 mt-1">
          AI analyserar löpande. Insikter visas när data finns att rapportera.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-ds-ai" />
          <h2 className="text-base font-medium text-slate-900">{aiName} — Prioriterade insikter</h2>
        </div>
        <span className="text-[11px] text-slate-500 tabular-nums">{insights.length} aktiva</span>
      </div>
      <div className="space-y-3">
        {insights.map((i) => (
          <AICFOInsightCard key={i.id} insight={i} />
        ))}
      </div>
    </div>
  );
}
