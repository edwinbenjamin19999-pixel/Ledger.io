import { useEffect, useState } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { encodeCFOContext } from "@/hooks/useCFOContext";
import { cn } from "@/lib/utils";

interface ProactiveInsight {
  id: string;
  title: string;
  payload: { explanation?: string };
  confidence: number;
}

const DISMISS_KEY = "cfo_proactive_dismissed";

export const ProactiveCFOBanner = ({ companyId }: { companyId: string | null }) => {
  const [insight, setInsight] = useState<ProactiveInsight | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!companyId) return;
    const dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}") as Record<string, number>;
    const now = Date.now();

    const fetchInsight = async () => {
      const { data } = await supabase
        .from("ai_economist_actions")
        .select("id, title, payload, confidence, created_at")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      const fresh = (data || []).find((d: { id: string; created_at: string }) => {
        const dismissedAt = dismissed[d.id];
        if (!dismissedAt) return true;
        return now - dismissedAt > 24 * 60 * 60 * 1000;
      });
      if (fresh) setInsight(fresh as ProactiveInsight);
    };
    fetchInsight();
  }, [companyId]);

  const onDismiss = () => {
    if (!insight) return;
    const dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}") as Record<string, number>;
    dismissed[insight.id] = Date.now();
    localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
    setInsight(null);
  };

  const onDiscuss = () => {
    if (!insight) return;
    const ctx = encodeCFOContext({
      type: "action",
      insight_id: insight.id,
      label: insight.title,
      notes: insight.payload?.explanation,
    });
    navigate(`/cfo/workspace?context=${ctx}`);
    onDismiss();
  };

  if (!insight) return null;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border-2 border-[#C8DDF5] p-4",
      "bg-[#0052FF] text-white shadow-lg shadow-[#0052FF]/20",
      "animate-in slide-in-from-bottom-4 fade-in duration-500",
    )}>
      <button onClick={onDismiss} className="absolute top-2 right-2 text-white/60 hover:text-white">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-[#1E3A5F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-white/80 font-bold">AI CFO upptäckte</div>
          <p className="text-sm font-semibold mt-0.5">{insight.title}</p>
          {insight.payload?.explanation && (
            <p className="text-xs text-white/70 mt-1 line-clamp-2">{insight.payload.explanation}</p>
          )}
          <button
            onClick={onDiscuss}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-white"
          >
            Diskutera med AI CFO <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
