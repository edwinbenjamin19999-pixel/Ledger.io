import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Mail, CalendarClock, Gavel, Clock, CheckCircle2, Send, FileText } from "lucide-react";
import { ARInvoice, CustomerProfile } from "./ARAgent";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface OverdueItem {
  invoice: ARInvoice;
  daysOverdue: number;
  risk: "high" | "medium" | "low";
  recommendation: string;
  recoveryProb: number;
}

interface Props {
  openInvoices: ARInvoice[];
  customers: CustomerProfile[];
}

function getRecommendation(days: number, amount: number, customer?: CustomerProfile): string {
  if (days > 90) return "Föreslår: Inkasso";
  if (days > 60 || (amount > 50000 && days > 30)) return "Föreslår: Betalplan";
  if (days > 30) return "Föreslår: Påminnelse 2 + telefonkontakt";
  if (customer && customer.score >= "D") return "Föreslår: Omedelbar uppföljning";
  return "Föreslår: Skicka automatisk påminnelse";
}

function calcRecoveryProb(customer?: CustomerProfile): number {
  if (!customer) return 50;
  return Math.min(95, Math.round(customer.onTimeRate * 70 + 20));
}

export const ARPriorityList = ({ openInvoices, customers }: Props) => {
  const now = new Date();
  const [selectedInvoice, setSelectedInvoice] = useState<OverdueItem | null>(null);

  const items: OverdueItem[] = openInvoices
    .map((inv) => {
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000));
      if (daysOverdue <= 0) return null;
      const customer = customers.find((c) => c.name === inv.counterparty_name);
      const risk: OverdueItem["risk"] =
        daysOverdue > 90 || (daysOverdue > 60 && inv.total_amount > 50000)
          ? "high"
          : daysOverdue > 30
          ? "medium"
          : "low";
      return {
        invoice: inv,
        daysOverdue,
        risk,
        recommendation: getRecommendation(daysOverdue, inv.total_amount, customer),
        recoveryProb: calcRecoveryProb(customer),
      } as OverdueItem;
    })
    .filter(Boolean) as OverdueItem[];

  items.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    if (riskOrder[a.risk] !== riskOrder[b.risk]) return riskOrder[a.risk] - riskOrder[b.risk];
    return b.invoice.total_amount - a.invoice.total_amount;
  });

  const riskConfig = {
    high: { border: "border-l-rose-500", badge: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-rose-900 dark:text-rose-200", label: "🔴 Hög risk" },
    medium: { border: "border-l-amber-500", badge: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900 dark:text-amber-200", label: "🟡 Medium" },
    low: { border: "border-l-blue-500", badge: "bg-[#EFF6FF] text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "🔵 Ny" },
  };

  const daysColor = (d: number) =>
    d > 60 ? "text-[#7A1A1A]" : d > 30 ? "text-[#7A5417]" : "text-[#085041]";

  const probColor = (p: number) =>
    p >= 70 ? "text-[#085041]" : p >= 40 ? "text-[#7A5417]" : "text-[#7A1A1A]";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Åtgärdskö
            <Badge variant="secondary" className="text-xs">{items.length} fakturor</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Inga förfallna fakturor — bra jobbat! 🎉</p>
          )}
          {items.slice(0, 10).map((item) => {
            const cfg = riskConfig[item.risk];
            // Per-row trend signal
            const trend: { label: string; cls: string } =
              item.risk === "high"
                ? { label: "Hög risk", cls: "bg-[#FCE8E8] text-[#7A1A1A] dark:text-rose-300 border-[#F4C8C8]" }
                : item.recoveryProb >= 70
                ? { label: "Betalas troligen", cls: "bg-[#E1F5EE] text-[#085041] dark:text-emerald-300 border-[#BFE6D6]" }
                : { label: "Sen trend", cls: "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-300 border-[#F0DDB7]" };

            return (
              <div
                key={item.invoice.id}
                className={`group rounded-xl border border-l-[3px] ${cfg.border} border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-[#C8DDF5] hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-[0_1px_2px_rgba(15,23,42,0.04)]`}
                onClick={() => setSelectedInvoice(item)}
              >
                <div className="p-5 grid grid-cols-[1fr,auto] gap-x-6 gap-y-3 items-center">
                  {/* LEFT — Customer + meta */}
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[15px] text-foreground truncate">
                        {item.invoice.counterparty_name}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${trend.cls}`}>
                        {trend.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{item.invoice.invoice_number}</span>
                      <span>·</span>
                      <span className={`font-medium ${daysColor(item.daysOverdue)}`}>
                        {item.daysOverdue}d försenad
                      </span>
                      <span>·</span>
                      <span className={`font-medium ${probColor(item.recoveryProb)}`}>
                        {item.recoveryProb}% återvinning
                      </span>
                      {(item.invoice.reminder_count || 0) > 0 && (
                        <>
                          <span>·</span>
                          <span>{item.invoice.reminder_count} påm.</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT — Amount (dominant) */}
                  <div className="text-right">
                    <div className="text-2xl font-extrabold tabular-nums tracking-tight text-foreground leading-none">
                      {fmt(item.invoice.total_amount)} kr
                    </div>
                  </div>

                  {/* FULL-WIDTH — AI recommendation + actions */}
                  <div className="col-span-2 flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Sparkles className="h-3.5 w-3.5 text-[#3b82f6] flex-shrink-0" />
                      <span className="text-xs font-medium text-[#3b82f6] dark:text-[#3b82f6] truncate">{item.recommendation}</span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={item.risk === "high" ? "default" : "outline"}
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.success(item.risk === "high" ? "Krav skickat" : "AI-påminnelse skickad");
                        }}
                      >
                        {item.risk === "high" ? (
                          <><Gavel className="h-3.5 w-3.5 mr-1" />Skicka krav</>
                        ) : (
                          <><Mail className="h-3.5 w-3.5 mr-1" />Påminn</>
                        )}
                      </Button>
                      <ComingSoonButton tooltipText="Betalplan — Q3 2026" className="text-xs h-8 px-2.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                      </ComingSoonButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length > 10 && (
            <p className="text-center text-xs text-muted-foreground">
              + {items.length - 10} fler fakturor i kön
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timeline Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              {selectedInvoice?.invoice.counterparty_name}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Faktura</span>
                <span className="font-mono font-semibold">{selectedInvoice.invoice.invoice_number}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Belopp</span>
                <span className="font-bold">{fmt(selectedInvoice.invoice.total_amount)} kr</span>
              </div>

              {/* Timeline */}
              <div className="border-l-2 border-muted ml-3 pl-4 space-y-4 py-2">
                <div className="relative">
                  <div className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full bg-emerald-500" />
                  <p className="text-sm font-medium">Faktura skapad</p>
                  <p className="text-xs text-muted-foreground">{new Date(selectedInvoice.invoice.created_at).toLocaleDateString("sv-SE")}</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full bg-blue-500" />
                  <p className="text-sm font-medium">Förfallodatum</p>
                  <p className="text-xs text-muted-foreground">{new Date(selectedInvoice.invoice.due_date).toLocaleDateString("sv-SE")}</p>
                </div>
                {(selectedInvoice.invoice.reminder_count || 0) > 0 && (
                  <div className="relative">
                    <div className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full bg-amber-500" />
                    <p className="text-sm font-medium">Påminnelser skickade</p>
                    <p className="text-xs text-muted-foreground">{selectedInvoice.invoice.reminder_count} påminnelser</p>
                  </div>
                )}
                <div className="relative">
                  <div className={`absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full ${selectedInvoice.risk === "high" ? "bg-rose-500" : selectedInvoice.risk === "medium" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <p className="text-sm font-medium">Aktuell status</p>
                  <p className="text-xs text-muted-foreground">{selectedInvoice.daysOverdue} dagar förfallen — {selectedInvoice.recommendation}</p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Återvinningssannolikhet</span>
                <span className={`font-bold ${probColor(selectedInvoice.recoveryProb)}`}>{selectedInvoice.recoveryProb}%</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
