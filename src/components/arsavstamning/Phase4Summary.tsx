import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { ProcessedReceipt, Deduction } from "@/pages/ArsavstamningPage";

function formatKr(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
}

interface Phase4Props { year: number;
  receipts: ProcessedReceipt[];
  deductions: Deduction[];
  onNext: () => void;
  onBack: () => void;
}

export function Phase4Summary({ year, receipts, deductions, onNext, onBack }: Phase4Props) { const totalExpenses = receipts.reduce((s, r) => s + r.amount, 0);
  // Simulated income
  const totalIncome = Math.round(totalExpenses * (2 + Math.random() * 2));
  const surplus = totalIncome - totalExpenses;
  const acceptedDeductions = deductions.filter((d) => d.accepted).reduce((s, d) => s + d.amount, 0);
  const taxImpact = deductions.filter((d) => d.accepted).reduce((s, d) => s + d.taxImpact, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Din årssammanfattning {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted/50 p-6 space-y-3">
            <SummaryRow label={`Du tjänade`} value={formatKr(totalIncome)} />
            <SummaryRow label={`Du hade kostnader på`} value={formatKr(totalExpenses)} negative />
            <div className="border-t pt-3">
              <SummaryRow
                label="Ditt överskott"
                value={formatKr(surplus)}
                bold
                positive={surplus > 0}
              />
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">Avdrag som minskar din skatt</p>
            <SummaryRow label="Godkända avdrag" value={formatKr(acceptedDeductions)} />
            <SummaryRow label="Skatteeffekt" value={`~${formatKr(taxImpact)}`} positive />
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <p className="text-sm leading-relaxed">
              Du tjänade <span className="font-semibold">{formatKr(totalIncome)}</span>.
              Du hade <span className="font-semibold">{formatKr(totalExpenses)}</span> i kostnader.
              Ditt överskott är <span className="font-semibold">{formatKr(surplus)}</span>.
              {taxImpact > 0 && (
                <> Tack vare avdragen sparar du uppskattningsvis <span className="font-semibold">{formatKr(taxImpact)}</span> i skatt.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>
        <Button onClick={onNext}>
          Exportera
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label,
  value,
  bold,
  positive,
  negative,
}: { label: string;
  value: string;
  bold?: boolean;
  positive?: boolean;
  negative?: boolean;
}) { return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold text-lg" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span
        className={ positive
            ? "text-[#085041] dark:text-[#1D9E75]"
            : negative
            ? "text-destructive"
            : ""
        }
      >
        {negative ? "-" : ""}
        {value}
      </span>
    </div>
  );
}
