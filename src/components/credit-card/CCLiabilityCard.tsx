import { Card } from "@/components/ui/card";
import { CreditCard, Calendar, TrendingDown } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";

interface CCLiabilityCardProps {
  totalLiability: number;
  statementBalance?: number;
  dueDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  txnCount?: number;
}

export function CCLiabilityCard({
  totalLiability,
  statementBalance,
  dueDate,
  periodStart,
  periodEnd,
  txnCount = 0,
}: CCLiabilityCardProps) {
  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })
    : "—";

  return (
    <Card className="rounded-2xl border-l-[3px] border-l-[#3b82f6] p-6 bg-white">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <CreditCard className="h-4 w-4 text-[#3b82f6]" />
            Total kreditkortsskuld (konto 2890)
          </div>
          <div className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
            {formatSEK(totalLiability)}
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
            Påverkar likviditet på betalningsdatum, inte vid köp
          </p>
        </div>

        {(statementBalance != null || dueDate) && (
          <div className="border-l pl-6 min-w-[200px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              Aktuell utdragsperiod
            </div>
            {statementBalance != null && (
              <div className="text-2xl font-semibold tabular-nums text-slate-900">
                {formatSEK(statementBalance)}
              </div>
            )}
            {periodStart && periodEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                {periodStart} → {periodEnd} · {txnCount} transaktioner
              </p>
            )}
            {dueDate && (
              <p className="text-xs text-[#7A5417] mt-2 font-medium">
                Förfaller {formattedDue}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
