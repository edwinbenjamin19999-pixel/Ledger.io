/**
 * FinOS — Generalized 5-level drilldown drawer.
 * Hierarchy: KPI → Category → Account → Transaction → Source document.
 *
 * Modules pass a FinOSDrilldownRef and the drawer renders breadcrumbs +
 * level-appropriate panels. Each level falls back to a friendly placeholder
 * so this works as a shared host even before all data sources are wired in.
 */
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinOSDrilldownRef } from "@/lib/finos/insights";

type Level = 1 | 2 | 3 | 4 | 5;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Module label shown at the top of the breadcrumb (e.g. "VAT", "Cash"). */
  moduleLabel: string;
  /** What is being drilled into (e.g. "EBITDA", "Box 05", "Runway"). */
  rootLabel: string;
  ref_: FinOSDrilldownRef | null;
  /** Optional renderer overrides — modules can plug in their own panels. */
  renderLevel?: (level: Level, ctx: { ref: FinOSDrilldownRef }) => React.ReactNode;
}

function defaultPanel(level: Level, ref: FinOSDrilldownRef) {
  const labels = {
    1: "KPI-sammanfattning",
    2: "Kategoriuppdelning",
    3: "Konton",
    4: "Verifikationer",
    5: "Underlag",
  } as const;
  return (
    <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground mb-2">{labels[level]}</p>
      <p>Underlag laddas baserat på vald nivå. Modulen kan koppla in egen renderer via <code>renderLevel</code>.</p>
      <pre className="mt-3 text-[11px] bg-slate-50 dark:bg-black/30 rounded p-2 overflow-x-auto">
        {JSON.stringify(ref, null, 2)}
      </pre>
    </div>
  );
}

export function FinOSDrilldownDrawer({
  open,
  onClose,
  moduleLabel,
  rootLabel,
  ref_,
  renderLevel,
}: Props) {
  const [level, setLevel] = useState<Level>(1);

  const steps = useMemo(() => {
    const base = [
      { label: `${moduleLabel} · ${rootLabel}`, level: 1 as Level },
      ref_?.categoryId ? { label: ref_.categoryId, level: 2 as Level } : null,
      ref_?.accountNumber ? { label: `Konto ${ref_.accountNumber}`, level: 3 as Level } : null,
      ref_?.journalEntryId ? { label: `Ver. ${ref_.journalEntryId.slice(0, 8)}`, level: 4 as Level } : null,
      ref_?.documentId ? { label: "Underlag", level: 5 as Level } : null,
    ];
    return base.filter(Boolean) as { label: string; level: Level }[];
  }, [moduleLabel, rootLabel, ref_]);

  if (!ref_) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setLevel(1); onClose(); } }}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto p-6 sm:max-w-2xl">
        <SheetTitle className="sr-only">Drilldown – {rootLabel}</SheetTitle>

        <nav className="flex items-center gap-1 text-xs flex-wrap mb-4">
          {steps.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLevel(s.level)}
                className={cn(
                  "px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors",
                  s.level === level ? "text-foreground font-semibold" : "text-muted-foreground",
                )}
              >
                {s.label}
              </button>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </span>
          ))}
        </nav>

        <div className="flex-1">
          {renderLevel ? renderLevel(level, { ref: ref_ }) : defaultPanel(level, ref_)}
        </div>
      </SheetContent>
    </Sheet>
  );
}
