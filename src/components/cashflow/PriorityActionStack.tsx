import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Loader2, Sparkles, AlertTriangle, TrendingDown, Users } from "lucide-react";
import type { ActionableInsight, InsightAction } from "@/lib/cashflow/types";
import { useCashflowAction } from "@/hooks/useCashflowAction";
import { InvoiceQuickList } from "./InvoiceQuickList";

interface Props {
  insights: ActionableInsight[];
  companyId: string;
  arInvoices: any[];
  apInvoices: any[];
  onRefresh?: () => void;
}

const riskGradient: Record<string, string> = {
  high: "border-l-rose-500 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent",
  medium: "border-l-amber-500 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent",
  low: "border-l-emerald-500 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent",
};
const riskAccent: Record<string, string> = {
  high: "text-[#7A1A1A]",
  medium: "text-[#7A5417]",
  low: "text-[#085041]",
};

const kindIcon = {
  ar_overdue: <Users className="w-4 h-4" />,
  ap_pressure: <TrendingDown className="w-4 h-4" />,
  runway_low: <AlertTriangle className="w-4 h-4" />,
  concentration: <Sparkles className="w-4 h-4" />,
};

const riskBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "outline",
  high: "destructive",
};

export function PriorityActionStack({ insights, companyId, arInvoices, apInvoices, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { invoke, pending } = useCashflowAction();

  if (insights.length === 0) {
    return (
      <Card className="p-6 text-center bg-gradient-to-br from-emerald-50 to-transparent border-[#BFE6D6]">
        <Sparkles className="w-6 h-6 text-[#085041] mx-auto mb-2" />
        <h3 className="font-semibold text-sm">Inga akuta åtgärder</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Kassaflödet är under kontroll — AI bevakar utvecklingen.
        </p>
      </Card>
    );
  }

  const top = insights.slice(0, 3);

  const handleAction = async (insight: ActionableInsight, action: InsightAction) => {
    const result = await invoke(action, {
      companyId,
      insightId: insight.id,
      insightKind: insight.kind,
    });
    if (result.ok) onRefresh?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Topprioriteringar idag</h2>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{insights.length}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {top.map((insight) => {
          const isOpen = expanded === insight.id;
          const ids = insight.kind === "ar_overdue" ? insight.invoiceIds : insight.invoiceIds;
          const invoiceList = insight.kind === "ar_overdue" ? arInvoices : apInvoices;
          const relevantInvoices = invoiceList.filter((i) => ids.includes(i.id));
          const grad = riskGradient[insight.riskLevel] ?? riskGradient.low;
          const accent = riskAccent[insight.riskLevel] ?? riskAccent.low;

          return (
            <Card
              key={insight.id}
              className={`p-5 min-h-[180px] rounded-2xl border-l-[4px] ${grad} transition-all hover:shadow-md flex flex-col`}
            >
              <div className="flex items-start gap-2.5 mb-3">
                <div className={`p-2 rounded-lg bg-background/80 backdrop-blur shrink-0 ${accent}`}>
                  {kindIcon[insight.kind]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-semibold leading-tight">{insight.title}</h3>
                    <Badge variant={riskBadgeVariant[insight.riskLevel]} className="text-[9px] px-1 py-0 h-4 uppercase">
                      {insight.riskLevel}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    {insight.description}
                  </p>
                </div>
              </div>

              {insight.impactSek > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Financial impact</div>
                  <div className={`text-3xl font-bold tabular-nums ${accent} leading-none mt-0.5`}>
                    {Math.round(insight.impactSek).toLocaleString("sv-SE")}
                    <span className="text-sm font-medium text-muted-foreground ml-1">kr</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 mt-auto">
                {insight.actions.slice(0, 2).map((action) => {
                  const key = `${insight.id}:${action.type}`;
                  const isPending = pending === key;
                  return (
                    <Button
                      key={action.type}
                      size="sm"
                      variant={action.variant ?? "default"}
                      className="h-7 text-xs justify-start"
                      disabled={isPending}
                      onClick={() => handleAction(insight, action)}
                    >
                      {isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {action.label}
                    </Button>
                  );
                })}
                {insight.invoiceIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] justify-start text-muted-foreground"
                    onClick={() => setExpanded(isOpen ? null : insight.id)}
                  >
                    {isOpen ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                    {isOpen ? "Dölj fakturor" : `Visa ${Math.min(5, relevantInvoices.length)} fakturor`}
                  </Button>
                )}
              </div>

              {isOpen && relevantInvoices.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <InvoiceQuickList
                    invoices={relevantInvoices.slice(0, 5)}
                    kind={insight.kind === "ar_overdue" ? "ar" : "ap"}
                    companyId={companyId}
                    onAction={onRefresh}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
