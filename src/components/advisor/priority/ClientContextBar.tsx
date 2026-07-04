import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  Send,
  ListPlus,
  FileQuestion,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useClientPriorityEngine } from "@/hooks/useClientPriorityEngine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUEUE_KEY = "wl:priority-queue";

interface QueueItem {
  id: string;
  name: string;
  orgNumber?: string;
  route: string;
}

/**
 * Premium Client Mode top bar.
 *
 * Replaces the old gradient ActiveClientBanner with a tinted, status-rich
 * context bar shown only when an advisor is operating inside a client.
 * Includes:
 *   - Back to firm
 *   - Client name + org.nr + assigned consultant
 *   - 3 status chips: Bokföring · Moms · Årsredovisning
 *   - Quick actions: Request docs · Send for approval · Create task
 *   - "Next priority client" pill (consumes the priority queue from the batch panel)
 */
export const ClientContextBar = () => {
  const navigate = useNavigate();
  const { activeClient, setActiveClient, clearActiveClient } = useAdvisorActiveClient();
  const { byId } = useClientPriorityEngine();
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // Load priority queue on mount and whenever the active client changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(QUEUE_KEY);
    if (!raw) {
      setQueue([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as QueueItem[];
      // Drop the currently-active client from the queue
      const remaining = parsed.filter((q) => q.id !== activeClient?.id);
      setQueue(remaining);
      window.sessionStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch {
      setQueue([]);
    }
  }, [activeClient?.id]);

  const priority = activeClient ? byId.get(activeClient.id) : null;

  const consultantName = priority?.client.assignedName ?? "—";

  const statusChips = useMemo(() => {
    if (!priority) {
      return [
        { label: "Bokföring", state: "neutral" as const },
        { label: "Moms", state: "neutral" as const },
        { label: "Årsred.", state: "neutral" as const },
      ];
    }
    const c = priority.client;
    const bk =
      c.bookkeepingStatus === "ok"
        ? ("ok" as const)
        : c.bookkeepingStatus === "missing"
        ? ("warn" as const)
        : ("alert" as const);
    const vat =
      c.vatStatus === "ready"
        ? ("ok" as const)
        : c.vatStatus === "late"
        ? ("alert" as const)
        : c.vatStatus === "pending"
        ? ("warn" as const)
        : ("neutral" as const);
    const ar =
      c.annualStatus === "filed"
        ? ("ok" as const)
        : c.annualStatus === "ready"
        ? ("warn" as const)
        : c.annualStatus === "draft"
        ? ("warn" as const)
        : ("neutral" as const);
    return [
      { label: "Bokföring", state: bk },
      { label: "Moms", state: vat },
      { label: "Årsred.", state: ar },
    ];
  }, [priority]);

  if (!activeClient) return null;

  const handleBack = () => {
    clearActiveClient();
    if (typeof window !== "undefined") window.sessionStorage.removeItem(QUEUE_KEY);
    navigate("/wl/app/dashboard");
  };

  const openNextInQueue = () => {
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
    }
    setQueue(rest);
    setActiveClient({ id: next.id, name: next.name, orgNumber: next.orgNumber });
    navigate(next.route);
  };

  return (
    <div
      className="w-full px-5 py-2.5 flex items-center gap-4 text-white border-b border-white/5"
      style={{
        background:
          "linear-gradient(90deg, hsl(220 47% 11%) 0%, hsl(222 47% 14%) 60%, hsl(243 70% 18%) 100%)",
      }}
      role="region"
      aria-label="Klientläge"
    >
      {/* Back to firm */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold transition-all active:scale-95 shrink-0"
      >
        <ArrowLeft className="h-3 w-3" />
        Byrå
      </button>

      {/* Client identity */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/50">
              Klientläge
            </span>
            {priority && (
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                  priority.tier === "critical"
                    ? "bg-[#FCE8E8] text-rose-700"
                    : priority.tier === "warning"
                    ? "bg-[#FAEEDA] text-amber-800"
                    : "bg-[#E1F5EE] text-emerald-800",
                )}
              >
                {priority.tier === "critical"
                  ? "Kritisk"
                  : priority.tier === "warning"
                  ? "Varning"
                  : "Stabil"}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-bold truncate">{activeClient.name}</span>
            {activeClient.orgNumber && (
              <span className="text-[11px] text-white/50 tabular-nums hidden sm:inline">
                {activeClient.orgNumber}
              </span>
            )}
            <span className="text-[11px] text-white/40 hidden md:inline">· {consultantName}</span>
          </div>
        </div>
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-1.5 ml-2">
        {statusChips.map((s) => (
          <StatusChip key={s.label} label={s.label} state={s.state} />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Top reason banner (compact) */}
      {priority?.topReason && (
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 max-w-[300px] truncate">
          <Sparkles className="h-3 w-3 text-[#3b82f6] shrink-0" />
          <span className="truncate">{priority.topReason.label}</span>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <QuickAction
          icon={FileQuestion}
          label="Begär underlag"
          onClick={() => navigate("/wl/app/requests")}
        />
        <QuickAction icon={Send} label="Skicka för godkänn." onClick={() => navigate("/approvals")} />
        <QuickAction icon={ListPlus} label="Skapa uppgift" onClick={() => navigate("/tasks")} />

        {queue.length > 0 && (
          <Button
            size="sm"
            onClick={openNextInQueue}
            className="h-8 text-xs bg-white text-slate-900 hover:bg-white/90 font-semibold ml-1"
          >
            Nästa ({queue.length})
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

interface ChipProps {
  label: string;
  state: "ok" | "warn" | "alert" | "neutral";
}

function StatusChip({ label, state }: ChipProps) {
  const meta = {
    ok: { icon: CheckCircle2, cls: "bg-[#E1F5EE] text-emerald-800 border-[#BFE6D6]" },
    warn: { icon: AlertTriangle, cls: "bg-[#FAEEDA] text-amber-800 border-[#F0DDB7]" },
    alert: { icon: AlertTriangle, cls: "bg-[#FCE8E8] text-rose-700 border-[#F4C8C8]" },
    neutral: { icon: CircleDashed, cls: "bg-white/10 text-white/70 border-white/15" },
  }[state];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border",
        meta.cls,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

interface QAProps {
  icon: typeof Send;
  label: string;
  onClick: () => void;
}

function QuickAction({ icon: Icon, label, onClick }: QAProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-[11px] font-medium text-white/80 hover:text-white transition-all border border-white/5 hover:border-white/15"
    >
      <Icon className="h-3 w-3" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}
