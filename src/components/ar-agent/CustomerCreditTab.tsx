import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronDown, ChevronRight, Users, AlertTriangle, Brain, MessageSquare, CalendarIcon, Loader2, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatSEK } from "@/lib/formatNumber";
import type { CustomerProfile, ARInvoice } from "./ARAgent";
import { useWriteOffInvoice, useCreatePaymentPlan } from "@/hooks/useARAgent";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const SCORE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-[#E1F5EE] dark:bg-green-900/30", text: "text-[#085041] dark:text-[#1D9E75]", border: "border-[#BFE6D6] dark:border-green-800" },
  B: { bg: "bg-[#EFF6FF] dark:bg-blue-900/30", text: "text-blue-700 dark:text-[#1E3A5F]", border: "border-[#C8DDF5] dark:border-blue-800" },
  C: { bg: "bg-[#FAEEDA] dark:bg-yellow-900/30", text: "text-[#7A5417] dark:text-[#C28A2B]", border: "border-[#F0DDB7] dark:border-yellow-800" },
  D: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
  E: { bg: "bg-[#FCE8E8] dark:bg-red-900/30", text: "text-[#7A1A1A] dark:text-[#C73838]", border: "border-[#F4C8C8] dark:border-red-800" },
  F: { bg: "bg-red-200 dark:bg-red-900/50", text: "text-[#7A1A1A] dark:text-red-300", border: "border-red-300 dark:border-red-700" },
};

interface Props {
  customers: CustomerProfile[];
  openInvoices: ARInvoice[];
  companyId?: string;
}

export const CustomerCreditTab = ({ customers, openInvoices, companyId }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Write-off state
  const [writeOffTarget, setWriteOffTarget] = useState<{ customer: CustomerProfile; invoice?: ARInvoice } | null>(null);
  const [writeOffReason, setWriteOffReason] = useState("");
  const writeOffMutation = useWriteOffInvoice(companyId ?? null);

  // Payment plan state
  const [planTarget, setPlanTarget] = useState<{ customer: CustomerProfile; invoice?: ARInvoice } | null>(null);
  const [planInstallments, setPlanInstallments] = useState("3");
  const [planStartDate, setPlanStartDate] = useState<Date | undefined>(undefined);
  const paymentPlanMutation = useCreatePaymentPlan(companyId ?? null);

  const handleWriteOff = async () => {
    if (!writeOffTarget) return;
    const inv = writeOffTarget.invoice ?? openInvoices.find(i => i.counterparty_name === writeOffTarget.customer.name && i.status !== 'paid');
    if (!inv) {
      toast.error("Ingen faktura att skriva av");
      return;
    }
    try {
      await writeOffMutation.mutateAsync({
        invoiceId: inv.id,
        amount: inv.total_amount,
        reason: writeOffReason || `Kundförlust ${writeOffTarget.customer.name}`,
      });
      toast.success(`Kundförlust bokförd på konto 6350 — ${formatSEK(inv.total_amount)}`);
      setWriteOffTarget(null);
      setWriteOffReason("");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte skriva av fakturan");
    }
  };

  const handleCreatePlan = async () => {
    if (!planTarget || !planStartDate) return;
    const inv = planTarget.invoice ?? openInvoices.find(i => i.counterparty_name === planTarget.customer.name && i.status !== 'paid');
    if (!inv) {
      toast.error("Ingen faktura att skapa plan för");
      return;
    }
    try {
      await paymentPlanMutation.mutateAsync({
        invoiceId: inv.id,
        customerName: planTarget.customer.name,
        totalAmount: inv.total_amount,
        installments: Number(planInstallments),
        startDate: format(planStartDate, 'yyyy-MM-dd'),
      });
      toast.success(`Avbetalningsplan skapad — ${planInstallments} delbetalningar om ${formatSEK(inv.total_amount / Number(planInstallments))}/mån`);
      setPlanTarget(null);
      setPlanInstallments("3");
      setPlanStartDate(undefined);
    } catch (e: any) {
      toast.error(e.message || "Kunde inte skapa avbetalningsplan");
    }
  };

  if (customers.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Ingen kunddata att visa. Skicka fakturor för att bygga kredithistorik.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Credit limit warnings */}
      {customers.filter(c => c.creditExceeded).length > 0 && (
        <Card className="border-[#F0DDB7] dark:border-amber-800/30 bg-[#FAEEDA] dark:bg-amber-900/10">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-[#7A5417] flex-shrink-0" />
            <p className="text-xs text-[#7A5417] dark:text-[#C28A2B]">
              {customers.filter(c => c.creditExceeded).length} kunder överstiger AI-rekommenderad kreditlimit.
              Totalt överexponerat: {fmt(customers.filter(c => c.creditExceeded).reduce((s, c) => s + (c.currentExposure - c.creditLimit), 0))} kr
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Kundkreditbetyg (A–F)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Kund</th>
                  <th className="px-4 py-2.5 font-medium text-right">Utestående</th>
                  <th className="px-4 py-2.5 font-medium text-center">Betyg</th>
                  <th className="px-4 py-2.5 font-medium text-right">Poäng</th>
                  <th className="px-4 py-2.5 font-medium text-right">Max förfallet</th>
                  <th className="px-4 py-2.5 font-medium text-center">Kreditlimit</th>
                  <th className="px-4 py-2.5 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const s = SCORE_STYLES[c.score] || SCORE_STYLES.C;
                  const isOpen = expanded === c.name;
                  const customerInvoices = openInvoices.filter(i => i.counterparty_name === c.name && i.status !== 'paid');
                  return (
                    <tr key={c.name} className="border-b border-border/50 last:border-0">
                      <td colSpan={7} className="p-0">
                        <div
                          className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={() => setExpanded(isOpen ? null : c.name)}
                        >
                          <span className="flex-1 font-medium text-foreground">{c.name}</span>
                          <span className="w-28 text-right font-medium text-foreground">{fmt(c.totalOutstanding)} kr</span>
                          <span className="w-16 text-center">
                            <Badge className={`${s.bg} ${s.text} border-0 font-bold`}>{c.score}</Badge>
                          </span>
                          <span className="w-16 text-right text-muted-foreground">{c.scorePoints}/100</span>
                          <span className="w-28 text-right">
                            {c.maxOverdueDays === 0 ? (
                              <span className="text-muted-foreground">I tid</span>
                            ) : (
                              <span className="text-destructive font-medium">{c.maxOverdueDays} dagar</span>
                            )}
                          </span>
                          <span className="w-28 text-center">
                            {c.creditExceeded ? (
                              <Badge variant="destructive" className="text-[10px]">Överskriden</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">{fmt(c.creditLimit)} kr</span>
                            )}
                          </span>
                          <span className="w-8 flex justify-center">
                            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </span>
                        </div>

                        {isOpen && (
                          <div className="px-4 pb-4 bg-muted/10">
                            <div className="rounded-lg border border-border/50 p-5 space-y-5">
                              {/* Score bar */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Kreditbetyg: {c.score} ({c.scoreLabel})</span>
                                  <span className={`text-sm font-bold ${s.text}`}>{c.scorePoints}/100 poäng</span>
                                </div>
                                <Progress value={c.scorePoints} className="h-2.5" />
                              </div>

                              {/* AI Pattern analysis */}
                              <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Brain className="h-4 w-4 text-secondary" />
                                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Betalningsmönster-AI</span>
                                </div>
                                <p className="text-sm text-foreground italic">"{c.aiPattern}"</p>
                              </div>

                              {/* Stats grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="bg-muted/30 rounded p-3">
                                  <span className="text-muted-foreground">Betalat i tid</span>
                                  <p className="font-medium text-lg">{Math.round(c.onTimeRate * 100)}%</p>
                                </div>
                                <div className="bg-muted/30 rounded p-3">
                                  <span className="text-muted-foreground">Snitt betaltid</span>
                                  <p className="font-medium text-lg">{c.avgDaysLate === 0 ? "I tid" : `${c.avgDaysLate} dagar`}</p>
                                </div>
                                <div className="bg-muted/30 rounded p-3">
                                  <span className="text-muted-foreground">Relation</span>
                                  <p className="font-medium text-lg">{c.relationMonths} mån</p>
                                </div>
                                <div className="bg-muted/30 rounded p-3">
                                  <span className="text-muted-foreground">Total affärsvolym</span>
                                  <p className="font-medium text-lg">{fmt(c.totalLifetime)} kr</p>
                                </div>
                              </div>

                              {/* Credit limit */}
                              <div className={`rounded-lg p-4 ${c.creditExceeded ? "bg-destructive/10 border border-destructive/30" : "bg-muted/20 border border-border/50"}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kreditlimit (AI-rekommenderad)</span>
                                  <span className="text-sm font-bold">{fmt(c.creditLimit)} kr</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Nuvarande exponering</span>
                                  <span className={`text-sm font-bold ${c.creditExceeded ? "text-destructive" : "text-foreground"}`}>
                                    {fmt(c.currentExposure)} kr
                                    {c.creditExceeded && <span className="ml-1 text-xs">ÖVERSKRIDEN</span>}
                                  </span>
                                </div>
                                <Progress value={Math.min(100, (c.currentExposure / c.creditLimit) * 100)} className="h-2 mt-2" />
                              </div>

                              {/* Communication personality */}
                              <div className="bg-muted/20 border border-border/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kommunikationsprofil</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Bästa dag</span>
                                    <p className="font-medium capitalize">{c.communicationProfile.bestDay}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Bästa tid</span>
                                    <p className="font-medium">{c.communicationProfile.bestTime}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Bästa kanal</span>
                                    <p className="font-medium">{c.communicationProfile.bestChannel}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Svarsfrekvens</span>
                                    <p className="font-medium">{Math.round(c.communicationProfile.responseRate * 100)}%</p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  Reagerar på: {c.communicationProfile.reactsTo}
                                </p>
                              </div>

                              {/* Recommendation */}
                              <div className="p-3 bg-muted/30 rounded text-xs text-muted-foreground italic">
                                AI-rekommendation: "{c.recommendation}"
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-2 flex-wrap">
                                {customerInvoices.length > 0 && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWriteOffTarget({ customer: c, invoice: customerInvoices[0] });
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" /> Skriv av
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlanTarget({ customer: c, invoice: customerInvoices[0] });
                                      }}
                                    >
                                      <CreditCard className="h-3 w-3 mr-1" /> Avbetalningsplan
                                    </Button>
                                  </>
                                )}
                                <ComingSoonButton tooltipText="Inkasso via Intrum/Sergel — Q3 2026">
                                  Skicka till inkasso
                                </ComingSoonButton>
                                <ComingSoonButton tooltipText="Fakturafinansiering kräver bankintegration">
                                  Fakturafinansiering
                                </ComingSoonButton>
                                <ComingSoonButton tooltipText="Extern kreditupplysning kräver API-nyckel för Creditsafe/UC">
                                  Kreditupplysning
                                </ComingSoonButton>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Write-off Dialog */}
      <Dialog open={!!writeOffTarget} onOpenChange={(open) => { if (!open) { setWriteOffTarget(null); setWriteOffReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Bekräfta avskrivning
            </DialogTitle>
            <DialogDescription>
              Avskrivning skapar en kundförlust-verifikation på konto 6350.
            </DialogDescription>
          </DialogHeader>
          {writeOffTarget && (
            <div className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kund</span>
                  <span className="font-medium text-foreground">{writeOffTarget.customer.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Belopp</span>
                  <span className="font-bold text-destructive">
                    {formatSEK(writeOffTarget.invoice?.total_amount ?? writeOffTarget.customer.totalOutstanding)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Faktura</span>
                  <span className="font-medium text-foreground">#{writeOffTarget.invoice?.invoice_number ?? '—'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="writeoff-reason">Orsak till avskrivning</Label>
                <Textarea
                  id="writeoff-reason"
                  placeholder="T.ex. konkurs, tvist, preskription..."
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="destructive"
                  disabled={writeOffMutation.isPending}
                  onClick={handleWriteOff}
                >
                  {writeOffMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Bekräfta avskrivning
                </Button>
                <Button variant="outline" onClick={() => { setWriteOffTarget(null); setWriteOffReason(""); }}>
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Plan Sheet */}
      <Sheet open={!!planTarget} onOpenChange={(open) => { if (!open) { setPlanTarget(null); setPlanInstallments("3"); setPlanStartDate(undefined); } }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Avbetalningsplan
            </SheetTitle>
            <SheetDescription>
              Skapa en avbetalningsplan för kundens utestående fordran.
            </SheetDescription>
          </SheetHeader>
          {planTarget && (
            <div className="space-y-6 mt-6">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kund</span>
                  <span className="font-medium text-foreground">{planTarget.customer.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Totalt belopp</span>
                  <span className="font-bold text-foreground">
                    {formatSEK(planTarget.invoice?.total_amount ?? planTarget.customer.totalOutstanding)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Antal delbetalningar</Label>
                <Select value={planInstallments} onValueChange={setPlanInstallments}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 månader</SelectItem>
                    <SelectItem value="3">3 månader</SelectItem>
                    <SelectItem value="6">6 månader</SelectItem>
                    <SelectItem value="12">12 månader</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !planStartDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {planStartDate ? format(planStartDate, "PPP") : "Välj startdatum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={planStartDate}
                      onSelect={setPlanStartDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Preview */}
              {planStartDate && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Förhandsvisning</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delbetalning</span>
                    <span className="font-bold text-foreground">
                      {formatSEK((planTarget.invoice?.total_amount ?? planTarget.customer.totalOutstanding) / Number(planInstallments))}/mån
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Period</span>
                    <span className="text-foreground">{planInstallments} månader</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start</span>
                    <span className="text-foreground">{format(planStartDate, 'yyyy-MM-dd')}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!planStartDate || paymentPlanMutation.isPending}
                onClick={handleCreatePlan}
              >
                {paymentPlanMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Skapa avbetalningsplan
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
