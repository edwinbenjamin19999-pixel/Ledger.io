import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lightbulb, ShieldCheck } from "lucide-react";
import type { RealismResult } from "@/lib/budget/realismEngine";
import { STATUS_STYLES, toneFromScore } from "@/lib/scenarios/statusStyles";

interface Props {
  realism: RealismResult;
  risks: string[];
  opportunities: string[];
  recommendation: string | null;
}

export function AIInsightsPanel({ realism, risks, opportunities, recommendation }: Props) {
  const realismScore = Math.max(0, 100 - realism.warnings.length * 18);
  const tone = toneFromScore(realismScore);

  return (
    <Card className="p-5 rounded-2xl space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Realism</h3>
          <Badge className={`${STATUS_STYLES[tone]} hover:${STATUS_STYLES[tone]}`}>
            {realismScore} / 100
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{realism.summary}</p>
        {realism.warnings.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {realism.warnings.slice(0, 3).map((w) => (
              <li key={w.id} className="flex items-start gap-1.5 text-xs">
                <AlertTriangle
                  className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                    w.severity === "critical" ? "text-destructive" : "text-warning"
                  }`}
                />
                <div>
                  <div className="text-foreground font-medium">{w.title}</div>
                  <div className="text-muted-foreground">{w.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive mb-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" /> Risker
        </h4>
        {risks.length > 0 ? (
          <ul className="space-y-1.5">
            {risks.map((r, i) => (
              <li key={i} className="text-xs text-foreground/80 leading-relaxed">• {r}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">Inga uppenbara risker identifierade.</p>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-success mb-2 flex items-center gap-1.5">
          <Lightbulb className="h-3 w-3" /> Möjligheter
        </h4>
        {opportunities.length > 0 ? (
          <ul className="space-y-1.5">
            {opportunities.map((o, i) => (
              <li key={i} className="text-xs text-foreground/80 leading-relaxed">• {o}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">—</p>
        )}
      </div>

      {recommendation && (
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Rekommendation
          </h4>
          <p className="text-xs text-foreground/80 leading-relaxed">{recommendation}</p>
        </div>
      )}
    </Card>
  );
}
