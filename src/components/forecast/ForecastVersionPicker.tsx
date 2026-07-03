/**
 * ForecastVersionPicker — chip row for active version + "Lås nuvarande som …" dialog.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Lock, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ForecastMode } from "./ForecastModeToggle";
import type { ForecastVersion, ForecastVersionKind } from "@/hooks/useForecastVersions";

interface Props {
  mode: ForecastMode;
  versions: ForecastVersion[];
  activeVersionId: string | null; // null = live rolling
  onSelect: (id: string | null) => void;
  onLockCurrent: (label: string, kind: ForecastVersionKind) => Promise<void>;
  isLocking?: boolean;
}

function suggestedLabel(mode: ForecastMode, versions: ForecastVersion[]): { label: string; kind: ForecastVersionKind } {
  if (mode === "monthly") {
    const next = (versions.filter((v) => v.kind === "monthly").length % 12) + 1;
    return { label: `P${next}`, kind: "monthly" };
  }
  if (mode === "quarterly") {
    const next = (versions.filter((v) => v.kind === "quarterly").length % 4) + 1;
    return { label: `Q${next}`, kind: "quarterly" };
  }
  return { label: `Snapshot ${new Date().toLocaleDateString("sv-SE")}`, kind: "custom" };
}

export function ForecastVersionPicker({
  mode,
  versions,
  activeVersionId,
  onSelect,
  onLockCurrent,
  isLocking,
}: Props) {
  const [open, setOpen] = useState(false);
  const suggestion = suggestedLabel(mode, versions);
  const [label, setLabel] = useState(suggestion.label);

  const filtered = mode === "rolling" ? versions : versions.filter((v) => v.kind === mode || v.kind === "custom");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
          activeVersionId === null
            ? "border-[#3b82f6] bg-[#EFF6FF] text-[#3b82f6]"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
        Rolling (live)
      </button>

      {filtered.map((v) => {
        const active = activeVersionId === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
              active
                ? "border-[#3b82f6] bg-[#EFF6FF] text-[#3b82f6]"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            title={`Låst ${new Date(v.locked_at).toLocaleDateString("sv-SE")}`}
          >
            <Lock className="h-3 w-3" />
            {v.label}
          </button>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            onClick={() => setLabel(suggestedLabel(mode, versions).label)}
          >
            <Plus className="h-3 w-3" />
            Lås nuvarande
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lås nuvarande prognos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="ver-label">Etikett</Label>
              <Input
                id="ver-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={suggestion.label}
              />
              <p className="mt-1 text-xs text-slate-500">
                Snapshotet fryses och kan jämföras eller återställas senare.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button
              disabled={!label.trim() || isLocking}
              onClick={async () => {
                await onLockCurrent(label.trim() || suggestion.label, suggestion.kind);
                setOpen(false);
              }}
            >
              {isLocking ? "Låser…" : "Lås version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
