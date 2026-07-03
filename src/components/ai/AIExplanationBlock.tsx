import { useState } from "react";
import { ChevronDown, BookOpen, Database, Gauge, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExplanationMode = "simple" | "detailed" | "audit";

export interface AIExplanationBlockProps {
  /** Short headline of what AI did/found */
  title: string;
  /** Three-mode explanation content */
  simple: string;
  detailed: string;
  audit: string;
  /** Data sources */
  sources: string[];
  /** 0-1 confidence */
  confidence: number;
  /** Optional next-step actions */
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
  className?: string;
  defaultMode?: ExplanationMode;
}

/**
 * Pedagogical AI explanation layer.
 * Renders Why / Source / Confidence / Next labels with a 3-mode toggle
 * (Simple / Detailed / Audit). Calm, transparent, never defensive tone.
 */
export function AIExplanationBlock({
  title,
  simple,
  detailed,
  audit,
  sources,
  confidence,
  actions,
  className,
  defaultMode = "simple",
}: AIExplanationBlockProps) {
  const [mode, setMode] = useState<ExplanationMode>(defaultMode);
  const [open, setOpen] = useState(false);

  const confidencePct = Math.round(confidence * 100);
  const confidenceTone =
    confidencePct >= 95
      ? "text-[#085041] bg-[#E1F5EE] border-[#BFE6D6]"
      : confidencePct >= 75
      ? "text-[#7A5417] bg-[#FAEEDA] border-[#F0DDB7]"
      : "text-[#7A1A1A] bg-[#FCE8E8] border-[#F4C8C8]";

  const body = mode === "simple" ? simple : mode === "detailed" ? detailed : audit;

  return (
    <div className={cn("rounded-ds-card border-0.5 border-ds-border bg-ds-surface p-5", className)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-ds-ai uppercase tracking-[0.12em] mb-1">AI-förklaring</p>
          <h4 className="text-sm font-medium text-slate-900">{title}</h4>
        </div>
        <span
          className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-md border-0.5 tabular-nums flex items-center gap-1",
            confidenceTone
          )}
          title="Konfidens — hur säker AI är på sin slutsats"
        >
          <Gauge className="w-3 h-3" />
          {confidencePct}%
        </span>
      </div>

      {/* Mode switcher */}
      <div className="inline-flex rounded-md border-0.5 border-ds-border bg-ds-surface p-0.5 mb-3 text-[11px] font-medium">
        {(["simple", "detailed", "audit"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "px-2.5 py-1 rounded-sm transition-colors",
              mode === m ? "bg-ds-deep text-white" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {m === "simple" ? "Enkel" : m === "detailed" ? "Detaljerad" : "Revisionsläge"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="space-y-2 text-sm text-slate-700">
        <div>
          <div className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide flex items-center gap-1 mb-1">
            <BookOpen className="w-3 h-3" /> Varför
          </div>
          <p className="leading-relaxed">{body}</p>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="text-[11px] font-medium text-ds-ai hover:text-ds-ai/80 flex items-center gap-1 mt-2"
        >
          <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
          {open ? "Dölj källor" : "Visa källor"}
        </button>

        {open && (
          <div className="pt-2">
            <div className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide flex items-center gap-1 mb-1">
              <Database className="w-3 h-3" /> Källor
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <span
                  key={s}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-ds-surface border-0.5 border-ds-border text-slate-700 font-mono"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next steps */}
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t-0.5 border-ds-border">
          <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide">Nästa steg</span>
          <div className="flex items-center gap-2 ml-auto">
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 border-0.5",
                  a.primary
                    ? "bg-ds-deep text-white border-ds-deep hover:bg-ds-deep/90"
                    : "border-ds-border text-slate-700 hover:bg-slate-50"
                )}
              >
                {a.label}
                {a.primary && <ArrowRight className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
