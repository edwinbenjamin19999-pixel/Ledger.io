import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, FileText, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateOwnerWithdrawal } from "@/hooks/useOwnerWithdrawals";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

const FORENKLING_2026 = 209550;

export function DividendExecution() {
  const [amount, setAmount] = useState(FORENKLING_2026);
  const [executed, setExecuted] = useState(false);
  const mutation = useCreateOwnerWithdrawal();

  const taxWithin = Math.round(Math.min(amount, FORENKLING_2026) * 0.20);
  const taxAbove = Math.round(Math.max(0, amount - FORENKLING_2026) * 0.375);
  const totalTax = taxWithin + taxAbove;
  const netPayout = amount - totalTax;
  const needsHigherTax = amount > FORENKLING_2026;

  const handleExecute = () => {
    const today = new Date().toISOString().slice(0, 10);
    mutation.mutate(
      {
        amount,
        date: today,
        description: `Utdelning ${fmt(amount)} kr — beslut ${today}`,
        type: 'dividend',
      },
      {
        onSuccess: () => {
          setExecuted(true);
          toast.success("Utdelning bokförd", {
            description: `${fmt(amount)} kr bokfördes mot konto 2098/1930.`,
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ta utdelning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Utdelningsbelopp</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(Number(e.target.value)); setExecuted(false); }}
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <Row label="Utdelning" value={fmt(amount) + " kr"} />
            <Row label="Skatt 20% (inom gränsbelopp)" value={"-" + fmt(taxWithin) + " kr"} />
            {needsHigherTax && (
              <Row label="Skatt ~37,5% (över gränsbelopp)" value={"-" + fmt(taxAbove) + " kr"} warning />
            )}
            <div className="border-t pt-2">
              <Row label="Netto till dig" value={fmt(netPayout) + " kr"} bold />
            </div>
          </div>

          {needsHigherTax && (
            <div className="rounded-lg border border-[#F0DDB7] dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0 mt-0.5" />
              <p className="text-sm text-[#7A5417] dark:text-amber-300">
                {fmt(amount - FORENKLING_2026)} kr överstiger gränsbeloppet och beskattas som inkomst av tjänst (ca 37,5%).
                Överväg att minska beloppet till {fmt(FORENKLING_2026)} kr.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!executed ? (
        <Button size="lg" className="w-full" onClick={handleExecute} disabled={mutation.isPending || amount <= 0}>
          {mutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Bokför utdelning...</>
          ) : (
            <>Ta utdelning: {fmt(amount)} kr<ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          <Card className="border-[#BFE6D6] dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center gap-2 text-[#085041] dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">Utdelning bokförd</p>
              </div>

              <div className="space-y-2 text-sm">
                <StepItem done label="Bokföringsorder skapad" sub="Debet 2098 (Utdelning), Kredit 1930 (Bank)" />
                <StepItem done label="Verifikation godkänd" sub="Bokförd i huvudboken" />
                <StepItem done label="Skatteavdrag beräknat" sub={`Preliminärskatt ${fmt(totalTax)} kr på utdelningen`} />
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium">Nästa steg:</p>
                <p className="text-sm text-muted-foreground">
                  Redovisa utdelningen på KU31 och skicka till Skatteverket.
                  K10-bilagan ska bifogas din privata deklaration senast 2 maj.
                </p>
              </div>

              <div className="flex gap-2">
                <ComingSoonButton tooltipText="Stämmoprotokoll PDF lanseras snart">Stämmoprotokoll PDF</ComingSoonButton>
                <ComingSoonButton tooltipText="KU31-underlag lanseras snart">KU31-underlag</ComingSoonButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, warning }: { label: string; value: string; bold?: boolean; warning?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={warning ? "text-[#7A5417] dark:text-[#C28A2B]" : ""}>{value}</span>
    </div>
  );
}

function StepItem({ done, label, sub }: { done: boolean; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${done ? "text-[#085041]" : "text-muted-foreground"}`} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
