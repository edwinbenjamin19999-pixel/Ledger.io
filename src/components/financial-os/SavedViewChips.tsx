/**
 * SavedViewChips — pinned chip-row of Saved Views for the current route +
 * AI-suggested views (badge ⚡) derived from `view_usage_log` patterns.
 *
 * Click → loadView(payload) into FinancialOSContext + navigate to view route.
 * Includes a "Spara vy" action via <SaveViewPopover>.
 */
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Star, Sparkles, LineChart, Activity, GitBranch, PiggyBank, Wallet, BarChart3,
  Briefcase, Trophy, SearchCode, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedViews, useViewUsageLog } from "@/hooks/useSavedViews";
import { suggestViews, type ViewSuggestion } from "@/lib/financial-os/viewSuggester";
import { useFinancialOS } from "@/contexts/FinancialOSContext";
import { SaveViewPopover } from "./SaveViewPopover";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, typeof Star> = {
  Star, Sparkles, LineChart, Activity, GitBranch, PiggyBank, Wallet, BarChart3,
  Briefcase, Trophy, SearchCode,
};

export function SavedViewChips() {
  const location = useLocation();
  const navigate = useNavigate();
  const fos = useFinancialOS();
  const saved = useSavedViews(location.pathname);
  const usage = useViewUsageLog(30);

  const existingKeys = useMemo(() => {
    const set = new Set<string>();
    (saved.data ?? []).forEach((v) => set.add(`saved:${v.id}`));
    return set;
  }, [saved.data]);

  const suggestions = useMemo<ViewSuggestion[]>(() => {
    const log = (usage.data ?? []).filter((u) => u.route === location.pathname);
    return suggestViews(log, existingKeys).slice(0, 3);
  }, [usage.data, location.pathname, existingKeys]);

  const pinned = (saved.data ?? []).filter((v) => v.pinned !== false).slice(0, 6);

  // Apply default-view on initial mount (once per route load)
  useMemo(() => {
    const def = (saved.data ?? []).find((v) => v.is_default && v.route === location.pathname);
    if (def && fos.activeViewId !== def.id) {
      fos.loadView(def.payload as Record<string, unknown>);
      fos.setActiveViewId(def.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data, location.pathname]);

  const handleLoad = (
    id: string | null,
    route: string,
    payload: Record<string, unknown>,
  ) => {
    fos.loadView(payload);
    fos.setActiveViewId(id);
    if (route !== location.pathname) navigate(route);
  };

  if (saved.isLoading && !saved.data) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pinned.map((v) => {
        const Icon = ICON_MAP[v.icon ?? "Star"] ?? Star;
        const active = fos.activeViewId === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => handleLoad(v.id, v.route, v.payload as Record<string, unknown>)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted",
            )}
            title={v.is_default ? "Standardvy" : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            {v.name}
            {v.is_default && <span className="text-[9px] opacity-70">·STD</span>}
          </button>
        );
      })}

      {suggestions.map((s) => {
        const Icon = ICON_MAP[s.icon] ?? Sparkles;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => handleLoad(null, s.route, s.payload)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            title={s.reason}
          >
            <Icon className="h-3.5 w-3.5" />
            {s.name}
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[9px] font-bold uppercase">⚡</span>
          </button>
        );
      })}

      <SaveViewPopover
        trigger={
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs">
            <Save className="h-3.5 w-3.5" />
            Spara vy
          </Button>
        }
      />
    </div>
  );
}
