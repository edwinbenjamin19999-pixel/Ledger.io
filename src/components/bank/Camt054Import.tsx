import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, FileCheck, AlertTriangle, CheckCircle2, XCircle, 
  Loader2, ArrowRight, Link2, Eye 
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Camt054ImportProps { companyId: string;
  bankAccountId?: string;
  onImportComplete?: () => void;
}

interface ImportedTransaction { id?: string;
  amount: number;
  currency: string;
  booking_date: string;
  debtor_name: string | null;
  reference: string | null;
  ocr_reference: string | null;
  description: string | null;
  transaction_type: string;
  match_type: string;
  match_confidence: number;
  matched_invoice_id: string | null;
  matched_invoice_number: string | null;
  matched_invoice_amount: number | null;
  status?: string;
}

interface ImportResult { import_id: string;
  total_transactions: number;
  auto_matched: number;
  auto_booked?: number;
  suggested: number;
  unmatched: number;
  transactions: ImportedTransaction[];
}

interface StoredTransaction { id: string;
  amount: number;
  currency: string;
  booking_date: string;
  debtor_name: string | null;
  reference: string | null;
  ocr_reference: string | null;
  description: string | null;
  transaction_type: string;
  match_type: string;
  match_confidence: number;
  matched_invoice_id: string | null;
  status: string;
  confirmed_at: string | null;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Camt054Import({ companyId, bankAccountId, onImportComplete }: Camt054ImportProps) { const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [storedTransactions, setStoredTransactions] = useState<StoredTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [matchDialogTx, setMatchDialogTx] = useState<StoredTransaction | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  const loadTransactions = useCallback(async () => { try { const { data, error } = await supabase
        .from('camt054_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('booking_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      setStoredTransactions((data as StoredTransaction[]) || []);
    } catch (e: any) { console.error('Failed to load CAMT054 transactions:', e);
    } finally { setLoading(false);
    }
  }, [companyId]);

  const loadInvoices = useCallback(async () => { const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, due_date, customer_id, customers(name)')
      .eq('company_id', companyId)
      .in('status', ['sent', 'overdue']);
    setInvoices(data || []);
  }, [companyId]);

  useEffect(() => { loadTransactions();
    loadInvoices();
  }, [loadTransactions, loadInvoices]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) { toast.error('Filen måste vara en XML-fil (CAMT.054-format)');
      return;
    }

    setUploading(true);
    try { const xml_content = await file.text();
      const { data, error } = await supabase.functions.invoke('parse-camt054', { body: { xml_content, company_id: companyId, bank_account_id: bankAccountId },
      });
      if (error) throw error;
      setResult(data as ImportResult);
      toast.success(`${data.total_transactions} transaktioner importerade från CAMT.054`);
      await loadTransactions();
      onImportComplete?.();
    } catch (e: any) { toast.error(e.message || 'Kunde inte importera CAMT.054-filen');
    } finally { setUploading(false);
      event.target.value = '';
    }
  };

  const confirmMatch = async (txId: string) => { setConfirmingId(txId);
    try { const { data, error } = await supabase.functions.invoke('confirm-camt054-match', { body: { transaction_id: txId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Okänt fel');
      toast.success('Matchning bekräftad – verifikation skapad');
      await loadTransactions();
    } catch (e: any) { toast.error(e.message || 'Kunde inte bekräfta matchningen');
    } finally { setConfirmingId(null);
    }
  };

  const manualMatch = async () => { if (!matchDialogTx || !selectedInvoiceId) return;
    setConfirmingId(matchDialogTx.id);
    try { // First update the match, then confirm via edge function
      const { error: updateError } = await supabase
        .from('camt054_transactions')
        .update({ matched_invoice_id: selectedInvoiceId,
          match_type: 'manual',
          match_confidence: 1.0,
        })
        .eq('id', matchDialogTx.id);
      if (updateError) throw updateError;

      const { data, error } = await supabase.functions.invoke('confirm-camt054-match', { body: { transaction_id: matchDialogTx.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Okänt fel');

      toast.success('Manuell matchning bekräftad – verifikation skapad');
      setMatchDialogTx(null);
      setSelectedInvoiceId("");
      await loadTransactions();
    } catch (e: any) { toast.error(e.message || 'Kunde inte bekräfta matchningen');
    } finally { setConfirmingId(null);
    }
  };

  const rejectMatch = async (txId: string) => { try { const { error } = await supabase
        .from('camt054_transactions')
        .update({ status: 'unmatched', matched_invoice_id: null, match_type: 'none', match_confidence: 0 })
        .eq('id', txId);
      if (error) throw error;
      toast.info('Matchning avvisad');
      await loadTransactions();
    } catch (e: any) { toast.error(e.message);
    }
  };

  const statusBadge = (status: string, matchType: string, confidence: number) => { if (status === 'booked') return <Badge className="bg-primary text-primary-foreground">Bokförd</Badge>;
    if (status === 'confirmed') return <Badge className="bg-primary/80 text-primary-foreground">Bekräftad</Badge>;
    if (status === 'auto_matched') return <Badge variant="secondary">Auto-matchad (OCR)</Badge>;
    if (status === 'suggested') return <Badge variant="outline" className="border-accent-foreground/30 text-accent-foreground">Förslag ({Math.round(confidence * 100)}%)</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">Ej matchad</Badge>;
  };

  const allTx = storedTransactions;
  const booked = allTx.filter(t => t.status === 'booked');
  const autoMatched = allTx.filter(t => t.status === 'auto_matched');
  const suggested = allTx.filter(t => t.status === 'suggested');
  const unmatched = allTx.filter(t => t.status === 'unmatched');
  const confirmed = allTx.filter(t => t.status === 'confirmed');

  return (
    <div className="space-y-4">
      {/* Upload section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-primary" />
            CAMT.054 – Importera betalningar
          </CardTitle>
          <CardDescription>
            Importera inkommande betalningar från Bankgirot i CAMT.054-format (ISO 20022). 
            Systemet matchar automatiskt betalningar mot öppna kundfakturor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <label className="flex-1">
              <Input
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
            </label>
            {uploading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>

          {result && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{result.total_transactions}</p>
                <p className="text-xs text-muted-foreground">Totalt</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-2xl font-bold text-primary">{result.auto_booked ?? 0}</p>
                <p className="text-xs text-primary/80">Auto-bokförda</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-2xl font-bold text-primary/70">{result.auto_matched - (result.auto_booked ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Auto-matchade</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-accent/50 border border-accent">
                <p className="text-2xl font-bold text-accent-foreground">{result.suggested}</p>
                <p className="text-xs text-muted-foreground">Förslag</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-2xl font-bold text-destructive">{result.unmatched}</p>
                <p className="text-xs text-destructive/80">Ej matchade</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions list */}
      {!loading && allTx.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Importerade betalningar</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{allTx.length} totalt</Badge>
                {suggested.length > 0 && (
                  <Badge variant="outline" className="border-accent-foreground/30 text-accent-foreground">
                    {suggested.length} kräver granskning
                  </Badge>
                )}
                {unmatched.length > 0 && (
                  <Badge variant="destructive">
                    {unmatched.length} ej matchade
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Datum</TableHead>
                    <TableHead>Belopp</TableHead>
                    <TableHead>Avsändare</TableHead>
                    <TableHead>Referens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTx.map(tx => (
                    <TableRow key={tx.id} className={tx.status === 'unmatched' ? 'bg-destructive/5' : tx.status === 'suggested' ? 'bg-accent/30' : ''}>
                      <TableCell className="font-mono text-sm">{tx.booking_date}</TableCell>
                      <TableCell className={`font-mono font-semibold ${tx.transaction_type === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}{fmt(tx.amount)} {tx.currency}
                      </TableCell>
                      <TableCell className="text-sm">{tx.debtor_name || '–'}</TableCell>
                      <TableCell className="text-sm font-mono">{tx.ocr_reference || tx.reference?.substring(0, 30) || '–'}</TableCell>
                      <TableCell>{statusBadge(tx.status, tx.match_type, tx.match_confidence)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {tx.status === 'suggested' && (
                            <>
                              <Button 
                                size="sm" variant="ghost" className="h-7 text-primary"
                                onClick={() => confirmMatch(tx.id)}
                                disabled={confirmingId === tx.id}
                              >
                                {confirmingId === tx.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              </Button>
                              <Button 
                                size="sm" variant="ghost" className="h-7 text-destructive"
                                onClick={() => rejectMatch(tx.id)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {tx.status === 'auto_matched' && (
                            <Button 
                              size="sm" variant="ghost" className="h-7 text-primary"
                              onClick={() => confirmMatch(tx.id)}
                              disabled={confirmingId === tx.id}
                            >
                              {confirmingId === tx.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Bekräfta
                              </>}
                            </Button>
                          )}
                          {tx.status === 'unmatched' && (
                            <Button 
                              size="sm" variant="outline" className="h-7"
                              onClick={() => { setMatchDialogTx(tx); setSelectedInvoiceId(""); }}
                            >
                              <Link2 className="h-3.5 w-3.5 mr-1" /> Matcha
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual match dialog */}
      <Dialog open={!!matchDialogTx} onOpenChange={(open) => { if (!open) setMatchDialogTx(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manuell matchning</DialogTitle>
            <DialogDescription>
              Välj en faktura att matcha mot betalningen på {matchDialogTx ? fmt(matchDialogTx.amount) : ''} kr
              {matchDialogTx?.debtor_name ? ` från ${matchDialogTx.debtor_name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj faktura..." />
              </SelectTrigger>
              <SelectContent>
                {invoices.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoice_number} – {fmt(inv.total_amount)} kr – {(inv.customers as Record<string, unknown> | null)?.name || 'Okänd'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogTx(null)}>Avbryt</Button>
            <Button onClick={manualMatch} disabled={!selectedInvoiceId || !!confirmingId}>
              {confirmingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Matcha och bekräfta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
