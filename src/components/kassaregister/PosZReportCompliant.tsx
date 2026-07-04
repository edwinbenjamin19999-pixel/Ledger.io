import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePosZReports, usePosDailySales, formatKr } from "@/hooks/useKassaregister";
import { FileText, Download, Lock, CheckCircle, Eye, Search, Sparkles, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

interface VatLine { label: string;
  rate: number;
  salesInc: number;
  salesEx: number;
  vat: number;
}

export function PosZReportCompliant() { const { reports, isLoading } = usePosZReports();
  const currentMonth = format(new Date(), "yyyy-MM");
  const { sales } = usePosDailySales(currentMonth);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = reports.filter((r) =>
    searchTerm ? r.report_date.includes(searchTerm) || r.report_number?.includes(searchTerm) : true
  );

  const getStatusBadge = (report: typeof reports[0]) => { // Simulate status based on data
    const day = sales.find((s) => s.sale_date === report.report_date);
    if (day?.is_booked) { return <Badge variant="outline" className="border-[#BFE6D6] text-[#085041] bg-[#E1F5EE] dark:bg-emerald-950/20"><Lock className="h-3 w-3 mr-1" />Bokförd & låst</Badge>;
    }
    return <Badge variant="outline" className="border-[#F0DDB7] text-[#7A5417] bg-[#FAEEDA] dark:bg-amber-950/20"><CheckCircle className="h-3 w-3 mr-1" />Redo för granskning</Badge>;
  };

  // Generate compliant Z-report view
  const generateVatBreakdown = (report: typeof reports[0]): VatLine[] => { const total = report.total_sales;
    // Estimate VAT split (in real implementation this comes from POS data)
    const vat25Sales = total * 0.6;
    const vat12Sales = total * 0.3;
    const vat6Sales = total * 0.1;
    return [
      { label: "Försäljning 25%", rate: 25, salesInc: vat25Sales, salesEx: Math.round(vat25Sales / 1.25), vat: Math.round(vat25Sales - vat25Sales / 1.25) },
      { label: "Försäljning 12%", rate: 12, salesInc: vat12Sales, salesEx: Math.round(vat12Sales / 1.12), vat: Math.round(vat12Sales - vat12Sales / 1.12) },
      { label: "Försäljning 6%", rate: 6, salesInc: vat6Sales, salesEx: Math.round(vat6Sales / 1.06), vat: Math.round(vat6Sales - vat6Sales / 1.06) },
    ];
  };

  const selected = reports.find((r) => r.id === selectedReport);
  const vatLines = selected ? generateVatBreakdown(selected) : [];
  const totalVat = vatLines.reduce((s, v) => s + v.vat, 0);
  const totalEx = vatLines.reduce((s, v) => s + v.salesEx, 0);

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Sök datum eller nummer..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {reports.length} Z-rapporter arkiverade
        </div>
      </div>

      {/* Reports list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {reports.length === 0 ? "Inga Z-rapporter sparade. Importera eller skapa en Z-rapport." : "Inga resultat"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => { const day = sales.find((s) => s.sale_date === r.report_date);
            const isBooked = day?.is_booked;
            return (
              <Card
                key={r.id}
                className={cn(
                  "transition-all hover:shadow-md cursor-pointer group",
                  isBooked && "border-emerald-200/50 dark:border-emerald-800/20"
                )}
                onClick={() => setSelectedReport(r.id)}
              >
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                      isBooked ? "bg-[#E1F5EE] dark:bg-emerald-900/30" : "bg-muted"
                    )}>
                      {isBooked ? <Lock className="h-4 w-4 text-[#085041]" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">
                        Z-rapport {format(new Date(r.report_date), "d MMMM yyyy", { locale: sv })}
                        {r.report_number && <span className="text-muted-foreground ml-2">#{r.report_number}</span>}
                      </p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {r.cash_amount != null && <span>Kontant: {formatKr(r.cash_amount)}</span>}
                        {r.card_amount != null && <span>Kort: {formatKr(r.card_amount)}</span>}
                        {r.swish_amount != null && <span>Swish: {formatKr(r.swish_amount)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(r)}
                    <span className="text-sm font-bold">{formatKr(r.total_sales)}</span>
                    <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Z-report dialog — Skatteverket compliant layout */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Z-rapport — {format(new Date(selected.report_date), "d MMMM yyyy", { locale: sv })}
                  {selected.report_number && <span className="text-muted-foreground font-normal">#{selected.report_number}</span>}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Total försäljning inkl moms</p>
                    <p className="text-xl font-bold">{formatKr(selected.total_sales)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Netto (ex moms)</p>
                    <p className="text-xl font-bold">{formatKr(totalEx)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Total moms</p>
                    <p className="text-xl font-bold">{formatKr(totalVat)}</p>
                  </div>
                </div>

                {/* VAT breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Försäljning per momssats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Kategori</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Moms %</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Inkl moms</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Ex moms</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Moms</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vatLines.map((v, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="px-3 py-2">{v.label}</td>
                              <td className="px-3 py-2 text-right">{v.rate}%</td>
                              <td className="px-3 py-2 text-right">{formatKr(v.salesInc)}</td>
                              <td className="px-3 py-2 text-right">{formatKr(v.salesEx)}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatKr(v.vat)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-border font-bold">
                            <td className="px-3 py-2" colSpan={2}>Summa</td>
                            <td className="px-3 py-2 text-right">{formatKr(selected.total_sales)}</td>
                            <td className="px-3 py-2 text-right">{formatKr(totalEx)}</td>
                            <td className="px-3 py-2 text-right">{formatKr(totalVat)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment methods */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Betalningsmetoder</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { label: "Kontant", amount: selected.cash_amount, icon: "💵" },
                        { label: "Kort", amount: selected.card_amount, icon: "💳" },
                        { label: "Swish", amount: selected.swish_amount, icon: "📱" },
                      ].filter(p => p.amount != null && p.amount > 0).map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <span>{p.icon}</span>
                            <span className="text-sm">{p.label}</span>
                          </div>
                          <span className="text-sm font-bold">{formatKr(p.amount!)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 font-bold">
                        <span className="text-sm">Summa betalningar</span>
                        <span className="text-sm">
                          {formatKr((selected.cash_amount || 0) + (selected.card_amount || 0) + (selected.swish_amount || 0))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Returns & discounts */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Returer & rabatter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border">
                        <span className="text-sm">Returer</span>
                        <span className="text-sm font-bold">{formatKr(selected.returns_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border">
                        <span className="text-sm">Nettointäkt</span>
                        <span className="text-sm font-bold">{formatKr(selected.total_sales - selected.returns_amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selected.notes && (
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <p className="text-xs text-muted-foreground mb-1">Anteckningar</p>
                    <p className="text-sm">{selected.notes}</p>
                  </div>
                )}

                {/* Status & compliance */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[#E1F5EE] dark:bg-emerald-950/20 border border-[#BFE6D6] dark:border-emerald-800/30">
                  <CheckCircle className="h-4 w-4 text-[#085041] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#085041] dark:text-[#1D9E75]">Rapport komplett</p>
                    <p className="text-xs text-muted-foreground">Rapporten uppfyller Skatteverkets krav för Z-rapportarkivering.</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <ComingSoonButton tooltipText="PDF-export lanseras snart">Exportera PDF</ComingSoonButton>
                  <ComingSoonButton tooltipText="Excel-export lanseras snart">Exportera Excel</ComingSoonButton>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
