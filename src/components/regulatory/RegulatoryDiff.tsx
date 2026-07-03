import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DiffItem { field: string;
  oldValue: string;
  newValue: string;
  changeDescription: string;
  effectiveDate: string;
  changePct?: number;
}

interface Props { diffs: DiffItem[];
}

export function RegulatoryDiff({ diffs }: Props) { if (diffs.length === 0) return null;

  return (
    <div className="space-y-2">
      {diffs.map((diff, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs font-medium text-foreground mb-2">{diff.field}</p>
            <div className="flex items-center gap-3 mb-2">
              <span
                className="px-2 py-1 rounded text-sm font-mono line-through bg-[#FCE8E8] text-[#7A1A1A] dark:bg-rose-900/30 dark:text-rose-300"
              >
                {diff.oldValue}
              </span>
              <span className="text-muted-foreground text-xs">&#8594;</span>
              <span
                className="px-2 py-1 rounded text-sm font-mono font-medium bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                {diff.newValue}
              </span>
              {diff.changePct !== undefined && (
                <Badge variant="outline" className="text-[10px]">
                  {diff.changePct > 0 ? "+" : ""}{diff.changePct}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{diff.changeDescription}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Trader i kraft: {diff.effectiveDate}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
