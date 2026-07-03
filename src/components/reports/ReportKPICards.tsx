/**
 * @deprecated Replaced by `UnifiedKPIHeader`. Re-export shim only.
 */
import { PremiumKPIStrip } from "./PremiumKPIStrip";

interface ReportKPICardsProps {
  revenue: number;
  expenses: number;
  netResult: number;
  assets: number;
}

export const ReportKPICards = ({ revenue, expenses, netResult, assets }: ReportKPICardsProps) => (
  <PremiumKPIStrip
    variant="overview"
    revenue={revenue}
    expenses={expenses}
    netResult={netResult}
    assets={assets}
  />
);
