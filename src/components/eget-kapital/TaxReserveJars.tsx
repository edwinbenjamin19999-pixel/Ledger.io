import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatKr(amount: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(amount) + " kr";
}

interface TaxReserveJarsProps { taxReserve: { fSkatt: number;
    fSkattMonthly: number;
    momsNextPeriod: number;
    estimatedFinalTax: number;
    fSkattCoverage: number;
  };
}

function Jar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) { const fillPercent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const jarHeight = 120;
  const fillHeight = (fillPercent / 100) * (jarHeight - 20);

  return (
    <div className="flex flex-col items-center space-y-3">
      <svg width="80" height={jarHeight} viewBox={`0 0 80 ${jarHeight}`} className="drop-shadow-sm">
        {/* Jar body */}
        <rect x="10" y="15" width="60" height={jarHeight - 20} rx="8" ry="8"
          className="fill-muted stroke-border" strokeWidth="1.5" />
        {/* Fill */}
        <rect
          x="12" y={jarHeight - 7 - fillHeight} width="56" height={fillHeight} rx="6" ry="6"
          fill={color} opacity="0.7"
        >
          <animate
            attributeName="height"
            from="0"
            to={fillHeight}
            dur="1s"
            fill="freeze"
          />
          <animate
            attributeName="y"
            from={jarHeight - 7}
            to={jarHeight - 7 - fillHeight}
            dur="1s"
            fill="freeze"
          />
        </rect>
        {/* Jar rim */}
        <rect x="15" y="8" width="50" height="12" rx="4" ry="4"
          className="fill-muted stroke-border" strokeWidth="1.5" />
        {/* Percentage label */}
        <text x="40" y={jarHeight / 2 + 8} textAnchor="middle"
          className="fill-foreground text-sm font-bold" fontSize="14">
          {fillPercent}%
        </text>
      </svg>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{formatKr(current)}</p>
      </div>
    </div>
  );
}

export function TaxReserveJars({ taxReserve }: TaxReserveJarsProps) { // Buffer jar: 3 months of estimated expenses as target
  const bufferTarget = taxReserve.fSkattMonthly * 3;
  const bufferCurrent = Math.max(0, taxReserve.fSkatt * 0.3); // rough buffer estimate

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skattereserver</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6 justify-items-center">
          <Jar
            label="F-skatt"
            current={taxReserve.fSkatt}
            target={taxReserve.estimatedFinalTax}
            color="hsl(var(--primary))"
          />
          <Jar
            label="Moms"
            current={taxReserve.momsNextPeriod}
            target={taxReserve.momsNextPeriod}
            color="hsl(210, 70%, 55%)"
          />
          <Jar
            label="Buffert"
            current={bufferCurrent}
            target={bufferTarget}
            color="hsl(150, 50%, 50%)"
          />
        </div>

        <div className="mt-6 space-y-2 max-w-md mx-auto">
          <DetailRow
            label="Din preliminärskattesedel (F-skatt)"
            value={`${formatKr(taxReserve.fSkattMonthly)}/månad`}
          />
          <DetailRow
            label="Moms att betala nästa period"
            value={formatKr(taxReserve.momsNextPeriod)}
          />
          <DetailRow
            label="Estimerad slutlig skatt"
            value={formatKr(taxReserve.estimatedFinalTax)}
          />
          <DetailRow
            label="F-skatten täcker"
            value={`~${taxReserve.fSkattCoverage}% av slutlig skatt`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) { return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
