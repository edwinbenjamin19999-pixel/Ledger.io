import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useReconciliationQueue,
  useRunReconciliation,
  useApproveReconciliation,
} from "@/hooks/hospitality/useReconciliation";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { ArrowLeftRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtKr = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

export function ReconciliationQueue({ limit = 7 }: { limit?: number }) {
  const { data, isLoading } = useReconciliationQueue();
  const run = useRunReconciliation();
  const approve = useApproveReconciliation();

  const rows = (data ?? []).slice(0, limit);
  const unmatched = (data ?? []).filter((r: any) => r.status !== "matched").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Avstämning POS ↔ Bank
          </CardTitle>
          {unmatched > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{unmatched} dagar väntar på match</p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? "Kör…" : "Stäm av nu"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Inga avstämningar ännu — tryck "Stäm av nu"
          </p>
        ) : (
          rows.map((r: any) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center justify-between py-2 px-3 rounded-md border-l-4",
                r.status === "matched" && "border-l-emerald-500 bg-emerald-50/40",
                r.status === "partial" && "border-l-amber-500 bg-amber-50/40",
                r.status === "flagged" && "border-l-red-500 bg-red-50/40",
                r.status === "unmatched" && "border-l-slate-300",
              )}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {format(new Date(r.sale_date), "d MMM", { locale: sv })}
                </span>
                <span className="text-xs text-muted-foreground">
                  POS {fmtKr(Number(r.pos_total))} → Bank {fmtKr(Number(r.bank_matched_total))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {r.status === "matched" && (
                  <Badge variant="outline" className="text-[#085041] border-[#BFE6D6] text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                  </Badge>
                )}
                {r.status === "flagged" && (
                  <Badge variant="outline" className="text-[#7A1A1A] border-red-300 text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" /> {fmtKr(Number(r.diff_amount))}
                  </Badge>
                )}
                {(r.status === "partial" || r.status === "unmatched") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => approve.mutate(r.id)}
                  >
                    Godkänn
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
