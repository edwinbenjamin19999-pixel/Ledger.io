/**
 * ScenarioCompareTable — multi-select scenarios → side-by-side Δ vs base.
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDown, ArrowUp } from "lucide-react";
import { runScenario, deriveKpis, type DriverPatch } from "@/lib/scenarios/scenarioEngine";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";
import type { SavedScenario } from "@/hooks/useScenarios";
import { formatSEKCompact } from "@/lib/formatNumber";

type SortKey = "name" | "ebit" | "cash" | "runway";

interface Props {
  scenarios: SavedScenario[];
  baseDrivers: BudgetDrivers;
  targetEbit?: number | null;
}

export function ScenarioCompareTable({ scenarios, baseDrivers, targetEbit = null }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("ebit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const base = useMemo(() => {
    const r = runScenario({ baseDrivers });
    return { r, k: deriveKpis(r, targetEbit) };
  }, [baseDrivers, targetEbit]);

  const rows = useMemo(() => {
    const data = scenarios
      .filter((s) => selected.has(s.id))
      .map((s) => {
        const patch = (s.driver_patch ?? {}) as DriverPatch;
        const r = runScenario({ baseDrivers, patches: [patch] });
        const k = deriveKpis(r, targetEbit);
        return {
          id: s.id,
          name: s.name,
          kind: s.kind,
          deltaEbit: k.annualEbit - base.k.annualEbit,
          deltaCash: k.endingCash - base.k.endingCash,
          deltaRunway:
            (k.runwayMonths ?? Infinity) - (base.k.runwayMonths ?? Infinity),
          ebit: k.annualEbit,
          cash: k.endingCash,
          runway: k.runwayMonths,
        };
      });
    data.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const k = sortKey;
      const av = (k === "name" ? a.name : (a as any)[k]) ?? 0;
      const bv = (k === "name" ? b.name : (b as any)[k]) ?? 0;
      if (typeof av === "string") return av.localeCompare(String(bv)) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return data;
  }, [scenarios, selected, baseDrivers, targetEbit, base, sortKey, sortDir]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const sortHeader = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => {
        if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
      }}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === key && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Jämför scenarier</h3>
          <p className="text-xs text-muted-foreground">Välj 2+ scenarier för att se Δ vs bas.</p>
        </div>
        <div className="text-xs text-muted-foreground">{selected.size} valda</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 max-h-32 overflow-auto">
        {scenarios.length === 0 ? (
          <div className="col-span-full text-xs text-muted-foreground italic">
            Inga sparade scenarier ännu.
          </div>
        ) : scenarios.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer rounded-md px-2 py-1 hover:bg-muted/50">
            <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
            <span className="truncate">{s.name}</span>
          </label>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">{sortHeader("name", "Scenario")}</th>
              <th className="px-3 py-2 font-medium text-right">{sortHeader("ebit", "Δ EBIT")}</th>
              <th className="px-3 py-2 font-medium text-right">{sortHeader("cash", "Δ Kassa dec")}</th>
              <th className="px-3 py-2 font-medium text-right">{sortHeader("runway", "Δ Runway")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border bg-muted/30">
              <td className="px-3 py-2 font-medium">Bas</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatSEKCompact(base.k.annualEbit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatSEKCompact(base.k.endingCash)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {base.k.runwayMonths != null ? `${base.k.runwayMonths} mån` : "—"}
              </td>
            </tr>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground italic">
                  Välj scenarier ovan för att jämföra.
                </td>
              </tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${
                  r.deltaEbit > 0 ? "text-success" : r.deltaEbit < 0 ? "text-destructive" : ""
                }`}>
                  {r.deltaEbit > 0 ? "+" : ""}{formatSEKCompact(r.deltaEbit)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${
                  r.deltaCash > 0 ? "text-success" : r.deltaCash < 0 ? "text-destructive" : ""
                }`}>
                  {r.deltaCash > 0 ? "+" : ""}{formatSEKCompact(r.deltaCash)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${
                  r.deltaRunway > 0 ? "text-success" : r.deltaRunway < 0 ? "text-destructive" : ""
                }`}>
                  {Number.isFinite(r.deltaRunway)
                    ? `${r.deltaRunway > 0 ? "+" : ""}${r.deltaRunway.toFixed(0)} mån`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
