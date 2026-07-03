import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2, Save, RotateCcw, Sparkles, Lock, ChevronDown, ChevronUp, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/formatNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateVoucher, type EditableLine } from "@/hooks/useUpdateVoucher";
import { AuditTrailDrawer } from "./AuditTrailDrawer";
import type { JournalDetail } from "@/components/account-analysis/types";
import { cn } from "@/lib/utils";

interface Props {
  detail: JournalDetail | null;
  onClose: () => void;
  mode?: "view" | "edit";
  onSaved?: () => void;
}

interface Account {
  id: string;
  account_number: string;
  account_name: string;
  vat_code: string | null;
}

interface HeaderState {
  status: string;
  ai_confidence: number | null;
  ai_explanation: string | null;
  series_code: string | null;
  series_number: number | null;
  supplier_name: string | null;
  company_id: string;
}

const VAT_OPTIONS = [
  { value: "none", label: "Ingen" },
  { value: "25", label: "25%" },
  { value: "12", label: "12%" },
  { value: "6", label: "6%" },
  { value: "0", label: "0%" },
];

const newLineId = () => `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const AccountCombo = ({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (id: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = accounts.find(a => a.id === value);
  const filtered = useMemo(() => {
    if (!search) return accounts.slice(0, 50);
    const q = search.toLowerCase();
    return accounts.filter(a =>
      a.account_number.includes(q) || a.account_name.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [accounts, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-full text-xs flex items-center justify-start px-2 rounded-md border border-slate-200 bg-white hover:border-[#3b82f6] transition-colors text-left truncate"
        >
          {selected ? (
            <span className="truncate">
              <span className="font-mono font-semibold text-slate-700">{selected.account_number}</span>
              <span className="text-slate-500 ml-2">{selected.account_name}</span>
            </span>
          ) : <span className="text-slate-400">Välj konto…</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 bg-white" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Sök kontonummer eller namn…" value={search} onValueChange={setSearch} className="h-9" />
          <CommandList>
            <CommandEmpty>Inget konto hittat</CommandEmpty>
            <CommandGroup>
              {filtered.map(a => (
                <CommandItem
                  key={a.id}
                  value={a.id}
                  onSelect={() => { onChange(a.id); setOpen(false); setSearch(""); }}
                  className="text-xs"
                >
                  <span className="font-mono mr-2 text-slate-700 font-semibold">{a.account_number}</span>
                  <span className="truncate">{a.account_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const EditableVoucherPanel = ({ detail, onClose, mode = "edit", onSaved }: Props) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [header, setHeader] = useState<HeaderState | null>(null);
  const [entryDate, setEntryDate] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [original, setOriginal] = useState<{ entry_date: string; description: string; lines: EditableLine[] } | null>(null);
  const [periodLocked, setPeriodLocked] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ accountNumber: string; accountName: string; confidence: number } | null>(null);

  const { save, saving } = useUpdateVoucher();

  const isVirtual = detail?.isVirtualRow;
  const readOnly = mode === "view" || periodLocked || isVirtual;

  // Load voucher
  useEffect(() => {
    if (!detail?.journal_entry_id || isVirtual) {
      setHeader(null); setLines([]); setOriginal(null); setPeriodLocked(false);
      return;
    }
    (async () => {
      const [entryRes, linesRes] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("entry_date, description, status, ai_confidence, ai_explanation, series_code, series_number, supplier_name, company_id")
          .eq("id", detail.journal_entry_id)
          .maybeSingle(),
        supabase
          .from("journal_entry_lines")
          .select("id, account_id, debit, credit, vat_code, chart_of_accounts(account_number, account_name)")
          .eq("journal_entry_id", detail.journal_entry_id),
      ]);

      if (!entryRes.data) return;
      const h = entryRes.data as any;
      setHeader({
        status: h.status,
        ai_confidence: h.ai_confidence,
        ai_explanation: h.ai_explanation,
        series_code: h.series_code,
        series_number: h.series_number,
        supplier_name: h.supplier_name,
        company_id: h.company_id,
      });
      setEntryDate(h.entry_date);
      setDescription(h.description || "");

      const mapped: EditableLine[] = (linesRes.data || []).map((l: any) => ({
        id: l.id,
        account_id: l.account_id,
        account_number: l.chart_of_accounts?.account_number,
        account_name: l.chart_of_accounts?.account_name,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        vat_code: l.vat_code,
      }));
      setLines(mapped);
      setOriginal({ entry_date: h.entry_date, description: h.description || "", lines: mapped });

      // Period lock check
      const dt = new Date(h.entry_date);
      const { data: period } = await supabase
        .from("accounting_periods")
        .select("status")
        .eq("company_id", h.company_id)
        .eq("year", dt.getFullYear())
        .eq("month", dt.getMonth() + 1)
        .maybeSingle();
      setPeriodLocked(period?.status === "locked");

      // Load accounts for company
      const { data: accs } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_name, vat_code")
        .eq("company_id", h.company_id)
        .eq("is_active", true)
        .order("account_number");
      setAccounts((accs as Account[]) || []);

      // AI suggestion: derive from history (most-used counter account for similar descriptions)
      if (h.description && h.description.length > 2) {
        const { data: similar } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("company_id", h.company_id)
          .ilike("description", `%${h.description.split(" ")[0]}%`)
          .neq("id", detail.journal_entry_id)
          .limit(20);
        if (similar && similar.length >= 3) {
          const ids = similar.map(s => s.id);
          const { data: simLines } = await supabase
            .from("journal_entry_lines")
            .select("account_id, chart_of_accounts(account_number, account_name)")
            .in("journal_entry_id", ids);
          if (simLines && simLines.length > 0) {
            const counts: Record<string, { num: string; name: string; n: number }> = {};
            simLines.forEach((l: any) => {
              const num = l.chart_of_accounts?.account_number;
              const name = l.chart_of_accounts?.account_name;
              if (!num) return;
              counts[num] = counts[num] || { num, name, n: 0 };
              counts[num].n += 1;
            });
            const top = Object.values(counts).sort((a, b) => b.n - a.n)[0];
            if (top) {
              setAiSuggestion({
                accountNumber: top.num,
                accountName: top.name,
                confidence: Math.min(0.98, 0.6 + top.n / similar.length * 0.4),
              });
            }
          }
        }
      }
    })();
  }, [detail?.journal_entry_id, isVirtual]);

  const updateLine = (id: string, patch: Partial<EditableLine>) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const next = { ...l, ...patch };
      // auto-zero opposite when entering debit/credit
      if (patch.debit !== undefined && Number(patch.debit) > 0) next.credit = 0;
      if (patch.credit !== undefined && Number(patch.credit) > 0) next.debit = 0;
      // auto-fill vat from chart
      if (patch.account_id) {
        const a = accounts.find(x => x.id === patch.account_id);
        if (a) {
          next.account_number = a.account_number;
          next.account_name = a.account_name;
          if (!next.vat_code || next.vat_code === "none") next.vat_code = a.vat_code || "none";
        }
      }
      return next;
    }));
  };

  const addLine = () => setLines(prev => [...prev, { id: newLineId(), account_id: "", debit: 0, credit: 0, vat_code: "none" }]);
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const totals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    return { debit, credit, diff: debit - credit, balanced: Math.abs(debit - credit) < 0.01 };
  }, [lines]);

  const reset = () => {
    if (!original) return;
    setEntryDate(original.entry_date);
    setDescription(original.description);
    setLines(original.lines);
  };

  const handleSave = async (learn: boolean) => {
    if (!detail?.journal_entry_id) return;
    const ok = await save({
      journal_entry_id: detail.journal_entry_id,
      entry_date: entryDate,
      description,
      lines,
      original: original || undefined,
      learn,
    });
    if (ok) {
      onSaved?.();
      onClose();
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    const acc = accounts.find(a => a.account_number === aiSuggestion.accountNumber);
    if (!acc) return;
    // apply to first empty line, or first line
    const target = lines.find(l => !l.account_id) || lines[0];
    if (target) updateLine(target.id, { account_id: acc.id });
  };

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-[640px] bg-white shadow-lg border-l border-slate-200 z-50",
        "transform transition-transform duration-300 ease-out",
        detail ? "translate-x-0" : "translate-x-full"
      )}
    >
      {detail && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#C8DDF5] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#3b82f6]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 text-sm truncate">
                  {isVirtual ? detail.description : `Verifikat #${detail.journal_number}`}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {header?.series_code && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {header.series_code}{header.series_number ?? ""}
                    </span>
                  )}
                  {readOnly && !isVirtual && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#7A5417] bg-[#FAEEDA] border border-[#F0DDB7] px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" /> {periodLocked ? "Period låst" : "Endast visning"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {periodLocked && !isVirtual && (
            <div className="px-6 py-2.5 bg-[#FAEEDA] border-b border-[#F0DDB7] text-xs text-[#7A5417]">
              Denna period är låst. Verifikationen kan inte redigeras.
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {!isVirtual && (
              <>
                {/* Header fields */}
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Datum</label>
                    <Input
                      type="date"
                      value={entryDate}
                      onChange={e => setEntryDate(e.target.value)}
                      disabled={readOnly}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Beskrivning</label>
                    <Input
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      disabled={readOnly}
                      className="h-9 text-xs mt-1"
                      placeholder="Beskrivning av verifikation"
                    />
                  </div>
                </div>

                {/* AI assist */}
                {aiSuggestion && !readOnly && (
                  <div
                    className="rounded-xl p-3.5"
                    style={{
                      background: "rgba(29,217,240,0.08)",
                      border: "1px solid rgba(29,217,240,0.2)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "rgba(29,217,240,0.15)",
                          border: "1px solid rgba(29,217,240,0.25)",
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" style={{ color: "#0D7A8A" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: "#1F2937" }}>
                          AI föreslår konto{" "}
                          <span className="font-mono font-semibold" style={{ color: "#0D7A8A" }}>{aiSuggestion.accountNumber}</span>
                          {" — "}
                          <span className="font-medium">{aiSuggestion.accountName}</span>
                          <span
                            className="ml-2 text-[10px] px-1.5 py-0.5 rounded tabular-nums"
                            style={{
                              background: "rgba(29,217,240,0.12)",
                              border: "1px solid rgba(29,217,240,0.25)",
                              color: "#0D7A8A",
                            }}
                          >
                            {Math.round(aiSuggestion.confidence * 100)}% säkerhet
                          </span>
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "#6B7280" }}>Baserat på liknande historiska transaktioner i bolaget.</p>
                      </div>
                      <button
                        onClick={applyAiSuggestion}
                        className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors flex-shrink-0"
                        style={{
                          background: "white",
                          border: "1px solid rgba(29,217,240,0.35)",
                          color: "#0D7A8A",
                        }}
                      >
                        Använd
                      </button>
                    </div>
                  </div>
                )}

                {/* Lines table */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Konteringsrader</label>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={addLine}
                        className="inline-flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#3b82f6] font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Lägg till rad
                      </button>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-[1fr_90px_110px_110px_30px] gap-2 px-3 py-2 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                      <span>Konto</span>
                      <span>Moms</span>
                      <span className="text-right">Debet</span>
                      <span className="text-right">Kredit</span>
                      <span />
                    </div>
                    {lines.length === 0 && (
                      <div className="px-3 py-6 text-xs text-slate-400 italic text-center">Inga rader</div>
                    )}
                    {lines.map(line => (
                      <div key={line.id} className="grid grid-cols-[1fr_90px_110px_110px_30px] gap-2 px-3 py-2 border-b border-slate-100 items-center">
                        {readOnly ? (
                          <span className="text-xs truncate">
                            <span className="font-mono font-semibold text-slate-700">{line.account_number}</span>
                            <span className="text-slate-500 ml-2">{line.account_name}</span>
                          </span>
                        ) : (
                          <AccountCombo accounts={accounts} value={line.account_id} onChange={id => updateLine(line.id, { account_id: id })} />
                        )}

                        {readOnly ? (
                          <span className="text-xs text-slate-500">{line.vat_code || "—"}</span>
                        ) : (
                          <Select value={line.vat_code || "none"} onValueChange={v => updateLine(line.id, { vat_code: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white">
                              {VAT_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <Input
                          type="number"
                          value={line.debit || ""}
                          onChange={e => updateLine(line.id, { debit: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          className="h-8 text-xs text-right tabular-nums"
                          placeholder="0"
                        />
                        <Input
                          type="number"
                          value={line.credit || ""}
                          onChange={e => updateLine(line.id, { credit: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          className="h-8 text-xs text-right tabular-nums"
                          placeholder="0"
                        />

                        {!readOnly ? (
                          <button onClick={() => removeLine(line.id)} className="text-slate-300 hover:text-[#7A1A1A] transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : <span />}
                      </div>
                    ))}

                    {/* Balance footer */}
                    <div className={cn(
                      "grid grid-cols-[1fr_90px_110px_110px_30px] gap-2 px-3 py-2.5 border-t-2 text-xs font-semibold tabular-nums items-center",
                      totals.balanced ? "border-[#BFE6D6] bg-emerald-50/50" : "border-[#F4C8C8] bg-rose-50/50"
                    )}>
                      <span className={cn("text-[11px] uppercase tracking-wider", totals.balanced ? "text-[#085041]" : "text-[#7A1A1A]")}>
                        {totals.balanced ? "Balanserad" : `Diff: ${formatSEK(Math.abs(totals.diff))}`}
                      </span>
                      <span />
                      <span className="text-right text-slate-700">{formatSEK(totals.debit)}</span>
                      <span className="text-right text-slate-700">{formatSEK(totals.credit)}</span>
                      <span />
                    </div>
                  </div>
                </div>

                {/* Audit collapsible */}
                <div>
                  <button
                    onClick={() => setShowAudit(s => !s)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-600 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <History className="w-3.5 h-3.5" /> Visa ändringshistorik
                    </span>
                    {showAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showAudit && (
                    <div className="mt-3">
                      <AuditTrailDrawer journalEntryId={detail.journal_entry_id} />
                    </div>
                  )}
                </div>
              </>
            )}

            {isVirtual && (
              <div className="text-xs text-slate-500 italic">Saldorad — ingen verifikation att redigera.</div>
            )}
          </div>

          {/* Footer */}
          {!isVirtual && !readOnly && (
            <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center gap-2">
              <Button
                onClick={() => handleSave(false)}
                disabled={saving || !totals.balanced}
                className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6] text-white text-xs h-9"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Sparar…" : "Spara ändring"}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving || !totals.balanced}
                variant="outline"
                className="text-xs h-9"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#3b82f6]" />
                Spara & lär AI
              </Button>
              <Button
                onClick={reset}
                disabled={saving}
                variant="ghost"
                className="text-xs h-9 text-slate-500"
                title="Återställ till ursprungligt värde"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
