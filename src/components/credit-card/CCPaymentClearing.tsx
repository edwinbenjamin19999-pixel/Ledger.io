import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Banknote } from "lucide-react";
import { useState } from "react";

interface CCPaymentClearingProps {
  outstandingBalance: number;
  onClear: (amount: number, date: string) => void;
}

export function CCPaymentClearing({ outstandingBalance, onClear }: CCPaymentClearingProps) {
  const [amount, setAmount] = useState(outstandingBalance.toString());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (outstandingBalance <= 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-4 w-4" />
          Betala kortfaktura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border p-3 flex items-center justify-between text-sm">
          <div>
            <p className="font-medium">Debet: 2890</p>
            <p className="text-xs text-muted-foreground">Kreditkortsskuld</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-right">
            <p className="font-medium">Kredit: 1930</p>
            <p className="text-xs text-muted-foreground">Företagskonto</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Belopp</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Datum</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <Button className="w-full" onClick={() => onClear(parseFloat(amount) || 0, date)}>
          Bokför betalning
        </Button>
      </CardContent>
    </Card>
  );
}
