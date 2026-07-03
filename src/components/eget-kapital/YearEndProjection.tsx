import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

function formatKr(amount: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(amount) + " kr";
}

interface YearEndProjectionProps { data: { ytdIncome: number;
    ytdExpenses: number;
    ytdProfit: number;
    taxReserve: { estimatedFinalTax: number;
      fSkattCoverage: number;
      fSkatt: number;
    };
  };
}

export function YearEndProjection({ data }: YearEndProjectionProps) { const currentMonth = new Date().getMonth() + 1;
  const projectedIncome = Math.round(data.ytdIncome * (12 / Math.max(currentMonth, 1)));
  const projectedExpenses = Math.round(data.ytdExpenses * (12 / Math.max(currentMonth, 1)));
  const projectedProfit = projectedIncome - projectedExpenses;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Prognos vid årsskiftet</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-muted/50 p-4 space-y-1">
          <p className="text-sm text-foreground leading-relaxed">
            Baserat på årets intäkter hittills: din skattepliktiga inkomst kommer att bli ca{" "}
            <span className="font-semibold">{formatKr(projectedProfit)}</span>.
            Estimerad slutlig skatt: ~<span className="font-semibold">{formatKr(data.taxReserve.estimatedFinalTax)}</span>.
            Din F-skatt täcker ~{data.taxReserve.fSkattCoverage}% av detta.
          </p>
          {data.taxReserve.fSkattCoverage < 90 && (
            <p className="text-sm text-[#7A5417] dark:text-[#C28A2B] mt-2">
              Du kan behöva jämka din F-skatt uppåt eller lägga undan mer i buffert.
            </p>
          )}
          {data.taxReserve.fSkattCoverage > 110 && (
            <p className="text-sm text-[#085041] dark:text-[#1D9E75] mt-2">
              Din F-skatt täcker mer än beräknat. Du kan överväga att jämka ner eller ta ut mer.
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Projicerade intäkter</p>
            <p className="text-lg font-semibold">{formatKr(projectedIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Projicerade kostnader</p>
            <p className="text-lg font-semibold">{formatKr(projectedExpenses)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Projicerat resultat</p>
            <p className="text-lg font-semibold">{formatKr(projectedProfit)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
