import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Save, X, Sparkles, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OpeningBalance {
  id?: string;
  account_code: string;
  account_name: string | null;
  balance: number;
  balance_type: "debit" | "credit" | null;
  migration_job_id?: string | null;
}

interface Props {
  companyId: string;
  transitionDate?: string; // YYYY-MM-DD
}

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function classify(code: string) {
  const c = parseInt(code, 10);
  if (c >= 1000 && c < 2000) {
    return { group: "TILLGÅNGAR", sub: c < 1400 ? "Anläggningstillgångar" : "Omsättningstillgångar" };
  }
  if (c >= 2000 && c < 3000) {
    return { group: "SKULDER OCH EGET KAPITAL", sub: c < 2100 ? "Eget kapital" : "Skulder" };
  }
  if (c >= 3000 && c < 4000) return { group: "INTÄKTER", sub: "Intäkter" };
  if (c >= 4000 && c < 8000) return { group: "KOSTNADER", sub: "Kostnader" };
  return { group: "ÖVRIGT", sub: "Övrigt" };
}

export const OpeningBalancesPanel = ({ companyId, transitionDate }: Props) => {
  const [rows, setRows] = useState<OpeningBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<OpeningBalance>>({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<OpeningBalance>({
    account_code: "",
    account_name: "",
    balance: 0,
    balance_type: "debit",
  });
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const td = transitionDate;

  useEffect(() => {
    if (!td) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("company_id", companyId)
        .eq("transition_date", td)
        .order("account_code");
      if (!error && data) setRows(data as OpeningBalance[]);
      setLoading(false);
    })();
  }, [companyId, td]);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const r of rows) {
      if (r.balance_type === "credit" || (!r.balance_type && r.balance < 0)) {
        credit += Math.abs(r.balance);
      } else {
        debit += Math.abs(r.balance);
      }
    }
    return { debit, credit, diff: debit - credit };
  }, [rows]);

  const grouped = useMemo(() => {
    const out: Record<string, Record<string, OpeningBalance[]>> = {};
    for (const r of rows) {
      const { group, sub } = classify(r.account_code);
      const c = parseInt(r.account_code, 10);
      // Skip empty income/cost groups
      if ((c >= 3000 || c >= 4000) && Math.abs(r.balance) === 0) continue;
      out[group] ??= {};
      out[group][sub] ??= [];
      out[group][sub].push(r);
    }
    return out;
  }, [rows]);

  const importedSource = rows.some((r) => r.migration_job_id) ? "Importerat från SIE 4" : "Manuellt inmatad";

  const startEdit = (r: OpeningBalance) => {
    setEditingId(r.id!);
    setEditDraft({ ...r });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("opening_balances")
      .update({
        account_name: editDraft.account_name,
        balance: editDraft.balance,
        balance_type: editDraft.balance_type,
      })
      .eq("id", editingId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === editingId ? { ...r, ...editDraft } as OpeningBalance : r)));
    cancelEdit();
    toast.success("Sparat");
  };

  const addManualRow = async () => {
    if (!td) {
      toast.error("Övergångsdatum saknas");
      return;
    }
    if (!newRow.account_code || !newRow.balance) {
      toast.error("Ange konto och belopp");
      return;
    }
    const { data, error } = await supabase
      .from("opening_balances")
      .insert({
        company_id: companyId,
        transition_date: td,
        account_code: newRow.account_code,
        account_name: newRow.account_name,
        balance: newRow.balance,
        balance_type: newRow.balance_type,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((rs) => [...rs, data as OpeningBalance].sort((a, b) => a.account_code.localeCompare(b.account_code)));
    setAdding(false);
    setNewRow({ account_code: "", account_name: "", balance: 0, balance_type: "debit" });
    toast.success("Rad tillagd");
  };

  const runAICheck = async () => {
    setAiLoading(true);
    setAiNotes([]);
    try {
      // Try edge function (graceful fallback if not deployed yet)
      const { data, error } = await supabase.functions.invoke("ai-check-opening-balances", {
        body: { companyId, transitionDate: td, balances: rows },
      });
      if (error) throw error;
      const notes: string[] = data?.observations || [];
      // Local heuristic fallback / additions
      const has = (code: string) => rows.some((r) => r.account_code.startsWith(code));
      const isZero = (code: string) =>
        rows.find((r) => r.account_code === code)?.balance === 0;
      if (!has("1510")) notes.push("Kundfordringar (1510) saknas — lägg till om du har utestående fordringar");
      if (isZero("1910")) notes.push("Kassa (1910) är 0 — stämmer det?");
      if (Math.abs(totals.diff) > 0.5) {
        notes.push(`Differens på ${fmt(totals.diff)} kr — debet och kredit ska balansera till 0`);
      }
      setAiNotes(Array.from(new Set(notes)));
    } catch {
      // Pure-heuristic fallback
      const fallback: string[] = [];
      const has = (code: string) => rows.some((r) => r.account_code.startsWith(code));
      const find = (c: string) => rows.find((r) => r.account_code === c);
      if (!has("1510")) fallback.push("Kundfordringar (1510) saknas — lägg till om du har utestående fordringar");
      if (find("1910") && find("1910")!.balance === 0) fallback.push("Kassa (1910) är 0 — stämmer det?");
      if (Math.abs(totals.diff) > 0.5)
        fallback.push(`Differens på ${fmt(totals.diff)} kr — debet och kredit ska balansera till 0`);
      if (!has("2010") && !has("2080")) fallback.push("Inget eget kapital (20xx) hittades — verifiera mot föregående bokslut");
      setAiNotes(fallback);
    } finally {
      setAiLoading(false);
    }
  };

  if (!td) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Sätt övergångsdatum i SIE-importen för att se ingående balanser.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Laddar ingående balanser…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Ingående balanser per {td}</CardTitle>
            <CardDescription>
              Dessa saldon importerades från din SIE-fil. Verifiera att de stämmer.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{importedSource}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {Object.entries(grouped).map(([group, subs]) => (
          <div key={group} className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider font-semibold text-[#0B4F6C]">{group}</h4>
            {Object.entries(subs).map(([sub, items]) => (
              <div key={sub} className="space-y-1">
                <p className="text-[11px] text-muted-foreground">{sub}</p>
                <div className="rounded-md border border-[#DFE4EA] overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[#F5F7FA] text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left px-2.5 py-1.5 w-20">Konto</th>
                        <th className="text-left px-2.5 py-1.5">Kontonamn</th>
                        <th className="text-right px-2.5 py-1.5 w-28">Debet</th>
                        <th className="text-right px-2.5 py-1.5 w-28">Kredit</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => {
                        const isCredit = r.balance_type === "credit" || (!r.balance_type && r.balance < 0);
                        const amt = Math.abs(r.balance);
                        const editing = editingId === r.id;
                        return (
                          <tr key={r.id} className="border-t border-[#EEF1F5]">
                            <td className="px-2.5 py-1.5 font-mono text-[11px]">{r.account_code}</td>
                            <td className="px-2.5 py-1.5">
                              {editing ? (
                                <Input
                                  className="h-7 text-[12px]"
                                  value={editDraft.account_name ?? ""}
                                  onChange={(e) => setEditDraft({ ...editDraft, account_name: e.target.value })}
                                />
                              ) : (
                                r.account_name || <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-right tabular-nums">
                              {editing ? (
                                <Input
                                  type="number"
                                  className="h-7 text-[12px] text-right"
                                  value={editDraft.balance_type === "debit" ? Math.abs(editDraft.balance ?? 0) : 0}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      balance: parseFloat(e.target.value) || 0,
                                      balance_type: "debit",
                                    })
                                  }
                                />
                              ) : !isCredit ? (
                                fmt(amt)
                              ) : (
                                ""
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-right tabular-nums">
                              {editing ? (
                                <Input
                                  type="number"
                                  className="h-7 text-[12px] text-right"
                                  value={editDraft.balance_type === "credit" ? Math.abs(editDraft.balance ?? 0) : 0}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      balance: parseFloat(e.target.value) || 0,
                                      balance_type: "credit",
                                    })
                                  }
                                />
                              ) : isCredit ? (
                                fmt(amt)
                              ) : (
                                ""
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-right">
                              {editing ? (
                                <div className="flex gap-1 justify-end">
                                  <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700">
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-primary">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Add row */}
        {adding ? (
          <div className="rounded-md border border-dashed border-[#B5D4F4] bg-[#EFF6FF]/40 p-3 grid grid-cols-12 gap-2 items-end">
            <div className="col-span-2">
              <Label className="text-[10px]">Konto</Label>
              <Input
                className="h-8 text-[12px]"
                value={newRow.account_code}
                onChange={(e) => setNewRow({ ...newRow, account_code: e.target.value })}
              />
            </div>
            <div className="col-span-4">
              <Label className="text-[10px]">Kontonamn</Label>
              <Input
                className="h-8 text-[12px]"
                value={newRow.account_name ?? ""}
                onChange={(e) => setNewRow({ ...newRow, account_name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px]">Belopp</Label>
              <Input
                type="number"
                className="h-8 text-[12px]"
                value={newRow.balance}
                onChange={(e) => setNewRow({ ...newRow, balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px]">Typ</Label>
              <div className="flex gap-2 text-[11px]">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={newRow.balance_type === "debit"}
                    onChange={() => setNewRow({ ...newRow, balance_type: "debit" })}
                  />
                  Debet
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={newRow.balance_type === "credit"}
                    onChange={() => setNewRow({ ...newRow, balance_type: "credit" })}
                  />
                  Kredit
                </label>
              </div>
            </div>
            <div className="col-span-2 flex gap-1">
              <Button size="sm" onClick={addManualRow}>Lägg till</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Avbryt</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Lägg till konto
          </Button>
        )}

        {/* Summary */}
        <div className="rounded-md border border-[#DFE4EA] bg-[#F5F7FA] p-3 grid grid-cols-4 gap-3 text-[12px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Summa debet</p>
            <p className="tabular-nums font-semibold">{fmt(totals.debit)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Summa kredit</p>
            <p className="tabular-nums font-semibold">{fmt(totals.credit)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Differens</p>
            <p className={`tabular-nums font-semibold ${Math.abs(totals.diff) < 0.5 ? "text-emerald-700" : "text-red-700"}`}>
              {fmt(totals.diff)}
            </p>
          </div>
          <div className="flex items-center justify-end">
            {Math.abs(totals.diff) < 0.5 ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Balans OK
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" /> Differens {fmt(totals.diff)} kr
              </Badge>
            )}
          </div>
        </div>

        {/* AI check */}
        <div className="rounded-md border border-[#B5D4F4] bg-[#EFF6FF]/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#0B4F6C]" />
              <p className="text-[12px] font-medium text-[#0B4F6C]">AI balanskontroll</p>
            </div>
            <Button size="sm" variant="outline" onClick={runAICheck} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Kontrollera
            </Button>
          </div>
          {aiNotes.length > 0 ? (
            <ul className="text-[11px] text-[#0B4F6C] space-y-1 list-disc pl-4">
              {aiNotes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Klicka på "Kontrollera" för att låta AI granska att alla balanser ser rimliga ut.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
