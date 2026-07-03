/**
 * Hypergene-style editable BAS-account × yearly forecast grid.
 * Cell-edit on yearly forecast distributes proportionally across the 12 months.
 */
import { useMemo, useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Sparkles, RotateCcw, Hand, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MONTH_KEYS, type BudgetRowData, type MonthKey } from "@/lib/budget/budgetEngine";
import { useForecastAdjustments } from "@/hooks/useForecastAdjustments";

type Source = "original" | "manual" | "ai";

interface AISuggestion {
  account_number: string;
  yearly: number;
  reasoning?: string;
  confidence?: number;
}

interface Props {
  rows: BudgetRowData[];
  baseline: BudgetRowData[]; // original snapshot
  aiSuggestions?: AISuggestion[];
  ytdActuals?: Record<string, number>;
  isLocked?: boolean;
  companyId: string;
  budgetId: string;
  onCellChange: (rowIdx: number, month: MonthKey, value: string) => void;
  onRowReplace: (rowIdx: number, monthly: Record<MonthKey, number>) => void;
}

interface Section {
  key: string;
  label: string;
  range: [string, string];
}

const SECTIONS: Section[] = [
  { key: "intakter", label: "Intäkter", range: ["3000", "3999"] },
  { key: "kostnader", label: "Kostnader (varor & material)", range: ["4000", "4999"] },
  { key: "personal", label: "Personalkostnader", range: ["7000", "7999"] },
  { key: "ovriga", label: "Övriga kostnader", range: ["5000", "6999"] },
];

function rowYearTotal(r: BudgetRowData): number {
  return MONTH_KEYS.reduce((s, m) => s + (Number(r[m]) || 0), 0);
}

function distributeYearly(target: number, current: BudgetRowData): Record<MonthKey, number> {
  const total = rowYearTotal(current);
  const out: Record<MonthKey, number> = {} as any;
  if (total === 0) {
    const each = Math.round(target / 12);
    MONTH_KEYS.forEach((m, i) => { out[m] = i === 11 ? target - each * 11 : each; });
    return out;
  }
  let assigned = 0;
  MONTH_KEYS.forEach((m, i) => {
    const share = (Number(current[m]) || 0) / total;
    const v = i === 11 ? target - assigned : Math.round(target * share);
    out[m] = v;
    assigned += v;
  });
  return out;
}

function rowSource(r: BudgetRowData, baseline?: BudgetRowData, ai?: AISuggestion): Source {
  if (r.manually_adjusted) return "manual";
  if (ai && Math.abs(rowYearTotal(r) - ai.yearly) < 1) return "ai";
  return "original";
}

const SOURCE_META: Record<Source, { label: string; icon: any; cls: string }> = {
  original: { label: "Original", icon: Check, cls: "bg-white text-slate-500 border-slate-200" },
  manual:   { label: "Manuell",  icon: Hand, cls: "bg-slate-100 text-slate-700 border-slate-200" },
  ai:       { label: "AI",       icon: Sparkles, cls: "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5]" },
};

export function AccountMonthMatrix({
  rows, baseline, aiSuggestions = [], ytdActuals = {},
  isLocked, companyId, budgetId,
  onCellChange, onRowReplace,
}: Props) {
  const aiMap = useMemo(() => new Map(aiSuggestions.map(s => [s.account_number, s])), [aiSuggestions]);
  const baseMap = useMemo(() => new Map(baseline.map(r => [r.account_number, r])), [baseline]);
  const { record } = useForecastAdjustments(companyId);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [draftYearly, setDraftYearly] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    return SECTIONS.map(sec => {
      const items = rows
        .map((r, idx) => ({ r, idx }))
        .filter(({ r }) => r.account_number >= sec.range[0] && r.account_number <= sec.range[1]);
      return { ...sec, items };
    }).filter(s => s.items.length > 0);
  }, [rows]);

  const commitYearly = useCallback((rowIdx: number, value: number) => {
    if (isLocked) return;
    const row = rows[rowIdx];
    const monthly = distributeYearly(value, row);
    const prior = rowYearTotal(row);
    onRowReplace(rowIdx, monthly);
    record.mutate({
      companyId,
      budgetId,
      accountNumber: row.account_number,
      periodMonth: `year`,
      priorValue: prior,
      newValue: value,
      source: "manual",
    });
  }, [rows, isLocked, onRowReplace, record, companyId, budgetId]);

  const acceptAI = useCallback((rowIdx: number, ai: AISuggestion) => {
    if (isLocked) return;
    const row = rows[rowIdx];
    const monthly = distributeYearly(ai.yearly, row);
    const prior = rowYearTotal(row);
    onRowReplace(rowIdx, monthly);
    record.mutate({
      companyId,
      budgetId,
      accountNumber: row.account_number,
      periodMonth: `year`,
      priorValue: prior,
      newValue: ai.yearly,
      source: "ai",
      reasoning: ai.reasoning ?? null,
    });
  }, [rows, isLocked, onRowReplace, record, companyId, budgetId]);

  const resetTo = useCallback((rowIdx: number, target: "baseline" | "ai") => {
    const row = rows[rowIdx];
    const ai = aiMap.get(row.account_number);
    const base = baseMap.get(row.account_number);
    if (target === "ai" && ai) acceptAI(rowIdx, ai);
    else if (target === "baseline" && base) {
      const monthly = MONTH_KEYS.reduce((acc, m) => { acc[m] = Number(base[m]) || 0; return acc; }, {} as Record<MonthKey, number>);
      const prior = rowYearTotal(row);
      onRowReplace(rowIdx, monthly);
      record.mutate({
        companyId, budgetId,
        accountNumber: row.account_number,
        periodMonth: "year",
        priorValue: prior,
        newValue: rowYearTotal(base),
        source: "reset",
      });
    }
  }, [rows, aiMap, baseMap, acceptAI, onRowReplace, record, companyId, budgetId]);

  const acceptAllAIInSection = useCallback((items: { r: BudgetRowData; idx: number }[]) => {
    items.forEach(({ r, idx }) => {
      const ai = aiMap.get(r.account_number);
      if (ai && Math.abs(rowYearTotal(r) - ai.yearly) > 1) acceptAI(idx, ai);
    });
  }, [aiMap, acceptAI]);

  return (
    <div className="rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Konto × prognos (årsbasis)</h3>
        <span className="text-xs text-slate-500">{rows.length} konton</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase tracking-wide text-[10px]">
            <tr>
              <th className="text-left px-3 py-2 w-20">Konto</th>
              <th className="text-left px-3 py-2">Namn</th>
              <th className="text-right px-3 py-2 w-28">Utfall YTD</th>
              <th className="text-right px-3 py-2 w-28">Budget år</th>
              <th className="text-right px-3 py-2 w-32">Prognos år</th>
              <th className="text-right px-3 py-2 w-28">AI-förslag</th>
              <th className="text-right px-3 py-2 w-24">Δ</th>
              <th className="text-center px-3 py-2 w-24">Källa</th>
              <th className="text-center px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(sec => {
              const isCollapsed = collapsed[sec.key];
              const hasAi = sec.items.some(({ r }) => {
                const ai = aiMap.get(r.account_number);
                return ai && Math.abs(rowYearTotal(r) - ai.yearly) > 1;
              });
              return (
                <>
                  <tr key={sec.key} className="bg-slate-100">
                    <td colSpan={9} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setCollapsed(c => ({ ...c, [sec.key]: !c[sec.key] }))}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                        >
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {sec.label}
                          <span className="text-[10px] font-normal text-slate-500">({sec.items.length})</span>
                        </button>
                        {hasAi && !isCollapsed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] gap-1"
                            onClick={() => acceptAllAIInSection(sec.items)}
                          >
                            <Sparkles className="w-3 h-3 text-[#3b82f6]" />
                            Acceptera alla AI
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {!isCollapsed && sec.items.map(({ r, idx }) => {
                    const ytd = ytdActuals[r.account_number] ?? 0;
                    const baseTotal = baseMap.get(r.account_number) ? rowYearTotal(baseMap.get(r.account_number)!) : 0;
                    const yearlyTotal = rowYearTotal(r);
                    const ai = aiMap.get(r.account_number);
                    const source = rowSource(r, baseMap.get(r.account_number), ai);
                    const meta = SOURCE_META[source];
                    const SourceIcon = meta.icon;
                    const draftKey = `${r.id}`;
                    const draft = draftYearly[draftKey];
                    const delta = yearlyTotal - baseTotal;

                    return (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-1.5 font-mono text-slate-600">{r.account_number}</td>
                        <td className="px-3 py-1.5 text-slate-800 truncate max-w-[260px]">{r.account_name}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{formatSEK(ytd)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{formatSEK(baseTotal)}</td>
                        <td className="px-3 py-1.5 text-right">
                          <Input
                            type="number"
                            disabled={isLocked}
                            value={draft ?? Math.round(yearlyTotal)}
                            onChange={e => setDraftYearly(d => ({ ...d, [draftKey]: e.target.value }))}
                            onBlur={() => {
                              if (draft != null) {
                                const v = parseFloat(draft);
                                if (!isNaN(v) && v !== yearlyTotal) commitYearly(idx, Math.round(v));
                                setDraftYearly(d => { const n = { ...d }; delete n[draftKey]; return n; });
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setDraftYearly(d => { const n = { ...d }; delete n[draftKey]; return n; });
                            }}
                            className="h-7 text-right tabular-nums text-xs px-2 ml-auto w-28"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {ai ? (
                            <button
                              onClick={() => acceptAI(idx, ai)}
                              disabled={isLocked}
                              title={ai.reasoning}
                              className="inline-flex items-center gap-1 text-[#3b82f6] hover:bg-[#EFF6FF] rounded px-1.5 py-0.5 tabular-nums"
                            >
                              <Sparkles className="w-3 h-3" />
                              {formatSEK(ai.yearly)}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className={cn(
                          "px-3 py-1.5 text-right tabular-nums",
                          delta > 0 ? "text-[#085041]" : delta < 0 ? "text-[#7A1A1A]" : "text-slate-400"
                        )}>
                          {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${formatSEK(delta)}`}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border", meta.cls)}>
                            <SourceIcon className="w-2.5 h-2.5" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-slate-400 hover:text-slate-700" title="Återställ">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-1.5" align="end">
                              <button
                                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100"
                                onClick={() => resetTo(idx, "baseline")}
                              >
                                Till baseline
                              </button>
                              <button
                                disabled={!ai}
                                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                                onClick={() => ai && resetTo(idx, "ai")}
                              >
                                Till AI-förslag
                              </button>
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
