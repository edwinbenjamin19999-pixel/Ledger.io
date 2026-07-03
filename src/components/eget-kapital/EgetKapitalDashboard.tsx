import { useEgetKapital } from "@/hooks/useEgetKapital";
import { WithdrawalRecommendation } from "./WithdrawalRecommendation";
import { WithdrawalHistory } from "./WithdrawalHistory";
import { TaxReserveJars } from "./TaxReserveJars";
import { YearEndProjection } from "./YearEndProjection";
import { WithdrawalExplainer } from "./WithdrawalExplainer";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export function EgetKapitalDashboard() { const data = useEgetKapital();

  if (data.loading) return <LoadingSpinner />;

  if (data.cashBalance === 0 && data.ytdIncome === 0 && data.ytdExpenses === 0) { return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Wallet className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">Ingen data att visa</p>
          <p className="text-sm mt-1">
            Välj ett företag och bokför transaktioner för att se eget kapital och uttagsrekommendationer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <WithdrawalRecommendation data={data} />
      <TaxReserveJars taxReserve={data.taxReserve} />
      <YearEndProjection data={data} />
      <WithdrawalHistory
        withdrawals={data.withdrawalsThisYear}
        totalThisYear={data.totalWithdrawnThisYear}
        totalLastYear={data.totalWithdrawnLastYear}
      />
      <WithdrawalExplainer monthlyExpenses={data.monthlyAvgExpenses} />
    </div>
  );
}
