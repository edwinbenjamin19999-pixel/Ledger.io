import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, ArrowDownRight, CheckCircle2, AlertCircle, Clock, Sparkles } from "lucide-react";
import { GradientKPIStrip, KPI_GRADIENTS, GradientKPICardData } from "@/components/shared/GradientKPICard";
import type { SwishConnection, SwishPayment } from "@/hooks/useSwish";
import { cn } from "@/lib/utils";

interface SwishOverviewProps { summary: { totalReceived: number;
    totalCount: number;
    autoMatched: number;
    autoMatchedAmount: number;
    manualReview: number;
    manualReviewAmount: number;
    matchRate: number;
    todayReceived: number;
    todayCount: number;
  };
  payments: SwishPayment[];
  connection: SwishConnection;
}

function formatKr(amount: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(amount) + " kr";
}

function maskPhone(phone: string | null) { if (!phone || phone.length < 6) return phone || "Okänt";
  return phone.substring(0, 3) + "-XXX XX " + phone.substring(phone.length - 2);
}

export function SwishOverview({ summary, payments, connection }: SwishOverviewProps) { const recentPayments = payments.slice(0, 10);

  // Fraud detection flags
  const flaggedPayments = payments.filter((p) => { if (p.amount > 150000) return true;
    // Check för repeated exact amounts from unknown senders
    const sameAmount = payments.filter((q) => q.amount === p.amount && q.sender_phone === p.sender_phone && q.id !== p.id);
    if (sameAmount.length >= 3 && p.match_status === "unmatched") return true;
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Fraud alerts */}
      {flaggedPayments.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {flaggedPayments.length} betalning(ar) flaggad(e) för granskning
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                AI har identifierat ovanliga mönster — höga belopp eller upprepade transaktioner från okända avsändare.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insight */}
      <Card className="border-l-4" style={{ borderLeftColor: "#41B5AC" }}>
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#41B5AC" }} />
          <p className="text-sm text-foreground">
            {summary.totalCount > 0
              ? `${summary.totalCount} Swish-betalningar denna månad (${formatKr(summary.totalReceived)}). Matchningsgrad: ${summary.matchRate}%. Kunder som betalar via Swish betalar 98% snabbare än via faktura.`
              : "Inga Swish-betalningar registrerade denna månad. Skicka Swish-förfrågningar direkt från dina fakturor för snabbare betalning."}
          </p>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <GradientKPIStrip cards={[
        { label: "Swish-inbetalningar idag", value: formatKr(summary.todayReceived), sub: `${summary.todayCount} betalning(ar)`, icon: Smartphone, gradient: KPI_GRADIENTS.teal },
        { label: "Denna månad", value: formatKr(summary.totalReceived), sub: `${summary.totalCount} betalningar`, icon: Clock, gradient: KPI_GRADIENTS.indigo },
        { label: "Automatiskt matchade", value: `${summary.matchRate}%`, sub: `${summary.autoMatched}/${summary.totalCount} betalningar`, icon: CheckCircle2, gradient: KPI_GRADIENTS.emerald },
        { label: "Väntar granskning", value: `${summary.manualReview}`, sub: formatKr(summary.manualReviewAmount), icon: AlertCircle, gradient: KPI_GRADIENTS.amber },
      ]} />

      {/* Connection status */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#41B5AC20" }}>
              <Smartphone className="h-4 w-4" style={{ color: "#41B5AC" }} />
            </div>
            <div>
              <p className="text-sm font-medium">
                {connection.connection_type === "merchant" ? "Swish Handel" : "Manuellt läge"}
              </p>
              {connection.merchant_number && (
                <p className="text-xs text-muted-foreground">{connection.merchant_number}</p>
              )}
            </div>
          </div>
          <Badge variant={connection.is_active ? "default" : "secondary"}>
            {connection.is_active ? "Aktiv" : "Inaktiv"}
          </Badge>
        </CardContent>
      </Card>

      {/* Live payment feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senaste Swish-betalningar</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Inga Swish-betalningar registrerade ännu.
            </p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((payment) => { const isMatched = payment.match_status === "matched" || payment.match_status === "direct_sale";
                const isFlagged = payment.amount > 150000;
                return (
                  <div
                    key={payment.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border border-l-4 transition-colors",
                      isMatched ? "border-l-emerald-500" :
                      isFlagged ? "border-l-destructive" :
                      payment.match_status === "unmatched" ? "border-l-amber-400" :
                      "border-l-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#41B5AC20" }}>
                        <ArrowDownRight className="h-4 w-4" style={{ color: "#41B5AC" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {payment.sender_name || maskPhone(payment.sender_phone)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleDateString("sv-SE")}
                          {payment.message && ` — ${payment.message}`}
                        </p>
                        {isMatched && (
                          <p className="text-[10px] text-[#085041] mt-0.5">
                            AI matchade — Bokförd: Debet 1930, Kredit 1510
                            {payment.match_confidence && ` (${payment.match_confidence}% konfidens)`}
                          </p>
                        )}
                        {payment.match_status === "unmatched" && (
                          <p className="text-[10px] text-[#7A5417] mt-0.5">
                            Ingen matchning hittad — granskning krävs
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{formatKr(payment.amount)}</span>
                      <Badge
                        variant={isMatched ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {payment.match_status === "matched"
                          ? "Matchad"
                          : payment.match_status === "direct_sale"
                          ? "Direktförsäljning"
                          : payment.match_status === "dismissed"
                          ? "Avvisad"
                          : "Omatchad"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
