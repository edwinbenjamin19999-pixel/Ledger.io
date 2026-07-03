import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, DollarSign, Shield, CreditCard, Droplets, Info } from "lucide-react";
import { type ConsolidationKPIs } from "@/lib/consolidation-engine";
import { formatSEK } from "@/lib/consolidation-engine";

interface Props { kpis: ConsolidationKPIs;
}

const KPICard = ({ title, value, sub, tooltip, icon: Icon, color 
}: { title: string; value: string; sub?: string; tooltip: string; 
  icon: React.ElementType; color: string;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="hover:shadow-md transition-shadow min-w-0 overflow-hidden">
          <CardContent className="p-3 xl:p-[12px_14px]">
            <div className="flex items-start justify-between mb-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.05em] truncate">{title}</span>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <Info className="w-3 h-3 text-muted-foreground/50" />
              </div>
            </div>
            <div className="text-[22px] font-bold tabular-nums leading-tight whitespace-nowrap">{value}</div>
            {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[250px]">
        <p className="text-sm">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const ConsolidationKPIPanel = ({ kpis }: Props) => { const soliditetColor = kpis.soliditet > 30 ? "text-[#085041]" : kpis.soliditet > 10 ? "text-[#7A5417]" : "text-[#7A1A1A]";
  const currentRatioColor = kpis.currentRatio >= 1 ? "text-[#085041]" : "text-[#7A1A1A]";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-[10px]">
      <KPICard
        title="Nettoomsättning"
        value={`${formatSEK(kpis.revenue)} kr`}
        icon={DollarSign}
        color="text-primary"
        tooltip="Summa intäkter klass 3xxx efter elimineringar"
      />
      <KPICard
        title="EBITDA"
        value={`${formatSEK(kpis.ebitda)} kr`}
        sub={`Marginal: ${kpis.ebitdaMargin.toFixed(1)}%`}
        icon={TrendingUp}
        color={kpis.ebitda >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}
        tooltip="Resultat före avskrivningar, räntor och skatt. EBITDA = EBIT + avskrivningar (78xx)"
      />
      <KPICard
        title="Årets resultat"
        value={`${formatSEK(kpis.netIncome)} kr`}
        sub={`Rörelsemarginal: ${kpis.operatingMargin.toFixed(1)}%`}
        icon={kpis.netIncome >= 0 ? TrendingUp : TrendingDown}
        color={kpis.netIncome >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}
        tooltip="Rörelseresultat + finansnetto. Rörelsemarginal = EBIT / Nettoomsättning"
      />
      <KPICard
        title="Soliditet"
        value={`${kpis.soliditet.toFixed(1)}%`}
        sub={`EK: ${formatSEK(kpis.totalEquity)} kr`}
        icon={Shield}
        color={soliditetColor}
        tooltip="(EK + 78% × obeskattade reserver) / Totala tillgångar. Grön > 30%, Orange 10-30%, Röd < 10%"
      />
      <KPICard
        title="Nettoskuld"
        value={`${formatSEK(kpis.netDebt)} kr`}
        sub={`Skuldsättning: ${kpis.debtToEbitda.toFixed(1)}x`}
        icon={CreditCard}
        color={kpis.netDebt <= 0 ? "text-[#085041]" : "text-[#7A5417]"}
        tooltip="Räntebärande skulder (23xx) − Kassa och bank (19xx). Skuldsättningsgrad = Nettoskuld / EBITDA"
      />
      <KPICard
        title="Kassalikviditet"
        value={kpis.currentRatio.toFixed(2)}
        sub={kpis.currentRatio >= 1 ? "OK" : "Låg"}
        icon={Droplets}
        color={currentRatioColor}
        tooltip="(Omsättningstillgångar − Lager) / Kortfristiga skulder. Bör vara > 1,0"
      />
    </div>
  );
};
