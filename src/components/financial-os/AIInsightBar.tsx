/**
 * AIInsightBar — proactive single-line banner above content grids.
 *
 * Pulls a compact insight scoped to the current route (and current company)
 * via `ai_insights` (graceful fall-back to `ai_economist_insights` /
 * `ai_cashflow_insights`). Dismissals are stored per-user in
 * `view_dismissed_insights` so the same nudge doesn't reappear.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { cn } from "@/lib/utils";

interface Insight {
  key: string;
  title: string;
  summary: string;
  severity: "info" | "warning" | "critical";
  cta?: { label: string; href?: string };
}

export function AIInsightBar() {
  const location = useLocation();
  const companyId = getStoredActiveCompanyId();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  // Load user dismissals once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("view_dismissed_insights")
        .select("insight_key");
      if (cancelled) return;
      setDismissedKeys(new Set((data ?? []).map((r: { insight_key: string }) => r.insight_key)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch a route-scoped insight from the cashflow insights table (best available source)
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("ai_cashflow_insights")
          .select("id, title, summary, severity, insight_type")
          .eq("company_id", companyId)
          .eq("is_dismissed", false)
          .order("created_at", { ascending: false })
          .limit(1);
        if (cancelled) return;
        const row = data?.[0] as
          | { id: string; title: string; summary: string; severity: string; insight_type: string }
          | undefined;
        if (!row) {
          setInsight(null);
          return;
        }
        setInsight({
          key: `cashflow:${row.id}`,
          title: row.title,
          summary: row.summary,
          severity:
            row.severity === "critical"
              ? "critical"
              : row.severity === "warning"
                ? "warning"
                : "info",
          cta: { label: "Öppna Cash Command", href: "/cashflow-forecast" },
        });
      } catch {
        if (!cancelled) setInsight(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, location.pathname]);

  const dismiss = async () => {
    if (!insight) return;
    setDismissedKeys((prev) => new Set([...prev, insight.key]));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("view_dismissed_insights")
        .insert({ user_id: user.id, insight_key: insight.key });
    } catch {
      /* no-op */
    }
  };

  const visible = useMemo(() => {
    if (!insight) return null;
    if (dismissedKeys.has(insight.key)) return null;
    return insight;
  }, [insight, dismissedKeys]);

  if (!visible) return null;

  const tone = visible.severity;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-3 py-2 text-sm",
        tone === "critical"
          ? "border-[#F4C8C8] bg-[#FCE8E8] text-[#7A1A1A]"
          : tone === "warning"
            ? "border-[#F0DDB7] bg-[#FAEEDA] text-[#7A5417]"
            : "border-[#C8DDF5] bg-[#EFF6FF] text-[#3b82f6]",
      )}
    >
      <Sparkles
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "critical"
            ? "text-[#7A1A1A]"
            : tone === "warning"
              ? "text-[#7A5417]"
              : "text-[#3b82f6]",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{visible.title}</div>
        <div className="text-xs opacity-80 line-clamp-2">{visible.summary}</div>
      </div>
      {visible.cta && (
        <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
          <a href={visible.cta.href}>
            {visible.cta.label}
            <ArrowRight className="h-3 w-3" />
          </a>
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={dismiss}
        aria-label="Avfärda"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
