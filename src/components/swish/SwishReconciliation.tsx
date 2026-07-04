import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Smartphone, ChevronDown, FileText, DollarSign, XCircle } from "lucide-react";
import type { SwishPayment } from "@/hooks/useSwish";

interface SwishReconciliationProps { unmatchedPayments: SwishPayment[];
  onMatch: (paymentId: string, invoiceId: string) => Promise<void>;
  onDirectSale: (paymentId: string) => Promise<void>;
  onDismiss: (paymentId: string) => Promise<void>;
}

function formatKr(amount: number) { return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(amount);
}

function maskPhone(phone: string | null) { if (!phone || phone.length < 6) return phone || "Okänt";
  return phone.substring(0, 3) + "-XXX XX " + phone.substring(phone.length - 2);
}

export function SwishReconciliation({ unmatchedPayments, onMatch, onDirectSale, onDismiss }: SwishReconciliationProps) { if (unmatchedPayments.length === 0) { return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "#41B5AC20" }}>
            <Smartphone className="h-6 w-6" style={{ color: "#41B5AC" }} />
          </div>
          <h3 className="text-lg font-medium text-foreground">Alla Swish-betalningar är avstämda</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Det finns inga omatchade betalningar som kräver granskning.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalUnmatched = unmatchedPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <Card className="border-[#F0DDB7] bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
        <CardContent className="p-4">
          <p className="text-sm">
            <span className="font-medium text-[#7A5417] dark:text-amber-300">
              {unmatchedPayments.length} oidentifierade Swish-betalningar
            </span>{" "}
            <span className="text-[#7A5417] dark:text-[#C28A2B]">
              totalt {formatKr(totalUnmatched)} kräver manuell granskning.
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {unmatchedPayments.map((payment) => (
          <Card key={payment.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{formatKr(payment.amount)}</span>
                    <Badge variant="secondary" className="text-xs">Omatchad</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Från: {payment.sender_name || maskPhone(payment.sender_phone)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Datum: {new Date(payment.payment_date).toLocaleDateString("sv-SE")}
                  </p>
                  {payment.message && (
                    <p className="text-sm text-muted-foreground">Meddelande: {payment.message}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Koppla till faktura
                        <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-muted-foreground text-xs">
                        Fakturamatchning laddas från din kundreskontra
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" size="sm" onClick={() => onDirectSale(payment.id)}>
                    <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                    Ny intäkt
                  </Button>

                  <Button variant="ghost" size="sm" onClick={() => onDismiss(payment.id)}>
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Ignorera
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
