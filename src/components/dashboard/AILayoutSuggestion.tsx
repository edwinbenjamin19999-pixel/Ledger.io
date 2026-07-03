import { useEffect, useMemo, useState } from "react";
import { Sparkles, X, ArrowUp, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsMap } from "@/hooks/useDashboardAnalytics";
import { DashboardWidgetState, DashboardWidgetId, DASHBOARD_WIDGET_REGISTRY } from "@/hooks/useDashboardLayout";

interface AILayoutSuggestionProps {
  analytics: AnalyticsMap;
  widgets: DashboardWidgetState[];
  onHide: (id: DashboardWidgetId) => void;
  onMoveUp: (id: DashboardWidgetId) => void;
}

interface Suggestion {
  type: "hide" | "promote";
  widgetId: DashboardWidgetId;
  label: string;
}

const DISMISS_KEY = "dashboard:ai-suggestions:dismissed";

function loadDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(DISMISS_KEY) || "{}"); }
  catch { return {}; }
}

function saveDismissed(data: Record<string, number>) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(DISMISS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function AILayoutSuggestion({ analytics, widgets, onHide, onMoveUp }: AILayoutSuggestionProps) {
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => loadDismissed());

  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);

  const suggestion = useMemo<Suggestion | null>(() => {
    const visible = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);
    const labelOf = (id: string) =>
      DASHBOARD_WIDGET_REGISTRY.find(r => r.id === id)?.label || id;

    // Hide suggestion: visible but very low usage
    for (const w of visible) {
      if (w.id === "dashboard_cockpit" || w.id === "daily_briefing") continue; // never suggest hiding core
      const a = analytics[w.id];
      const totalActivity = (a?.views || 0) + (a?.clicks || 0) * 3;
      if (totalActivity < 2 && (a?.lastViewed || 0) > 0) {
        const key = `hide:${w.id}`;
        if (!dismissed[key] || Date.now() - dismissed[key] > 1000 * 60 * 60 * 24 * 14) {
          return { type: "hide", widgetId: w.id as DashboardWidgetId, label: labelOf(w.id) };
        }
      }
    }

    // Promote suggestion: high-click widget low in list
    let bestId: string | null = null;
    let bestScore = 0;
    for (const w of visible) {
      const a = analytics[w.id];
      const score = (a?.clicks || 0) * 5 + (a?.views || 0);
      if (score > bestScore) { bestScore = score; bestId = w.id; }
    }
    if (bestId && bestScore >= 5) {
      const idx = visible.findIndex(v => v.id === bestId);
      if (idx > 2) {
        const key = `promote:${bestId}`;
        if (!dismissed[key] || Date.now() - dismissed[key] > 1000 * 60 * 60 * 24 * 7) {
          return { type: "promote", widgetId: bestId as DashboardWidgetId, label: labelOf(bestId) };
        }
      }
    }
    return null;
  }, [analytics, widgets, dismissed]);

  if (!suggestion) return null;

  const dismissKey = `${suggestion.type}:${suggestion.widgetId}`;
  const dismiss = () => setDismissed(d => ({ ...d, [dismissKey]: Date.now() }));

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--brand-primary)/0.25)] bg-[hsl(var(--brand-primary)/0.04)] px-4 py-2.5">
      <Sparkles className="h-4 w-4 flex-shrink-0 text-[hsl(var(--brand-primary))]" />
      <p className="text-sm text-foreground flex-1 min-w-0 truncate">
        {suggestion.type === "hide"
          ? <>Du använder sällan <strong>{suggestion.label}</strong> — vill du dölja den?</>
          : <><strong>{suggestion.label}</strong> öppnas oftast — flytta högre upp?</>}
      </p>
      {suggestion.type === "hide" ? (
        <Button size="sm" variant="outline" className="h-8 gap-1.5"
          onClick={() => { onHide(suggestion.widgetId); dismiss(); }}>
          <EyeOff className="h-3.5 w-3.5" /> Dölj
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="h-8 gap-1.5"
          onClick={() => { onMoveUp(suggestion.widgetId); dismiss(); }}>
          <ArrowUp className="h-3.5 w-3.5" /> Flytta upp
        </Button>
      )}
      <button
        type="button"
        aria-label="Avfärda förslag"
        onClick={dismiss}
        className="text-slate-400 hover:text-slate-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
