import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportItem { account: string;
  amount: number;
  previousAmount?: number;
  isSection?: boolean;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
}

interface Props { title: string;
  items: ReportItem[];
  currency: string;
  year: number;
  hasPreviousYear: boolean;
  totalLabel?: string;
  totalAmount?: number;
  totalPreviousAmount?: number;
  onExportPDF?: () => void;
}

const fmt = (n: number) => n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const ConsolidatedReportTable = ({ title, items, currency, year, hasPreviousYear, totalLabel, totalAmount, totalPreviousAmount, onExportPDF,
}: Props) => { return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF}>
              <Download className="w-4 h-4 mr-2" />Exportera PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-foreground/20">
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Konto</th>
                <th className="text-right py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{year} ({currency})</th>
                {hasPreviousYear && (
                  <>
                    <th className="text-right py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{year - 1} ({currency})</th>
                    <th className="text-right py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Förändring</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => { const change = item.previousAmount != null ? item.amount - item.previousAmount : null;

                // Section header row
                if (item.isSection) { return (
                    <tr key={index} className="bg-muted/40">
                      <td colSpan={hasPreviousYear ? 4 : 2} className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-foreground">
                        {item.account}
                      </td>
                    </tr>
                  );
                }

                // Subtotal row
                if (item.isSubtotal) { return (
                    <tr key={index} className="border-t border-foreground/15">
                      <td className="py-2 px-4 text-sm font-bold">{item.account}</td>
                      <td className="py-2 px-4 text-right tabular-nums font-bold">{fmt(item.amount)}</td>
                      {hasPreviousYear && (
                        <>
                          <td className="py-2 px-4 text-right tabular-nums text-muted-foreground font-semibold">
                            {item.previousAmount != null ? fmt(item.previousAmount) : '–'}
                          </td>
                          <td className={cn("py-2 px-4 text-right tabular-nums font-semibold",
                            change != null && change >= 0 ? 'text-[hsl(var(--status-green))]' : 'text-destructive')}>
                            {change != null ? `${change >= 0 ? '+' : ''}${fmt(change)}` : '–'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                }

                // Grand total row
                if (item.isGrandTotal) { return (
                    <tr key={index} className="bg-muted/40 border-t-2 border-b-2 border-foreground/20">
                      <td className="py-3 px-4 text-sm font-extrabold uppercase">{item.account}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-extrabold text-base">{fmt(item.amount)}</td>
                      {hasPreviousYear && (
                        <>
                          <td className="py-3 px-4 text-right tabular-nums text-muted-foreground font-bold text-base">
                            {item.previousAmount != null ? fmt(item.previousAmount) : '–'}
                          </td>
                          <td className={cn("py-3 px-4 text-right tabular-nums font-bold text-base",
                            change != null && change >= 0 ? 'text-[hsl(var(--status-green))]' : 'text-destructive')}>
                            {change != null ? `${change >= 0 ? '+' : ''}${fmt(change)}` : '–'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                }

                // Regular row
                return (
                  <tr key={index} className="hover:bg-muted/20 transition-colors border-b border-border/30">
                    <td className="py-1.5 px-4 text-sm pl-8">{item.account}</td>
                    <td className="py-1.5 px-4 text-right tabular-nums">{fmt(item.amount)}</td>
                    {hasPreviousYear && (
                      <>
                        <td className="py-1.5 px-4 text-right tabular-nums text-muted-foreground">
                          {item.previousAmount != null ? fmt(item.previousAmount) : '–'}
                        </td>
                        <td className={cn("py-1.5 px-4 text-right tabular-nums",
                          change != null && change >= 0 ? 'text-[hsl(var(--status-green))]' : 'text-destructive')}>
                          {change != null ? `${change >= 0 ? '+' : ''}${fmt(change)}` : '–'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {/* Final total row */}
              {totalLabel && totalAmount != null && (() => { const totalChange = totalPreviousAmount != null ? totalAmount - totalPreviousAmount : null;
                return (
                  <tr className="bg-muted/40 border-t-2 border-b-2 border-foreground/20">
                    <td className="py-3 px-4 text-sm font-extrabold uppercase">{totalLabel}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-extrabold text-base">{fmt(totalAmount)}</td>
                    {hasPreviousYear && (
                      <>
                        <td className="py-3 px-4 text-right tabular-nums text-muted-foreground font-bold text-base">
                          {totalPreviousAmount != null ? fmt(totalPreviousAmount) : '–'}
                        </td>
                        <td className={cn("py-3 px-4 text-right tabular-nums font-bold text-base",
                          totalChange != null && totalChange >= 0 ? 'text-[hsl(var(--status-green))]' : 'text-destructive')}>
                          {totalChange != null ? `${totalChange >= 0 ? '+' : ''}${fmt(totalChange)}` : '–'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
