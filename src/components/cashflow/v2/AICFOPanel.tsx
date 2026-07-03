import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Lightbulb, Sparkles, Bot } from "lucide-react";
import type { ActionableInsight } from "@/lib/cashflow/types";
import type { CashFlowAlert } from "@/hooks/useCashFlow";
import type { AutoRule, AutoRuleKey } from "@/lib/cashflow/rules";
import { ruleLabel, ruleUnit } from "@/lib/cashflow/rules";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

interface Props {
  narrative: string;
  alerts: CashFlowAlert[];
  insights: ActionableInsight[];
  rules: AutoRule[];
  onToggleRule: (key: AutoRuleKey, enabled: boolean) => void;
  onExecuteAction: (insight: ActionableInsight) => void;
}

export function AICFOPanel({
  narrative,
  alerts,
  insights,
  rules,
  onToggleRule,
  onExecuteAction,
}: Props) {
  const top3 = insights.slice(0, 3);
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-gradient-to-br from-[#3b82f6]/10 to-transparent border-[#C8DDF5]">
        <div className="flex items-start gap-2">
          <Bot className="h-5 w-5 text-[#3b82f6] mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight">AI CFO</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Förklarar, varnar och kan agera åt dig
            </p>
          </div>
        </div>
      </Card>

      {/* Förklaring */}
      <Card className="p-4">
        <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Förklaring</h4>
        <p className="text-xs leading-relaxed text-foreground/80">{narrative}</p>
      </Card>

      {/* Risker */}
      <Card className="p-4">
        <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-[#7A5417]" /> Risker
        </h4>
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Inga akuta risker upptäckta.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.slice(0, 4).map((a) => (
              <li key={a.id} className="text-xs">
                <div className="font-medium">{a.title}</div>
                <div className="text-muted-foreground">{a.description}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Möjligheter */}
      <Card className="p-4">
        <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <Lightbulb className="h-3 w-3 text-[#085041]" /> Möjligheter
        </h4>
        {insights.length === 0 ? (
          <p className="text-xs text-muted-foreground">Inga öppna möjligheter just nu.</p>
        ) : (
          <ul className="space-y-2">
            {insights.slice(0, 3).map((i) => (
              <li key={i.id} className="text-xs">
                <div className="font-medium">{i.title}</div>
                <div className="text-muted-foreground">
                  Potential: {fmt(i.impactSek)} kr · {Math.round(i.confidence * 100)}% säkerhet
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Topp 3 åtgärder */}
      <Card className="p-4">
        <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#3b82f6]" /> Topp 3 åtgärder
        </h4>
        {top3.length === 0 ? (
          <p className="text-xs text-muted-foreground">Inga föreslagna åtgärder.</p>
        ) : (
          <div className="space-y-2">
            {top3.map((insight) => {
              const riskColor =
                insight.riskLevel === "high"
                  ? "text-[#7A1A1A] bg-[#FCE8E8]"
                  : insight.riskLevel === "medium"
                    ? "text-[#7A5417] bg-[#FAEEDA]"
                    : "text-[#085041] bg-[#E1F5EE]";
              return (
                <div key={insight.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold">{insight.title}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${riskColor}`}>
                      {insight.riskLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">+{fmt(insight.impactSek)} kr</span>
                    <span>·</span>
                    <span>{Math.round(insight.confidence * 100)}%</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-[#3b82f6] hover:bg-[#3b82f6] text-white"
                    onClick={() => onExecuteAction(insight)}
                  >
                    Granska & utför
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Auto-mode rules */}
      <Card className="p-4">
        <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">
          Auto-läge
        </h4>
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.key} className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{ruleLabel(r.key)}</div>
                <div className="text-[10px] text-muted-foreground">
                  Tröskel: {fmt(r.threshold)} {ruleUnit(r.key) === "sek" ? "kr" : "dagar"}
                </div>
              </div>
              <Switch checked={r.enabled} onCheckedChange={(v) => onToggleRule(r.key, v)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
