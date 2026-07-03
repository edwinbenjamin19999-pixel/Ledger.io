/**
 * VAT Confidence Panel — sticky right-side intelligence summary.
 * Shows score, breakdown, status verdict, mini timeline.
 */
import { ShieldCheck, ShieldAlert, ShieldX, Sparkles, FileCheck2, Send, Wallet, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfidenceBreakdown } from "./ConfidenceBreakdown";
import type { ConfidenceBreakdown as CB } from "@/lib/vat/vatReviewEngine";

type Status =
  | "draft" | "ai_reviewed" | "review_required" | "ready"
  | "filed" | "settled" | "paid" | "refunded" | "closed";

interface VATConfidencePanelProps {
  confidence: number | null;
  breakdown: CB | null;
  hasHistory: boolean;
  warningsCount: number;
  blockersCount: number;
  overridesCount: number;
  status: Status;
}

function verdict(confidence: number | null, blockers: number) {
  if (blockers > 0) return { label: "Inlämning blockerad", tone: "bg-[#C73838]", text: "text-white", icon: ShieldX };
  if (confidence === null) return { label: "Beräknar…", tone: "bg-slate-300", text: "text-slate-700", icon: ShieldCheck };
  if (confidence >= 85) return { label: "Klar att lämna in", tone: "bg-[#1D9E75]", text: "text-white", icon: ShieldCheck };
  if (confidence >= 60) return { label: "Granskning rekommenderas", tone: "bg-[#C28A2B]", text: "text-white", icon: ShieldAlert };
  return { label: "Inlämning blockerad", tone: "bg-[#C73838]", text: "text-white", icon: ShieldX };
}

const TIMELINE: { key: Status; label: string; icon: typeof Sparkles }[] = [
  { key: "draft",       label: "Utkast",       icon: FileCheck2 },
  { key: "ai_reviewed", label: "AI-granskad",  icon: Sparkles },
  { key: "ready",       label: "Godkänd",      icon: ShieldCheck },
  { key: "filed",       label: "Inskickad",    icon: Send },
  { key: "settled",     label: "Bokförd",      icon: Wallet },
  { key: "paid",        label: "Betald",       icon: CheckCircle2 },
];

const STATUS_INDEX: Record<Status, number> = {
  draft: 0, ai_reviewed: 1, review_required: 1, ready: 2, filed: 3, settled: 4, paid: 5, refunded: 5, closed: 5,
};

export function VATConfidencePanel({
  confidence, breakdown, hasHistory, warningsCount, blockersCount, overridesCount, status,
}: VATConfidencePanelProps) {
  const v = verdict(confidence, blockersCount);
  const VIcon = v.icon;
  const currentIdx = STATUS_INDEX[status] ?? 0;

  const scoreColor =
    confidence === null ? "text-slate-400"
    : confidence >= 85 ? "text-[#1D9E75] dark:text-[#1D9E75]"
    : confidence >= 60 ? "text-[#7A5417] dark:text-[#C28A2B]"
    : "text-[#C73838] dark:text-[#C73838]";

  const ringColor =
    confidence === null ? "stroke-slate-300"
    : confidence >= 85 ? "stroke-emerald-500"
    : confidence >= 60 ? "stroke-amber-500"
    : "stroke-rose-500";

  const pct = confidence ?? 0;
  const C = 2 * Math.PI * 38;

  return (
    <aside className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-[#C28A2B]" /> Konfidens & Granskning
        </div>
      </div>

      {/* Score ring */}
      <div className="p-5 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 90 90" className="w-full h-full -rotate-90">
            <circle cx="45" cy="45" r="38" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="none" />
            <circle
              cx="45" cy="45" r="38"
              className={cn("transition-all duration-700", ringColor)}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * pct) / 100}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-black font-mono tabular-nums leading-none", scoreColor)}>
              {confidence ?? "—"}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">av 100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", v.tone, v.text)}>
            <VIcon className="w-3 h-3" />
            {v.label}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className={cn("text-base font-bold font-mono", blockersCount > 0 ? "text-[#C73838]" : "text-slate-700 dark:text-slate-300")}>{blockersCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Blockerare</div>
            </div>
            <div>
              <div className={cn("text-base font-bold font-mono", warningsCount > 0 ? "text-[#7A5417]" : "text-slate-700 dark:text-slate-300")}>{warningsCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Varningar</div>
            </div>
            <div>
              <div className={cn("text-base font-bold font-mono", overridesCount > 0 ? "text-blue-600" : "text-slate-700 dark:text-slate-300")}>{overridesCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Justerade</div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Dimensioner</div>
          <ConfidenceBreakdown breakdown={breakdown} hasHistory={hasHistory} />
        </div>
      )}

      {/* Timeline */}
      <div className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Flöde</div>
        <ol className="space-y-2">
          {TIMELINE.map((t, i) => {
            const Icon = t.icon;
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <li key={t.key} className="flex items-center gap-2.5">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors",
                  isDone ? "bg-[#1D9E75] border-emerald-500 text-white"
                    : isCurrent ? "bg-[#C28A2B] border-amber-500 text-white animate-pulse"
                    : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                )}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className={cn(
                  "text-xs",
                  isDone ? "text-[#085041] dark:text-[#1D9E75] font-medium"
                    : isCurrent ? "text-[#7A5417] dark:text-[#C28A2B] font-bold"
                    : "text-muted-foreground"
                )}>
                  {t.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
