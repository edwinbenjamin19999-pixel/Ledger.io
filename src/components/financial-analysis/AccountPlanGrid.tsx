import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Sparkles, Check, X, RotateCcw, Hand } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommentBubble } from "@/components/financial-os/CommentBubble";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";
import type { VarianceRow } from "./types";
import type { AccountSuggestion } from "@/hooks/useAccountSuggestions";

export type AdjustmentSource = 'original' | 'manual' | 'ai';

export interface AccountAdjustmentState {
  /** account_number -> { value, source, suggestionRef? } */
  [accountNumber: string]: {
    value: number;
    source: AdjustmentSource;
    suggestionId?: string;
  };
}

interface Props {
  rows: VarianceRow[];
  suggestions: AccountSuggestion[];
  adjustments: AccountAdjustmentState;
  onChange: (accountNumber: string, value: number, source: AdjustmentSource, suggestion?: AccountSuggestion) => void;
  onReset: (accountNumber: string, mode: 'baseline' | 'ai') => void;
}

const SOURCE_BADGE: Record<AdjustmentSource, { label: string; cls: string; Icon: typeof Hand }> = {
  original: { label: 'Original', cls: 'bg-slate-100 text-slate-600', Icon: RotateCcw },
  manual: { label: 'Manuell', cls: 'bg-slate-200 text-slate-800', Icon: Hand },
  ai: { label: 'AI', cls: 'bg-[#EFF6FF] text-[#3b82f6]', Icon: Sparkles },
};

export function AccountPlanGrid({ rows, suggestions, adjustments, onChange, onReset }: Props) {
  const fos = useFinancialOSOptional();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(rows.filter(r => r.id !== 'ebit').slice(0, 2).map(r => r.id)));

  const suggestionByAccount = useMemo(() => {
    const m = new Map<string, AccountSuggestion>();
    for (const s of suggestions) m.set(s.account_number, s);
    return m;
  }, [suggestions]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const sections = rows.filter(r => r.id !== 'ebit' && r.children && r.children.length > 0);

  const acceptAllInSection = (section: VarianceRow) => {
    for (const child of section.children || []) {
      const acc = child.accountNumber || child.id;
      const sug = suggestionByAccount.get(acc);
      if (sug) onChange(acc, sug.suggested_value, 'ai', sug);
    }
  };

  const resetSection = (section: VarianceRow) => {
    for (const child of section.children || []) {
      const acc = child.accountNumber || child.id;
      onReset(acc, 'baseline');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200/60">
        <h3 className="text-sm font-semibold text-slate-900">Kontoplan · justera prognos</h3>
        <p className="text-[11px] text-slate-500">Inline-redigera prognos per konto · acceptera AI-förslag · alla ändringar loggas</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="text-left px-4 py-2 w-[28%]">Konto</th>
              <th className="text-right px-3 py-2">Utfall</th>
              <th className="text-right px-3 py-2">Budget</th>
              <th className="text-right px-3 py-2">Prognos</th>
              <th className="text-right px-3 py-2">AI-förslag</th>
              <th className="text-right px-3 py-2">Δ vs budget</th>
              <th className="text-center px-3 py-2">Källa</th>
              <th className="text-center px-3 py-2 w-[60px]">↺</th>
              {fos && <th className="text-center px-2 py-2 w-[40px]">💬</th>}
            </tr>
          </thead>
          <tbody>
            {sections.map(section => {
              const open = expanded.has(section.id);
              const sectionAISuggestionCount = (section.children || []).filter(c => suggestionByAccount.has(c.accountNumber || c.id)).length;
              return (
                <>
                  <tr
                    key={section.id}
                    className="bg-slate-100/60 border-b border-slate-200/60 cursor-pointer hover:bg-slate-100"
                  >
                    <td colSpan={2} className="px-4 py-2" onClick={() => toggle(section.id)}>
                      <div className="flex items-center gap-2">
                        {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{section.label}</span>
                        <span className="text-[10px] text-slate-400">({section.children?.length ?? 0} konton)</span>
                      </div>
                    </td>
                    <td colSpan={fos ? 7 : 6} className="px-3 py-1 text-right">
                      {sectionAISuggestionCount > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); acceptAllInSection(section); }}
                          className="text-[11px] px-2 py-0.5 rounded border border-[#3b82f6] bg-[#EFF6FF] text-[#3b82f6] hover:bg-[#EFF6FF] mr-1.5"
                        >
                          <Sparkles className="h-2.5 w-2.5 inline mr-1" />
                          Acceptera alla ({sectionAISuggestionCount})
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); resetSection(section); }}
                        className="text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      >
                        Återställ sektion
                      </button>
                    </td>
                  </tr>
                  {open && (section.children || []).map(child => {
                    const acc = child.accountNumber || child.id;
                    const adj = adjustments[acc];
                    const sug = suggestionByAccount.get(acc);
                    const currentValue = adj?.value ?? child.comparison;
                    const source: AdjustmentSource = adj?.source ?? 'original';
                    const SrcMeta = SOURCE_BADGE[source];
                    const deltaVsBudget = currentValue - child.comparison;
                    return (
                      <tr key={child.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                        <td className="px-4 py-2 text-xs">
                          <div className="font-mono text-slate-500">{acc}</div>
                          <div className="text-slate-700 truncate max-w-[220px]">{child.label.replace(`${acc} `, '')}</div>
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums text-slate-700">{formatSEK(child.actual)}</td>
                        <td className="text-right px-3 py-2 tabular-nums text-slate-500">{formatSEK(child.comparison)}</td>
                        <td className="text-right px-3 py-2">
                          <Input
                            type="number"
                            value={Math.round(currentValue)}
                            onChange={(e) => onChange(acc, Number(e.target.value), 'manual')}
                            className="h-7 text-xs text-right tabular-nums w-28 ml-auto px-2"
                          />
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {sug ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span title={sug.reason || ''} className="text-[#3b82f6] font-semibold">
                                {formatSEK(sug.suggested_value)}
                              </span>
                              <button
                                onClick={() => onChange(acc, sug.suggested_value, 'ai', sug)}
                                className="p-1 rounded hover:bg-[#E1F5EE] text-[#085041]"
                                title="Acceptera AI"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => onReset(acc, 'baseline')}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                title="Avslå"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className={cn("text-right px-3 py-2 tabular-nums font-semibold text-xs",
                          deltaVsBudget === 0 ? "text-slate-400" :
                          (child.isRevenue ? deltaVsBudget > 0 : deltaVsBudget < 0) ? "text-[#085041]" : "text-[#7A1A1A]"
                        )}>
                          {deltaVsBudget >= 0 ? '+' : ''}{formatSEK(deltaVsBudget)}
                        </td>
                        <td className="text-center px-3 py-2">
                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold", SrcMeta.cls)}>
                            <SrcMeta.Icon className="h-2.5 w-2.5" />
                            {SrcMeta.label}
                          </span>
                        </td>
                        <td className="text-center px-3 py-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-1" align="end">
                              <button
                                onClick={() => onReset(acc, 'baseline')}
                                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100"
                              >
                                Till baseline
                              </button>
                              {sug && (
                                <button
                                  onClick={() => onChange(acc, sug.suggested_value, 'ai', sug)}
                                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-[#EFF6FF] text-[#3b82f6]"
                                >
                                  Till AI-förslag
                                </button>
                              )}
                            </PopoverContent>
                          </Popover>
                        </td>
                        {fos && (
                          <td className="text-center px-2 py-2">
                            <CommentBubble entity={`row:${acc}`} compact />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
