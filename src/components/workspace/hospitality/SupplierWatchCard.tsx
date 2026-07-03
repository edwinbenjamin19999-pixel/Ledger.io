import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Truck } from "lucide-react";
import { useSupplierIntelligence, useAnalyzeSuppliers } from "@/hooks/hospitality/useSupplierIntelligence";
import { cn } from "@/lib/utils";

const fmtKr = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

const categoryLabel: Record<string, string> = {
  food: "Råvaror",
  beverage: "Dryck",
  supplies: "Förbrukning",
  services: "Tjänster",
  other: "Övrigt",
};

export function SupplierWatchCard({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useSupplierIntelligence();
  const analyze = useAnalyzeSuppliers();

  const rows = (data ?? []).slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> Leverantörsbevakning
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
          {analyze.isPending ? "Analyserar…" : "Analysera"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Inga leverantörsdata ännu — tryck "Analysera"
          </p>
        ) : (
          rows.map((r: any) => {
            const delta = Number(r.price_change_pct ?? 0);
            const Icon = delta >= 0 ? TrendingUp : TrendingDown;
            return (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.supplier_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel[r.category] ?? r.category} · {r.invoice_count} fakturor
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{fmtKr(Number(r.last_invoice_amount ?? 0))}</p>
                  {Math.abs(delta) > 0.1 && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        delta > 10 && "text-[#7A1A1A] border-red-300",
                        delta < -10 && "text-[#085041] border-[#BFE6D6]",
                        Math.abs(delta) <= 10 && "text-muted-foreground",
                      )}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
