import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import {
  usePaymentReconciliation,
  useConfirmReconciliation,
  type BankTxCandidate,
} from "@/hooks/usePaymentReconciliation";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface Props { companyId: string | null }

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PaymentReconciliationCard({ companyId }: Props) {
  const { data = [], isLoading, refetch, isFetching } = usePaymentReconciliation(companyId);
  const confirm = useConfirmReconciliation();
  const [selected, setSelected] = useState<Record<string, string>>({});

  if (!companyId) return null;

  const matchableCount = data.filter((p) => p.candidates.length > 0 && p.status !== "paid").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Bankavstämning av betalningar
            </CardTitle>
            <CardDescription>
              Matcha exporterade betalningsförslag mot dina bankhändelser. Belopp ±0,50 kr, datum ±5 dagar.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{matchableCount} att matcha</Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Uppdatera
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Laddar…
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Inga betalningsförslag väntar på avstämning.
          </div>
        )}
        {data.map((p) => {
          const sel = selected[p.id];
          const isPaid = p.status === "paid" && p.reconciliation_status === "matched";
          return (
            <div key={p.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-medium">
                    Betalning {format(parseISO(p.payment_date), "d MMM yyyy", { locale: sv })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.invoice_count} fakturor · {fmt(Number(p.total_amount))} SEK
                  </div>
                </div>
                <PaymentStatusBadge status={p.status} />
              </div>

              {isPaid ? (
                <div className="flex items-center gap-2 text-sm text-[#085041]">
                  <CheckCircle2 className="h-4 w-4" /> Avstämd mot bank
                </div>
              ) : p.candidates.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Inga matchande banktransaktioner hittades ännu.
                </div>
              ) : (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    {p.candidates.map((tx: BankTxCandidate) => (
                      <label
                        key={tx.id}
                        className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer text-sm ${
                          sel === tx.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          className="h-4 w-4"
                          name={`prop-${p.id}`}
                          checked={sel === tx.id}
                          onChange={() => setSelected((s) => ({ ...s, [p.id]: tx.id }))}
                        />
                        <span className="w-24 tabular-nums">
                          {format(parseISO(tx.booking_date), "d MMM", { locale: sv })}
                        </span>
                        <span className="flex-1 truncate">
                          {tx.counterparty_name || tx.description || "—"}
                        </span>
                        <span className="tabular-nums font-medium">{fmt(Number(tx.amount))}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!sel || confirm.isPending}
                      onClick={() =>
                        sel &&
                        confirm.mutate(
                          { proposalId: p.id, bankTxId: sel, companyId: companyId! },
                          { onSuccess: () => setSelected((s) => ({ ...s, [p.id]: "" })) },
                        )
                      }
                    >
                      {confirm.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Bekräfta avstämning
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
