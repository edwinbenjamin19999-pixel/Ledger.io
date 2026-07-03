/**
 * ForecastBreakdownTable — collapsed by default. Renders forecast vs budget per
 * BAS-account or per category (revenue/COGS/OPEX). Dimension switcher is exposed
 * but uses account-level aggregation only in this iteration.
 */
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

type Dimension = "account" | "category" | "customer" | "project" | "segment" | "cost_center";

interface Props {
  forecast: Record<string, number[]>;
  budget?: Record<string, number[]> | null;
  accountNames?: Record<string, string>;
}

function categorize(acc: string): "Intäkter" | "COGS" | "OPEX" | "Övrigt" {
  const n = parseInt(acc, 10);
  if (!Number.isFinite(n)) return "Övrigt";
  if (n >= 3000 && n < 4000) return "Intäkter";
  if (n >= 4000 && n < 5000) return "COGS";
  if (n >= 5000 && n < 8000) return "OPEX";
  return "Övrigt";
}

const sumVec = (v: number[] = []) => v.reduce((a, b) => a + b, 0);

export function ForecastBreakdownTable({ forecast, budget, accountNames }: Props) {
  const [open, setOpen] = useState(false);
  const [dim, setDim] = useState<Dimension>("account");

  const rows = useMemo(() => {
    const accs = Object.keys(forecast).sort();

    if (dim === "category") {
      const map = new Map<string, { f: number; b: number }>();
      for (const acc of accs) {
        const k = categorize(acc);
        const cur = map.get(k) ?? { f: 0, b: 0 };
        cur.f += sumVec(forecast[acc]);
        cur.b += sumVec(budget?.[acc] ?? []);
        map.set(k, cur);
      }
      return Array.from(map.entries()).map(([key, v]) => ({
        key,
        label: key,
        forecast: v.f,
        budget: v.b,
      }));
    }

    return accs.map((acc) => ({
      key: acc,
      label: `${acc}${accountNames?.[acc] ? " · " + accountNames[acc] : ""}`,
      forecast: sumVec(forecast[acc]),
      budget: sumVec(budget?.[acc] ?? []),
    }));
  }, [forecast, budget, dim, accountNames]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between px-6 py-4 text-left">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Detaljerad nedbrytning</div>
            <div className="text-base font-semibold text-slate-900">Per konto · kategori · dimension</div>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">Dimension:</span>
            <Select value={dim} onValueChange={(v) => setDim(v as Dimension)}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="account">Konto (BAS)</SelectItem>
                <SelectItem value="category">Kategori</SelectItem>
                <SelectItem value="customer">Kund</SelectItem>
                <SelectItem value="project">Projekt</SelectItem>
                <SelectItem value="segment">Segment</SelectItem>
                <SelectItem value="cost_center">Kostnadsställe</SelectItem>
              </SelectContent>
            </Select>
            {dim !== "account" && dim !== "category" && (
              <span className="text-xs text-slate-400">Aggregering kräver dimensionsmappning per verifikat.</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-2 font-medium">Rad</th>
                  <th className="py-2 px-2 font-medium text-right">Prognos</th>
                  <th className="py-2 px-2 font-medium text-right">Budget</th>
                  <th className="py-2 pl-2 font-medium text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-400">Ingen data ännu.</td></tr>
                ) : rows.map((r) => {
                  const delta = r.forecast - r.budget;
                  return (
                    <tr key={r.key} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-2 text-slate-700">{r.label}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatSEK(r.forecast)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-slate-500">{r.budget ? formatSEK(r.budget) : "—"}</td>
                      <td className={cn("py-2 pl-2 text-right tabular-nums", delta >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                        {delta >= 0 ? "+" : ""}{formatSEK(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
