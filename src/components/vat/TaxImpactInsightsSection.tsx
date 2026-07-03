import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, AlertCircle, Receipt, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { useSystemInsights } from "@/lib/system/insightBus";

interface TaxImpactInsightsSectionProps {
  vatPayable?: number;
  totalSales?: number;
  inputVat?: number;
  previousInputVat?: number | null;
}

interface DerivedInsight {
  id: string;
  title: string;
  explanation: string;
  impact: number;
  icon: typeof TrendingUp;
  tone: "info" | "warning" | "alert";
}

function deriveTaxImpactInsights(p: TaxImpactInsightsSectionProps): DerivedInsight[] {
  const out: DerivedInsight[] = [];
  const sales = p.totalSales ?? 0;
  const input = p.inputVat ?? 0;

  if (sales > 0 && input < sales * 0.03) {
    out.push({
      id: "low_input",
      title: "Låg avdragsgill ingående moms",
      explanation: "Kan tyda på saknade kostnadsverifikationer — vilket höjer skattepliktigt resultat.",
      impact: Math.round(sales * 0.05),
      icon: Receipt,
      tone: "warning",
    });
  }

  if (p.previousInputVat && Math.abs((sales - p.previousInputVat * 7) / Math.max(1, p.previousInputVat * 7)) > 0.4 && sales > 0) {
    // Heuristic only — wider scenario
  }

  if (sales > 500000) {
    out.push({
      id: "revenue_spike",
      title: "Kraftig intäktsökning",
      explanation: "Hög omsättning denna period kan leda till högre bolagsskatt och preliminärskatt.",
      impact: Math.round(sales * 0.206),
      icon: TrendingUp,
      tone: "info",
    });
  }

  if ((p.vatPayable ?? 0) > 100000) {
    out.push({
      id: "liquidity_impact",
      title: "Likviditetspåverkan från moms",
      explanation: "Stor momsskuld förfaller — säkerställ likviditet före betalningsdatum.",
      impact: p.vatPayable ?? 0,
      icon: Coins,
      tone: "alert",
    });
  }

  return out;
}

const TONE_STYLES = {
  info: { bg: "from-blue-50 to-blue-50/30 dark:from-blue-950/30 dark:to-transparent", border: "border-[#C8DDF5] dark:border-[#3b82f6]/50", icon: "text-[#1E3A5F] dark:text-[#1E3A5F]", iconBg: "bg-[#EFF6FF] dark:bg-blue-950/50" },
  warning: { bg: "from-amber-50 to-amber-50/30 dark:from-amber-950/30 dark:to-transparent", border: "border-[#F0DDB7] dark:border-amber-900/50", icon: "text-[#7A5417] dark:text-[#C28A2B]", iconBg: "bg-[#FAEEDA] dark:bg-amber-950/50" },
  alert: { bg: "from-rose-50 to-rose-50/30 dark:from-rose-950/30 dark:to-transparent", border: "border-[#F4C8C8] dark:border-rose-900/50", icon: "text-[#C73838] dark:text-[#C73838]", iconBg: "bg-[#FCE8E8] dark:bg-rose-950/50" },
};

export function TaxImpactInsightsSection(props: TaxImpactInsightsSectionProps) {
  const navigate = useNavigate();
  // Pull cross-module signals scoped to vat→tax
  const { insights: systemInsights } = useSystemInsights({ module: "tax" });
  const vatScopedInsights = systemInsights.filter((i) => i.scope?.includes("vat") && i.scope?.includes("tax"));

  const derived = deriveTaxImpactInsights(props);

  if (derived.length === 0 && vatScopedInsights.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C28A2B] to-[#C28A2B] flex items-center justify-center shadow-sm">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Skattepåverkan</h3>
            <p className="text-xs text-muted-foreground">Tidiga signaler från momsdeklarationen — innan skatteberäkning</p>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {derived.map((ins) => {
          const t = TONE_STYLES[ins.tone];
          const Icon = ins.icon;
          return (
            <div key={ins.id} className={cn("rounded-xl border p-4 bg-gradient-to-br", t.bg, t.border)}>
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", t.iconBg)}>
                  <Icon className={cn("w-4 h-4", t.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">{ins.title}</h4>
                  <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{ins.explanation}</p>
                  {ins.impact !== 0 && (
                    <div className={cn("mt-2 text-xs font-mono tabular-nums font-semibold", t.icon)}>
                      ~{formatSEK(Math.abs(ins.impact))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 mt-2 -ml-2"
                    onClick={() => navigate(`/tax-calculation?focus=${ins.id}`)}
                  >
                    Granska i skattemodulen <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {vatScopedInsights.slice(0, 4).map((ins) => (
          <div key={ins.id} className={cn("rounded-xl border p-4 bg-gradient-to-br", TONE_STYLES.info.bg, TONE_STYLES.info.border)}>
            <div className="flex items-start gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", TONE_STYLES.info.iconBg)}>
                <AlertCircle className={cn("w-4 h-4", TONE_STYLES.info.icon)} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{ins.title}</h4>
                {ins.explanation && <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{ins.explanation}</p>}
                {ins.financial_impact !== null && ins.financial_impact !== 0 && (
                  <div className={cn("mt-2 text-xs font-mono tabular-nums font-semibold", TONE_STYLES.info.icon)}>
                    ~{formatSEK(Math.abs(ins.financial_impact))}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 mt-2 -ml-2"
                  onClick={() => navigate(`/tax-calculation?focus=${ins.id}`)}
                >
                  Granska i skattemodulen <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
