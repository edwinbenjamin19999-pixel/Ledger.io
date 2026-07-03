import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CashFlowPeriod, ARInvoiceLite, APInvoiceLite } from "@/hooks/useCashFlow";
import { InvoiceQuickList } from "./InvoiceQuickList";

const fmt = (n: number) => {
  const rounded = Math.round(n);
  const str = Math.abs(rounded).toLocaleString("sv-SE");
  return rounded < 0 ? `−${str}` : `+${str}`;
};

interface Props {
  period: CashFlowPeriod | null;
  onClose: () => void;
  arInvoices?: ARInvoiceLite[];
  apInvoices?: APInvoiceLite[];
  companyId?: string;
}

export function CashFlowDrilldown({ period, onClose, arInvoices = [], apInvoices = [], companyId }: Props) {
  const [tab, setTab] = useState("ledger");
  if (!period) return null;

  const details = period.details || [];
  const sorted = [...details].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  // Filter invoices for this period (YYYY-MM)
  const periodAR = arInvoices.filter((i) => i.due_date?.startsWith(period.period));
  const periodAP = apInvoices.filter((i) => i.due_date?.startsWith(period.period));

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-card border-l border-border shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-sm">{period.label} — Kassaflöde</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ing. {Math.round(period.openingBalance).toLocaleString("sv-SE")} → Netto {fmt(period.net)} → Utg. {Math.round(period.closingBalance).toLocaleString("sv-SE")}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 h-8">
          <TabsTrigger value="ledger" className="text-xs">Bokföring</TabsTrigger>
          <TabsTrigger value="ar" className="text-xs">Kundfakturor ({periodAR.length})</TabsTrigger>
          <TabsTrigger value="ap" className="text-xs">Lev.fakturor ({periodAP.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {sorted.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Inga transaktioner</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-1.5 text-left font-medium">Datum</th>
                      <th className="py-1.5 text-left font-medium">Konto</th>
                      <th className="py-1.5 text-left font-medium">Motpart</th>
                      <th className="py-1.5 text-right font-medium">Belopp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="py-1.5 font-mono">{d.date.substring(5)}</td>
                        <td className="py-1.5 font-mono">{d.account}</td>
                        <td className="py-1.5 truncate max-w-[100px]">{d.counterpart || "—"}</td>
                        <td className={`py-1.5 text-right font-mono tabular-nums ${d.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                          {fmt(d.amount)} kr
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ar" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {periodAR.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Inga kundfakturor i perioden</p>
              ) : companyId ? (
                <InvoiceQuickList invoices={periodAR} kind="ar" companyId={companyId} />
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ap" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {periodAP.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Inga leverantörsfakturor i perioden</p>
              ) : companyId ? (
                <InvoiceQuickList invoices={periodAP} kind="ap" companyId={companyId} />
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
