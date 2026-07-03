export type ComparisonMode = 'actual' | 'actual_vs_budget' | 'actual_vs_forecast' | 'forecast_vs_budget' | 'variance';
export type PeriodPreset = 'month' | 'quarter' | 'ytd' | 'full_year';

export interface ComparisonState {
  mode: ComparisonMode;
  period: PeriodPreset;
  year: number;
  month: number;
}

export interface VarianceRow {
  id: string;
  label: string;
  level: 1 | 2 | 3;
  accountNumber?: string;
  actual: number;
  comparison: number;
  varianceAmount: number;
  variancePercent: number | null;
  isFavorable: boolean;
  isRevenue: boolean;
  children?: VarianceRow[];
  expanded?: boolean;
}

export interface KPIMetric {
  label: string;
  actual: number;
  comparison: number;
  varianceAmount: number;
  variancePercent: number | null;
  isFavorable: boolean;
}

export interface Driver {
  category: string;
  accountNumber?: string;
  impactSEK: number;
  variancePercent: number;
  direction: 'positive' | 'negative';
  rowRef: VarianceRow;
}

export interface AIAction {
  label: string;
  actionType: 'drill' | 'navigate' | 'simulate' | 'explain';
  target?: string;
}

export interface AINarrative {
  headline: string;
  body: string;
  actions: AIAction[];
  highlightIds?: string[];
}

export const MODE_LABELS: Record<ComparisonMode, string> = {
  actual: 'Utfall',
  actual_vs_budget: 'Utfall vs Budget',
  actual_vs_forecast: 'Utfall vs Prognos',
  forecast_vs_budget: 'Prognos vs Budget',
  variance: 'Avvikelse',
};

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  month: 'Månad',
  quarter: 'Kvartal',
  ytd: 'Hittills i år',
  full_year: 'Helår',
};
