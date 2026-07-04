import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, ChevronRight, ListChecks, BellOff, Sparkles, ArrowRight } from "lucide-react";
import { useClientPriorityEngine, type ClientPriority } from "@/hooks/useClientPriorityEngine";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SNOOZE_KEY = "wl:priority-batch:snoozed-until";

const TIER_DOT: Record<ClientPriority["tier"], string> = {
  critical: "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.18)]",
  warning: "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.18)]",
  stable: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]",
};

const TIER_LABEL: Record<ClientPriority["tier"], string> = {
  critical: "Kritisk",
  warning: "Varning",
  stable: "Stabil",
};

function readSnooze(): number {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(SNOOZE_KEY);
  return v ? Number(v) : 0;
}

/**
 * 🔴 Today's Priorities — the AI batch panel.
 *
 * Groups the most urgent clients into a single actionable batch instead of
 * forcing the user to context-switch one client at a time. Supports:
 *   - Open #1            (jump straight to the highest-priority client + module)
 *   - Open all in seq.   (queues IDs in sessionStorage; consumed by next-pill)
 *   - Snooze for 4h
 */
export const ClientPriorityBatchPanel = () => {
  const navigate = useNavigate();
  const { setActiveClient } = useAdvisorActiveClient();
  const { topBatch, critical, warning, isLoading } = useClientPriorityEngine();
  const [snoozedUntil, setSnoozedUntil] = useState<number>(readSnooze);

  const isSnoozed = snoozedUntil > Date.now();

  const summary = useMemo(() => {
    const c = critical.length;
    const w = warning.length;
    if (c === 0 && w === 0) return "Allt under kontroll — inga kritiska klienter just nu.";
    const parts: string[] = [];
    if (c > 0) parts.push(`${c} kritisk${c === 1 ? "" : "a"}`);
    if (w > 0) parts.push(`${w} att bevaka`);
    return parts.join(" · ");
  }, [critical.length, warning.length]);

  const openClient = (cp: ClientPriority) => {
    setActiveClient({
      id: cp.client.id,
      name: cp.client.name,
      orgNumber: cp.client.org_number,
    });
    navigate(cp.primaryAction?.route ?? "/dashboard");
  };

  const openAllInSequence = () => {
    if (topBatch.length === 0) return;
    if (typeof window !== "undefined") {
      const queue = topBatch.slice(1).map((cp) => ({
        id: cp.client.id,
        name: cp.client.name,
        orgNumber: cp.client.org_number,
        route: cp.primaryAction?.route ?? "/dashboard",
      }));
      window.sessionStorage.setItem("wl:priority-queue", JSON.stringify(queue));
    }
    openClient(topBatch[0]);
  };

  const snooze = () => {
    const until = Date.now() + 4 * 60 * 60_000;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SNOOZE_KEY, String(until));
    }
    setSnoozedUntil(until);
  };

  const unsnooze = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(SNOOZE_KEY);
    setSnoozedUntil(0);
  };

  if (isLoading) return null;

  if (isSnoozed) {
    return (
      <button
        type="button"
        onClick={unsnooze}
        className="w-full rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between text-xs text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <BellOff className="h-3.5 w-3.5" />
          Prioriteringspanel pausad i 4h
        </span>
        <span className="font-semibold text-[hsl(var(--brand-primary))]">Återaktivera</span>
      </button>
    );
  }

  if (topBatch.length === 0) {
    return (
      <div
        className="rounded-3xl p-5 text-white relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(160 60% 22%) 0%, hsl(170 60% 26%) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-emerald-200" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-200/80">
              Dagens prioriteringar
            </p>
            <p className="text-sm font-semibold">Inga kritiska klienter — fokusera på tillväxt.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl p-5 text-white relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(0 60% 18%) 0%, hsl(15 65% 22%) 50%, hsl(243 75% 22%) 100%)",
      }}
    >
      <div
        className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(0 90% 60%) 0%, transparent 70%)" }}
      />
      <div className="relative">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Flame className="h-5 w-5 text-rose-300 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-rose-200/80">
                AI-dirigerad batch
              </p>
              <h3 className="text-base font-bold tracking-tight">Dagens prioriteringar</h3>
              <p className="text-[11px] text-white/60 mt-0.5">{summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={snooze}
              className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              <BellOff className="h-3.5 w-3.5 mr-1.5" />
              Snooza 4h
            </Button>
            <Button
              size="sm"
              onClick={openAllInSequence}
              className="h-8 text-xs bg-white text-slate-900 hover:bg-white/90 font-semibold"
            >
              <ListChecks className="h-3.5 w-3.5 mr-1.5" />
              Öppna alla i ordning
            </Button>
          </div>
        </div>

        {/* Numbered list */}
        <div className="space-y-2">
          {topBatch.map((cp, idx) => (
            <button
              key={cp.client.id}
              type="button"
              onClick={() => openClient(cp)}
              className="w-full text-left rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 p-3 flex items-center gap-3 transition-all group"
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold tabular-nums text-white/40 w-4 text-right">
                  {idx + 1}.
                </span>
                <span className={cn("h-2 w-2 rounded-full", TIER_DOT[cp.tier])} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold truncate">{cp.client.name}</span>
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                      cp.tier === "critical"
                        ? "bg-[#FCE8E8] text-rose-200"
                        : "bg-[#FAEEDA] text-amber-200",
                    )}
                  >
                    {TIER_LABEL[cp.tier]}
                  </span>
                  <span className="text-[10px] text-white/40 tabular-nums">{cp.client.org_number}</span>
                </div>
                <div className="text-[12px] text-white/70 truncate">
                  {cp.topReason?.label ?? "Behöver granskning"}
                  {cp.reasons.length > 1 && (
                    <span className="text-white/40"> · +{cp.reasons.length - 1} till</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {idx === 0 ? (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold bg-white text-slate-900 px-2.5 py-1 rounded-lg group-hover:scale-[1.03] transition-transform">
                    <ArrowRight className="h-3 w-3" />
                    Öppna #1
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-white/60 group-hover:text-white">
                    {cp.primaryAction?.label ?? "Öppna"}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
