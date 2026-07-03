/**
 * ForecastVersionCompare — drawer that compares two locked versions.
 * Renders a small KPI diff + an EBIT line overlay.
 */
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GRID_PROPS, AXIS_TICK } from "@/components/charts/ChartGradients";
import { diffSnapshots } from "@/lib/forecast/versionEngine";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import type { ForecastVersion } from "@/hooks/useForecastVersions";

interface Props {
  open: boolean;
  onClose: () => void;
  versions: ForecastVersion[];
}

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function ForecastVersionCompare({ open, onClose, versions }: Props) {
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  const a = versions.find((v) => v.id === aId);
  const b = versions.find((v) => v.id === bId);

  const data = useMemo(() => {
    return MONTHS.map((m, i) => ({
      month: m,
      A: a?.snapshot?.ebit?.[i] ?? null,
      B: b?.snapshot?.ebit?.[i] ?? null,
    }));
  }, [a, b]);

  const diff = useMemo(() => {
    if (!a || !b) return null;
    return diffSnapshots(a.snapshot, b.snapshot);
  }, [a, b]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Jämför prognosversioner</SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Version A</div>
            <Select value={aId} onValueChange={setAId}>
              <SelectTrigger><SelectValue placeholder="Välj version" /></SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.label} · {new Date(v.locked_at).toLocaleDateString("sv-SE")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Version B</div>
            <Select value={bId} onValueChange={setBId}>
              <SelectTrigger><SelectValue placeholder="Välj version" /></SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.label} · {new Date(v.locked_at).toLocaleDateString("sv-SE")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">EBIT-överlägg</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} tickFormatter={(v) => formatSEK(Number(v))} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => formatSEK(typeof v === "number" ? v : 0)} />
                <Line type="monotone" dataKey="A" stroke="#3b82f6" strokeWidth={2} dot={false} name={a?.label ?? "A"} />
                <Line type="monotone" dataKey="B" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={false} name={b?.label ?? "B"} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {diff && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Δ Årlig EBIT</div>
              <div className={cn("mt-1 text-lg font-semibold tabular-nums", diff.annualEbitDelta >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                {diff.annualEbitDelta >= 0 ? "+" : ""}{formatSEK(diff.annualEbitDelta)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Δ Kassa (dec)</div>
              <div className={cn("mt-1 text-lg font-semibold tabular-nums", diff.endingCashDelta >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                {diff.endingCashDelta >= 0 ? "+" : ""}{formatSEK(diff.endingCashDelta)}
              </div>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Konton som ändrats</div>
              <div className="mt-1 text-sm text-slate-700">{diff.changedAccounts.length} konton</div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
