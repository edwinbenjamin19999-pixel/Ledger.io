import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TaxMandateConsent } from "@/components/auth/TaxMandateConsent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useTaxAccountEntries, useCreateTaxEntry } from "@/hooks/useTaxAccount";
import { formatSEK } from "@/lib/formatNumber";
import {
  FileText, CheckCircle2, XCircle, Clock, AlertTriangle,
  Shield, Trash2, Plus, Info, Wallet,
} from "lucide-react";

interface TaxMandate {
  id: string;
  mandate_type: 'agi' | 'vat' | 'full';
  status: 'pending' | 'active' | 'revoked' | 'expired';
  skatteverket_mandate_id: string | null;
  consent_given_at: string;
  valid_from: string;
  valid_until: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
}

const typeLabels: Record<string, string> = {
  inbetalning: 'Inbetalning',
  utbetalning: 'Utbetalning',
  ränta: 'Ränta',
  avgift: 'Avgift',
  deklaration: 'Deklaration',
};

const TaxMandates = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [mandates, setMandates] = useState<TaxMandate[]>([]);
  const [loadingMandates, setLoadingMandates] = useState(true);
  const [showAddMandate, setShowAddMandate] = useState(false);
  const [mandateLoading, setMandateLoading] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState<TaxMandate | null>(null);
  const [revocationReason, setRevocationReason] = useState("");

  // Tax account
  const { data: taxData, isLoading: taxLoading } = useTaxAccountEntries();
  const createEntry = useCreateTaxEntry();
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    type: 'inbetalning',
    amount: 0,
    description: '',
    reference: '',
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadCompanyAndMandates();
  }, [user]);

  const loadCompanyAndMandates = async () => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("companies").select("*").limit(1).maybeSingle();
      if (companyError) throw companyError;
      setCompany(companyData);

      const { data: mandatesData, error: mandatesError } = await supabase
        .from("tax_mandates").select("*")
        .eq("company_id", companyData.id)
        .order("created_at", { ascending: false });
      if (mandatesError) throw mandatesError;
      setMandates((mandatesData || []) as TaxMandate[]);
    } catch (error: any) {
      console.error("Error loading data:", error);
    } finally {
      setLoadingMandates(false);
    }
  };

  const handleAddMandate = async (mandateType: 'full' | 'agi' | 'vat') => {
    if (!company) return;
    setMandateLoading(true);
    try {
      const mandateText = `FULLMAKT FÖR SKATTEÄRENDEN - Bokfy AB får företräda ${company.name} hos Skatteverket för ${mandateType === 'full' ? 'AGI och moms' : mandateType === 'agi' ? 'AGI' : 'moms'}deklarationer. Accepterat ${new Date().toISOString()}`;
      const { data, error } = await supabase.functions.invoke('register-tax-mandate', {
        body: { company_id: company.id, mandate_type: mandateType, consent_text: mandateText, consent_ip_address: null }
      });
      if (error) throw error;
      if (data?.note) {
        toast.success('Fullmakt registrerad!', { description: data.note });
      } else {
        toast.success('Fullmakt registrerad!');
      }
      setShowAddMandate(false);
      loadCompanyAndMandates();
    } catch (error: any) {
      toast.error('Kunde inte registrera fullmakt', { description: error.message });
    } finally {
      setMandateLoading(false);
    }
  };

  const handleRevokeMandate = async () => {
    if (!selectedMandate || !revocationReason.trim()) {
      toast.error("Ange anledning till återkallelse");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('revoke-tax-mandate', {
        body: { mandate_id: selectedMandate.id, revocation_reason: revocationReason }
      });
      if (error) throw error;
      toast.success('Fullmakt återkallad');
      setRevokeDialogOpen(false);
      setSelectedMandate(null);
      setRevocationReason("");
      loadCompanyAndMandates();
    } catch (error: any) {
      toast.error('Kunde inte återkalla fullmakt', { description: error.message });
    }
  };

  const handleCreateEntry = async () => {
    if (entryForm.amount <= 0) {
      toast.error("Ange ett belopp större än 0");
      return;
    }
    try {
      await createEntry.mutateAsync({
        entry_date: entryForm.entry_date,
        type: entryForm.type,
        amount: entryForm.amount,
        description: entryForm.description || undefined,
        reference: entryForm.reference || undefined,
      });
      toast.success("Skattekontohändelse registrerad");
      setShowEntryForm(false);
      setEntryForm({ entry_date: new Date().toISOString().slice(0, 10), type: 'inbetalning', amount: 0, description: '', reference: '' });
    } catch (error: any) {
      toast.error("Kunde inte spara", { description: error.message });
    }
  };

  const getMandateTypeLabel = (type: string) => {
    switch (type) {
      case 'agi': return 'Arbetsgivardeklaration';
      case 'vat': return 'Momsdeklaration';
      case 'full': return 'Full behörighet (AGI + Moms)';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Aktiv</Badge>;
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Väntande</Badge>;
      case 'revoked': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Återkallad</Badge>;
      case 'expired': return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Utgången</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || loadingMandates) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user || !company) return null;

  if (showAddMandate) {
    return (
      <div>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setShowAddMandate(false)} className="mb-4">← Tillbaka</Button>
          <TaxMandateConsent onAccept={handleAddMandate} loading={mandateLoading} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={Shield}
        title="Skattekonto & Fullmakter"
        subtitle="Hantera skattekontosaldo och fullmakter för Skatteverket"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEntryForm(true)}>
              <Plus className="h-4 w-4 mr-1" />Registrera händelse
            </Button>
            <ComingSoonButton tooltipText="Registrera AGI-fullmakt via Skatteverket e-tjänster — Q4 2026">
              Registrera AGI-fullmakt
            </ComingSoonButton>
          </div>
        }
      />
      <div className="px-8">
        <div className="max-w-5xl mx-auto space-y-6">

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Saldo hämtas manuellt — direktintegration med Skatteverkets API planeras Q4 2026.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="skattekonto">
            <TabsList>
              <TabsTrigger value="skattekonto">Skattekonto</TabsTrigger>
              <TabsTrigger value="fullmakter">Fullmakter</TabsTrigger>
            </TabsList>

            {/* ── SKATTEKONTO TAB ── */}
            <TabsContent value="skattekonto" className="space-y-4 mt-4">
              {/* Balance card */}
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-6 w-6 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Beräknat skattekontosaldo</div>
                      <div className={`text-2xl font-bold tabular-nums ${(taxData?.currentBalance ?? 0) >= 0 ? '' : 'text-destructive'}`}>
                        {formatSEK(taxData?.currentBalance ?? 0)}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setShowEntryForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />Ny post
                  </Button>
                </CardContent>
              </Card>

              {/* Entry form dialog */}
              <Dialog open={showEntryForm} onOpenChange={setShowEntryForm}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrera skattekontohändelse</DialogTitle>
                    <DialogDescription>Lägg till en transaktion på skattekontot</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Typ</label>
                        <Select value={entryForm.type} onValueChange={v => setEntryForm(f => ({ ...f, type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(typeLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Datum</label>
                        <Input type="date" value={entryForm.entry_date}
                          onChange={e => setEntryForm(f => ({ ...f, entry_date: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Belopp (kr)</label>
                      <Input type="number" value={entryForm.amount || ''}
                        onChange={e => setEntryForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Beskrivning</label>
                      <Input value={entryForm.description}
                        onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="T.ex. F-skatt mars" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Referens / OCR</label>
                      <Input value={entryForm.reference}
                        onChange={e => setEntryForm(f => ({ ...f, reference: e.target.value }))}
                        placeholder="OCR-nummer" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEntryForm(false)}>Avbryt</Button>
                    <Button onClick={handleCreateEntry} disabled={createEntry.isPending}>
                      {createEntry.isPending ? "Sparar..." : "Spara"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Entries table */}
              {taxLoading ? (
                <Skeleton className="h-[300px] rounded-xl" />
              ) : taxData?.hasData ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Skattekontohändelser</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Datum</TableHead>
                          <TableHead className="text-xs">Typ</TableHead>
                          <TableHead className="text-xs">Beskrivning</TableHead>
                          <TableHead className="text-xs">Referens</TableHead>
                          <TableHead className="text-xs text-right">Belopp</TableHead>
                          <TableHead className="text-xs text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taxData.entries.map(entry => {
                          const isPositive = ['inbetalning', 'ränta'].includes(entry.type);
                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="text-xs tabular-nums">
                                {new Date(entry.entry_date).toLocaleDateString('sv-SE')}
                              </TableCell>
                              <TableCell>
                                <Badge variant={isPositive ? 'default' : 'secondary'} className="text-[10px]">
                                  {typeLabels[entry.type] ?? entry.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{entry.description || '—'}</TableCell>
                              <TableCell className="text-xs font-mono">{entry.reference || '—'}</TableCell>
                              <TableCell className={`text-xs text-right tabular-nums font-medium ${isPositive ? 'text-[#085041]' : 'text-destructive'}`}>
                                {isPositive ? '+' : '−'}{formatSEK(Math.abs(Number(entry.amount)))}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums font-semibold">
                                {formatSEK(entry.runningBalance)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center space-y-3">
                    <Wallet className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Inga skattekontohändelser registrerade</p>
                    <Button variant="outline" size="sm" onClick={() => setShowEntryForm(true)}>
                      <Plus className="h-4 w-4 mr-1" />Registrera första händelsen
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── FULLMAKTER TAB ── */}
            <TabsContent value="fullmakter" className="space-y-4 mt-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Fullmakterna gör det möjligt för Bokfy att automatiskt skicka AGI och momsdeklarationer
                  till Skatteverket för din räkning. Du behåller full kontroll och kan återkalla fullmakten när som helst.
                </AlertDescription>
              </Alert>

              {mandates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inga fullmakter</h3>
                    <p className="text-muted-foreground mb-4">Du har inte lagt till några fullmakter ännu</p>
                    <Button onClick={() => setShowAddMandate(true)}>Lägg till första fullmakt</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {mandates.map((mandate) => (
                    <Card key={mandate.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {getMandateTypeLabel(mandate.mandate_type)}
                              {getStatusBadge(mandate.status)}
                            </CardTitle>
                            <CardDescription>
                              Registrerad {new Date(mandate.consent_given_at).toLocaleDateString('sv-SE')}
                            </CardDescription>
                          </div>
                          {mandate.status === 'active' && (
                            <Button variant="destructive" size="sm" onClick={() => {
                              setSelectedMandate(mandate);
                              setRevokeDialogOpen(true);
                            }}>
                              <Trash2 className="h-4 w-4 mr-2" />Återkalla
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <dt className="text-muted-foreground">Status hos Skatteverket</dt>
                            <dd className="font-medium">{mandate.skatteverket_mandate_id ? 'Registrerad' : 'Väntande'}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Giltig från</dt>
                            <dd className="font-medium">{new Date(mandate.valid_from).toLocaleDateString('sv-SE')}</dd>
                          </div>
                          {mandate.skatteverket_mandate_id && (
                            <div>
                              <dt className="text-muted-foreground">Skatteverket ID</dt>
                              <dd className="font-mono text-xs">{mandate.skatteverket_mandate_id}</dd>
                            </div>
                          )}
                          {mandate.revoked_at && (
                            <>
                              <div>
                                <dt className="text-muted-foreground">Återkallad</dt>
                                <dd className="font-medium">{new Date(mandate.revoked_at).toLocaleDateString('sv-SE')}</dd>
                              </div>
                              {mandate.revocation_reason && (
                                <div className="col-span-2">
                                  <dt className="text-muted-foreground">Anledning</dt>
                                  <dd className="font-medium">{mandate.revocation_reason}</dd>
                                </div>
                              )}
                            </>
                          )}
                        </dl>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setShowAddMandate(true)}>
                  <FileText className="h-4 w-4 mr-2" />Lägg till fullmakt
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Återkalla fullmakt</DialogTitle>
              <DialogDescription>
                Är du säker på att du vill återkalla denna fullmakt?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Anledning till återkallelse</label>
                <Textarea
                  placeholder="Beskriv varför du vill återkalla fullmakten..."
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>Avbryt</Button>
              <Button variant="destructive" onClick={handleRevokeMandate} disabled={!revocationReason.trim()}>
                Återkalla fullmakt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TaxMandates;
