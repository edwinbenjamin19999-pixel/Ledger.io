import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateOwnerWithdrawal } from "@/hooks/useOwnerWithdrawals";

function formatKr(amount: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(amount) + " kr";
}

interface WithdrawalRecommendationProps {
  data: {
    recommendedWithdrawal: number;
    cashBalance: number;
    momsReserve: number;
    fSkattReserve: number;
    bufferPercent: number;
    bufferAmount: number;
    healthStatus: "healthy" | "tight" | "warning";
  };
}

export function WithdrawalRecommendation({ data }: WithdrawalRecommendationProps) {
  const mutation = useCreateOwnerWithdrawal();

  const statusColors = {
    healthy: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-[#BFE6D6] dark:border-emerald-800",
    tight: "from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-[#F0DDB7] dark:border-amber-800",
    warning: "from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-[#F4C8C8] dark:border-red-800",
  };

  const numberColors = {
    healthy: "text-[#085041] dark:text-[#1D9E75]",
    tight: "text-[#7A5417] dark:text-[#C28A2B]",
    warning: "text-[#7A1A1A] dark:text-[#C73838]",
  };

  async function handleWithdraw() {
    const today = new Date().toISOString().slice(0, 10);
    mutation.mutate(
      {
        amount: data.recommendedWithdrawal,
        date: today,
        description: `Eget uttag ${today}`,
        type: 'withdrawal',
      },
      {
        onSuccess: () => {
          toast.success("Uttag bokfört", {
            description: `${formatKr(data.recommendedWithdrawal)} bokfördes mot konto 2018/1930.`,
          });
        },
      }
    );
  }

  return (
    <Card className={`bg-gradient-to-br ${statusColors[data.healthStatus]} border`}>
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Rekommenderat uttag denna månad
          </p>
          <p className={`text-5xl font-bold tracking-tight ${numberColors[data.healthStatus]}`}>
            {formatKr(data.recommendedWithdrawal)}
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Baserat på din likviditet och kommande skatteinbetalningar
          </p>

          <Button
            size="lg"
            className="mt-4"
            onClick={handleWithdraw}
            disabled={data.recommendedWithdrawal <= 0 || mutation.isPending}
          >
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Bokför...</>
            ) : (
              <>Ta ut detta belopp<ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>

        {/* Breakdown */}
        <div className="mt-8 max-w-sm mx-auto space-y-2">
          <BreakdownRow label="Kassa just nu" amount={data.cashBalance} />
          <BreakdownRow label="Reserverat för moms (26:e)" amount={-data.momsReserve} negative />
          <BreakdownRow label="Reserverat för F-skatt (12:e)" amount={-data.fSkattReserve} negative />
          <BreakdownRow
            label={`Buffert för oförutsedda utgifter (${data.bufferPercent}%)`}
            amount={-data.bufferAmount}
            negative
          />
          <div className="border-t pt-2 mt-2">
            <BreakdownRow
              label="Tillgängligt för uttag"
              amount={data.recommendedWithdrawal}
              bold
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ label, amount, negative, bold }: {
  label: string; amount: number; negative?: boolean; bold?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={negative ? "text-destructive" : ""}>
        {amount < 0 ? "-" : ""}
        {formatKr(Math.abs(amount))}
      </span>
    </div>
  );
}
