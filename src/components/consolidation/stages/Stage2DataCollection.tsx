import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, CheckCircle2, AlertTriangle, Circle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatSEK } from "@/lib/consolidation-engine";

interface Company { id: string;
  name: string;
  org_number: string;
  currency: string;
}

interface TrialBalanceRow { id: string;
  entity_id: string;
  account_no: string;
  account_name: string;
  debit: number;
  credit: number;
  opening_balance: number;
  closing_balance: number;
  import_source: string;
}

interface Stage2Props { groupId: string;
  periodId: string;
  onComplete: () => void;
}

export const Stage2DataCollection = ({ groupId, periodId, onComplete }: Stage2Props) => { const [companies, setCompanies] = useState<Company[]>([]);
  const [balances, setBalances] = useState<Record<string, TrialBalanceRow[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [importingEntity, setImportingEntity] = useState<string | null>(null);
  const [autoImportProgress, setAutoImportProgress] = useState<number | null>(null);
  const [manualDialogEntity, setManualDialogEntity] = useState<string | null>(null);
  const [manualRows, setManualRows] = useState<{ account_no: string; account_name: string; debit: string; credit: string }[]>([
    { account_no: "", account_name: "", debit: "0", credit: "0" },
  ]);

  const loadData = useCallback(async () => { setIsLoading(true);
    try { const [compRes, balRes] = await Promise.all([
        supabase.from("companies").select("id, name, org_number, currency").eq("group_id", groupId).order("name"),
        periodId
          ? supabase.from("entity_trial_balances").select("*").eq("consolidation_period_id", periodId).order("account_no")
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (compRes.error) throw compRes.error;
      if (balRes.error) throw balRes.error;

      setCompanies(compRes.data || []);

      const grouped: Record<string, TrialBalanceRow[]> = {};
      (balRes.data || []).forEach((row: any) => { if (!grouped[row.entity_id]) grouped[row.entity_id] = [];
        grouped[row.entity_id].push(row);
      });
      setBalances(grouped);
      return { companies: compRes.data || [], balances: grouped };
    } catch (err: any) { toast.error(err.message || "Kunde inte ladda data");
      return { companies: [], balances: {} };
    } finally { setIsLoading(false);
    }
  }, [groupId, periodId]);

  // Auto-import on mount: pull data för all entities that don't have balances yet
  useEffect(() => { const init = async () => { const result = await loadData();
      if (!periodId || !result.companies.length) return;

      // Find companies that don't have balances yet
      const missing = result.companies.filter(c => !result.balances[c.id] || result.balances[c.id].length === 0);
      if (missing.length === 0) return;

      // Auto-import all missing
      setAutoImportProgress(0);
      for (let i = 0; i < missing.length; i++) { await importNative(missing[i].id, true);
        setAutoImportProgress(Math.round(((i + 1) / missing.length) * 100));
      }
      setAutoImportProgress(null);
      toast.success(`${missing.length} bolag importerade automatiskt`);
      await loadData();
    };
    init();
  }, [groupId, periodId]);

  const importNative = async (entityId: string, silent = false) => { if (!silent) setImportingEntity(entityId);
    try { // First get approved journal entry IDs för this company
      const { data: entries, error: entryErr } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("company_id", entityId)
        .eq("status", "approved");

      if (entryErr) throw entryErr;
      if (!entries || entries.length === 0) { if (!silent) toast.info("Inga godkända bokföringsposter hittades för detta bolag");
        return;
      }

      const entryIds = entries.map(e => e.id);

      // Fetch lines för those entries, joined with accounts
      const { data: lines, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit, credit,
          account:chart_of_accounts!inner(account_number, account_name)
        `)
        .in("journal_entry_id", entryIds);

      if (error) throw error;
      if (!lines || lines.length === 0) { if (!silent) toast.info("Inga konteringsrader hittades för detta bolag");
        return;
      }

      // Aggregate by account
      const accountMap = new Map<string, { name: string; debit: number; credit: number }>();
      lines.forEach((line: any) => { const accNo = line.account.account_number;
        const existing = accountMap.get(accNo) || { name: line.account.account_name, debit: 0, credit: 0 };
        existing.debit += line.debit || 0;
        existing.credit += line.credit || 0;
        accountMap.set(accNo, existing);
      });

      if (!periodId) return;

      // Delete existing and insert new
      await supabase.from("entity_trial_balances").delete()
        .eq("consolidation_period_id", periodId)
        .eq("entity_id", entityId);

      const rows = Array.from(accountMap.entries()).map(([accNo, data]) => ({ consolidation_period_id: periodId,
        entity_id: entityId,
        account_no: accNo,
        account_name: data.name,
        debit: data.debit,
        credit: data.credit,
        opening_balance: 0,
        closing_balance: data.debit - data.credit,
        import_source: "native" as const,
      }));

      const { error: insertError } = await supabase.from("entity_trial_balances").insert(rows);
      if (insertError) throw insertError;

      if (!silent) { toast.success(`${rows.length} konton importerade`);
        loadData();
      }
    } catch (err: any) { if (!silent) toast.error(err.message || "Import misslyckades");
    } finally { if (!silent) setImportingEntity(null);
    }
  };

  const importAllEntities = async () => { setAutoImportProgress(0);
    for (let i = 0; i < companies.length; i++) { await importNative(companies[i].id, true);
      setAutoImportProgress(Math.round(((i + 1) / companies.length) * 100));
    }
    setAutoImportProgress(null);
    toast.success("Alla bolag uppdaterade");
    loadData();
  };

  const saveManualRows = async () => { if (!manualDialogEntity || !periodId) return;
    try { const validRows = manualRows.filter(r => r.account_no.trim());
      if (validRows.length === 0) { toast.error("Lägg till minst en rad");
        return;
      }

      await supabase.from("entity_trial_balances").delete()
        .eq("consolidation_period_id", periodId)
        .eq("entity_id", manualDialogEntity);

      const rows = validRows.map(r => ({ consolidation_period_id: periodId,
        entity_id: manualDialogEntity,
        account_no: r.account_no.trim(),
        account_name: r.account_name.trim(),
        debit: parseFloat(r.debit) || 0,
        credit: parseFloat(r.credit) || 0,
        opening_balance: 0,
        closing_balance: (parseFloat(r.debit) || 0) - (parseFloat(r.credit) || 0),
        import_source: "manual" as const,
      }));

      const { error } = await supabase.from("entity_trial_balances").insert(rows);
      if (error) throw error;

      toast.success(`${rows.length} konton sparade manuellt`);
      setManualDialogEntity(null);
      loadData();
    } catch (err: any) { toast.error(err.message || "Kunde inte spara");
    }
  };

  const getEntityStatus = (entityId: string) => { const rows = balances[entityId];
    if (!rows || rows.length === 0) return "missing";
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) return "warning";
    return "ok";
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Laddar...</div>;

  const allImported = companies.length > 0 && companies.every(c => getEntityStatus(c.id) !== "missing");
  const importedCount = companies.filter(c => getEntityStatus(c.id) !== "missing").length;

  return (
    <div className="space-y-6">
      {/* Auto-import progress */}
      {autoImportProgress !== null && (
        <Alert className="border-primary/30 bg-primary/5">
          <Loader2 className="w-4 h-4 animate-spin" />
          <AlertDescription>
            <div className="space-y-2">
              <span>Hämtar saldobalanser automatiskt... {autoImportProgress}%</span>
              <Progress value={autoImportProgress} className="h-2" />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      {allImported && (
        <Alert className="border-[#BFE6D6] bg-[#E1F5EE] dark:bg-green-950/20">
          <CheckCircle2 className="w-4 h-4 text-[#085041]" />
          <AlertDescription className="text-[#085041] dark:text-green-300">
            Alla {companies.length} bolag importerade — Klar att konsolidera
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Datainsamling
              </CardTitle>
              <CardDescription>
                Saldobalanser för {importedCount} av {companies.length} bolag importerade
              </CardDescription>
            </div>
            <Button variant="outline" onClick={importAllEntities} disabled={autoImportProgress !== null}>
              <Sparkles className="w-4 h-4 mr-2" />
              Uppdatera alla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bolag</TableHead>
                <TableHead>Org.nr</TableHead>
                <TableHead>Valuta</TableHead>
                <TableHead className="text-right">Konton</TableHead>
                <TableHead className="text-right">Debet</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Åtgärd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(c => { const status = getEntityStatus(c.id);
                const rows = balances[c.id] || [];
                const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
                const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
                const source = rows[0]?.import_source;

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.org_number}</TableCell>
                    <TableCell>{c.currency}</TableCell>
                    <TableCell className="text-right tabular-nums">{rows.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSEK(totalDebit)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSEK(totalCredit)}</TableCell>
                    <TableCell>
                      {status === "ok" && (
                        <Badge className="bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {source === "native" ? "Hämtad automatiskt" : "Importerad"}
                        </Badge>
                      )}
                      {status === "warning" && (
                        <Badge className="bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900/30 dark:text-[#C28A2B]">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Balansfel ({formatSEK(Math.abs(totalDebit - totalCredit))} kr)
                        </Badge>
                      )}
                      {status === "missing" && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Circle className="w-3 h-3 mr-1" />Ej kopplad
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => importNative(c.id)}
                          disabled={importingEntity === c.id}
                        >
                          {importingEntity === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                          Uppdatera
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setManualDialogEntity(c.id);
                            setManualRows([{ account_no: "", account_name: "", debit: "0", credit: "0" }]);
                          }}
                        >
                          Manuell
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manual entry dialog */}
      <Dialog open={!!manualDialogEntity} onOpenChange={open => !open && setManualDialogEntity(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manuell inmatning – {companies.find(c => c.id === manualDialogEntity)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {manualRows.map((row, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <Input placeholder="Konto" value={row.account_no} onChange={e => { const updated = [...manualRows];
                  updated[i].account_no = e.target.value;
                  setManualRows(updated);
                }} />
                <Input placeholder="Kontonamn" value={row.account_name} onChange={e => { const updated = [...manualRows];
                  updated[i].account_name = e.target.value;
                  setManualRows(updated);
                }} />
                <Input type="number" placeholder="Debet" value={row.debit} onChange={e => { const updated = [...manualRows];
                  updated[i].debit = e.target.value;
                  setManualRows(updated);
                }} />
                <Input type="number" placeholder="Kredit" value={row.credit} onChange={e => { const updated = [...manualRows];
                  updated[i].credit = e.target.value;
                  setManualRows(updated);
                }} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setManualRows(prev => [...prev, { account_no: "", account_name: "", debit: "0", credit: "0" }])}>
              + Lägg till rad
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setManualDialogEntity(null)}>Avbryt</Button>
              <Button onClick={saveManualRows}>Spara</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {allImported && (
        <div className="flex justify-end">
          <Button onClick={onComplete} size="lg">
            Gå vidare till Justeringar →
          </Button>
        </div>
      )}
    </div>
  );
};
