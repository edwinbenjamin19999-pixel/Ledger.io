import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Loader2, X, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInsightItems } from "@/hooks/useInsightItems";
import { executionLevel, LEVEL_META } from "@/lib/ai-ekonom/executionLevel";
import { routeFor } from "@/lib/ai-ekonom/routeFor";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import type { CFOPriority } from "@/hooks/useCFOPriorities";

type SeverityKey = "KRITISK" | "VARNING" | "LÅG";

const tierStyles: Record<CFOPriority["tier"], {
  label: SeverityKey;
  borderColor: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
}> = {
  critical: { label: "KRITISK", borderColor: "#EF4444", badgeBg: "#FEF2F2", badgeColor: "#DC2626", badgeBorder: "#FECACA" },
  high:     { label: "VARNING", borderColor: "#F59E0B", badgeBg: "#FFFBEB", badgeColor: "#D97706", badgeBorder: "#FDE68A" },
  medium:   { label: "VARNING", borderColor: "#F59E0B", badgeBg: "#FFFBEB", badgeColor: "#D97706", badgeBorder: "#FDE68A" },
  low:      { label: "LÅG",     borderColor: "#6B7280", badgeBg: "#F9FAFB", badgeColor: "#6B7280", badgeBorder: "#E5E7EB" },
};

interface Props {
  insight: CFOPriority;
  companyId: string | null;
  onPrimary: (insight: CFOPriority, selectedItems: string[]) => void;
  onIgnore: (insight: CFOPriority) => void;
  pending: boolean;
  factors?: string[];
}

function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n))) + " kr";
}

function primaryVerb(action_type: CFOPriority["action_type"]): string {
  switch (action_type) {
    case "send_reminder": return "Skicka påminnelser";
    case "create_accrual": return "Skapa periodisering";
    case "apply_deferral": return "Tillämpa förskott";
    case "reclassify": return "Omklassificera";
    case "generate_report": return "Generera rapport";
    default: return "Granska";
  }
}

export function PriorityWorkflowCard({ insight, companyId, onPrimary, onIgnore, pending, factors }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const t = tierStyles[insight.tier];
  const isNeg = insight.impact_sek < 0;
  const canFix = insight.action_type !== "none";
  const level = executionLevel(insight.action_type, insight.confidence, insight.impact_sek);
  const levelMeta = LEVEL_META[level];
  const route = routeFor(insight);

  const { items, loading } = useInsightItems(insight, companyId, expanded);
  const allSelected = items.length > 0 && selected.size === items.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.reference || i.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="relative overflow-hidden bg-white"
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderLeft: `4px solid ${t.borderColor}`,
        borderRadius: 16,
        padding: 24,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="inline-flex items-center"
              style={{
                background: t.badgeBg,
                color: t.badgeColor,
                border: `1px solid ${t.badgeBorder}`,
                borderRadius: 100,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              {t.label}
            </span>
            <span
              className="inline-flex items-center"
              style={{
                background: "rgba(37,99,235,0.08)",
                color: "#0D7A8A",
                borderRadius: 100,
                padding: "2px 10px",
                fontSize: 12,
              }}
              title={`${levelMeta.label} · ${levelMeta.desc}`}
            >
              {Math.round(insight.confidence * 100)}% konfidens
            </span>
            <span className="text-[10px] text-muted-foreground">· {insight.source}</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 leading-tight">{insight.title}</h3>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{insight.explanation}</p>

          {insight.impact_sek !== 0 && (
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className="inline-flex items-baseline gap-1 tabular-nums tracking-tight"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: isNeg ? "#EF4444" : "#10B981",
                }}
              >
                {isNeg
                  ? <ArrowDown className="h-5 w-5 self-center" strokeWidth={2.5} />
                  : <ArrowUp className="h-5 w-5 self-center" strokeWidth={2.5} />}
                {fmtSEK(insight.impact_sek)}
              </span>
              <span className="text-xs text-muted-foreground">finansiell påverkan</span>
            </div>
          )}
        </div>
        <button
          onClick={() => onIgnore(insight)}
          className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
          title="Ignorera"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Items workflow */}
      <div className="mt-4 border-t border-slate-100 dark:border-white/5 pt-3">
        <button
          onClick={() => setExpanded(s => !s)}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-700 dark:text-white/80 hover:text-[#3b82f6] dark:hover:text-[#3b82f6] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Visa underliggande poster
          </span>
          {expanded && items.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{selected.size}/{items.length} valda</span>
          )}
        </button>

        {expanded && (
          <div className="mt-2 space-y-1">
            {loading && (
              <div className="text-xs text-muted-foreground py-3 text-center flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Hämtar poster…
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="text-xs text-muted-foreground py-3 text-center">Inga konkreta poster kopplade — kör generell åtgärd</p>
            )}
            {!loading && items.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-slate-100 dark:border-white/5">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="h-3.5 w-3.5" />
                  <span className="flex-1">Post</span>
                  <span>Belopp</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {items.map((it) => {
                    const ref = it.reference || it.id;
                    const isSel = selected.has(ref);
                    return (
                      <label
                        key={it.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                          isSel ? "bg-[#EFF6FF] dark:bg-[#EFF6FF]" : "hover:bg-slate-50 dark:hover:bg-white/5"
                        )}
                      >
                        <Checkbox checked={isSel} onCheckedChange={() => toggleOne(ref)} className="h-3.5 w-3.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white/90 truncate">{it.primary}</div>
                          {it.secondary && <div className="text-[10px] text-muted-foreground truncate">{it.secondary}</div>}
                        </div>
                        {it.amount != null && (
                          <span className="tabular-nums text-slate-700 dark:text-white/80">{fmtSEK(it.amount)}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {canFix && (
          <button
            disabled={pending}
            onClick={() => onPrimary(insight, Array.from(selected))}
            className="inline-flex items-center gap-1.5 transition-colors hover:bg-[#1a3550] disabled:opacity-60"
            style={{
              background: "#0F1B2D",
              color: "white",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {primaryVerb(insight.action_type)}
            {selected.size > 0 && ` (${selected.size})`}
          </button>
        )}
        <Link
          to={route.href}
          className="inline-flex items-center gap-1.5 transition-colors hover:bg-black/[0.03]"
          style={{
            background: "transparent",
            border: "1px solid rgba(0,0,0,0.15)",
            color: "#374151",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {route.label}
        </Link>
      </div>
    </div>
  );
}
