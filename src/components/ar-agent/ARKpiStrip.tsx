import { FileText, AlertTriangle, AlertOctagon, Scale, Ban, TrendingUp } from "lucide-react";
import { GradientKPIStrip, KPI_GRADIENTS, GradientKPICardData } from "@/components/shared/GradientKPICard";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props { totalOutstanding: number;
  totalOutstandingCount: number;
  overdue1_30Amount: number;
  overdue1_30Count: number;
  overdue30PlusAmount: number;
  overdue30PlusCount: number;
  collectionAmount: number;
  collectionCount: number;
  writtenOffAmount: number;
  writtenOffCount: number;
  forecast14Amount: number;
  forecast14Confidence: number;
}

export const ARKpiStrip = (props: Props) => { const cards: GradientKPICardData[] = [
    { label: "Utestående fordringar", value: `${fmt(props.totalOutstanding)} kr`, sub: `${props.totalOutstandingCount} fakturor`, icon: FileText, gradient: KPI_GRADIENTS.indigo },
    { label: "Förfallna (1–30 dagar)", value: `${fmt(props.overdue1_30Amount)} kr`, sub: `${props.overdue1_30Count} fakturor`, icon: AlertTriangle, gradient: KPI_GRADIENTS.amber },
    { label: "Förfallna (30+ dagar)", value: `${fmt(props.overdue30PlusAmount)} kr`, sub: `${props.overdue30PlusCount} fakturor`, icon: AlertOctagon, gradient: KPI_GRADIENTS.red },
    { label: "Inkasso pågår", value: `${fmt(props.collectionAmount)} kr`, sub: `${props.collectionCount} ärenden`, icon: Scale, gradient: KPI_GRADIENTS.orange },
    { label: "Avskrivet i år", value: `${fmt(props.writtenOffAmount)} kr`, sub: `${props.writtenOffCount} fakturor`, icon: Ban, gradient: KPI_GRADIENTS.slate },
    { label: "Förväntat in 14 dagar", value: `${fmt(props.forecast14Amount)} kr`, sub: `${props.forecast14Confidence}% konfidens (AI)`, icon: TrendingUp, gradient: KPI_GRADIENTS.purple },
  ];

  return <GradientKPIStrip cards={cards} columns={6} />;
};
