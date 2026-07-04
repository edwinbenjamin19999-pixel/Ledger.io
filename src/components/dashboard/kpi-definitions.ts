export interface KpiDefinition {
  id: string;
  label: string;
  category: string;
  suffix: string;
  prefix: string;
  accentColor: string;
  icon: string; // lucide icon name
  invertChange?: boolean;
  accountRange?: { from: string; to: string };
  navigateTo?: string;
}

export const KPI_CATEGORIES = [
  'LÖNSAMHET',
  'LIKVIDITET & BALANS',
  'FORDRINGAR & SKULDER',
  'PERSONAL & SKATT',
] as const;

export const ALL_KPIS: KpiDefinition[] = [
  // LÖNSAMHET
  { id: 'revenue', label: 'Intäkter', category: 'LÖNSAMHET', suffix: ' kr', prefix: '', accentColor: '#22C55E', icon: 'TrendingUp', navigateTo: '/reports' },
  { id: 'costs', label: 'Kostnader', category: 'LÖNSAMHET', suffix: ' kr', prefix: '', accentColor: '#F97316', icon: 'TrendingDown', invertChange: true, navigateTo: '/reports' },
  { id: 'result', label: 'Resultat (EBIT)', category: 'LÖNSAMHET', suffix: ' kr', prefix: '', accentColor: '#3B82F6', icon: 'BarChart3', navigateTo: '/reports' },
  { id: 'margin', label: 'Bruttomarginal', category: 'LÖNSAMHET', suffix: '%', prefix: '', accentColor: '#8B5CF6', icon: 'BarChart3', navigateTo: '/reports' },
  { id: 'operating_margin', label: 'Rörelsemarginal', category: 'LÖNSAMHET', suffix: '%', prefix: '', accentColor: '#7C3AED', icon: 'BarChart3', navigateTo: '/reports' },
  { id: 'ebitda', label: 'EBITDA', category: 'LÖNSAMHET', suffix: ' kr', prefix: '', accentColor: '#0052FF', icon: 'BarChart3', navigateTo: '/reports' },
  { id: 'budget_variance', label: 'Budgetavvikelse', category: 'LÖNSAMHET', suffix: ' kr', prefix: '', accentColor: '#D97706', icon: 'BarChart3', navigateTo: '/budget' },

  // LIKVIDITET & BALANS
  { id: 'cash', label: 'Kassa & Bank', category: 'LIKVIDITET & BALANS', suffix: ' kr', prefix: '', accentColor: '#0052FF', icon: 'Wallet', navigateTo: '/bank' },
  { id: 'current_ratio', label: 'Likviditetsgrad', category: 'LIKVIDITET & BALANS', suffix: '', prefix: '', accentColor: '#0052FF', icon: 'BarChart3', navigateTo: '/reports' },
  { id: 'quick_ratio', label: 'Kassalikviditet', category: 'LIKVIDITET & BALANS', suffix: '', prefix: '', accentColor: '#0E7490', icon: 'BarChart3', navigateTo: '/reports' },
  { id: 'period_cashflow', label: 'Periodens kassaflöde', category: 'LIKVIDITET & BALANS', suffix: ' kr', prefix: '', accentColor: '#14B8A6', icon: 'TrendingUp', navigateTo: '/cash-flow' },

  // FORDRINGAR & SKULDER
  { id: 'ar', label: 'Kundfordringar', category: 'FORDRINGAR & SKULDER', suffix: ' kr', prefix: '', accentColor: '#F59E0B', icon: 'ArrowUpRight', navigateTo: '/invoices' },
  { id: 'ar_overdue', label: 'Förfallna kundfordringar', category: 'FORDRINGAR & SKULDER', suffix: ' kr', prefix: '', accentColor: '#DC2626', icon: 'ArrowUpRight', invertChange: true, navigateTo: '/invoices' },
  { id: 'ap', label: 'Leverantörsskulder', category: 'FORDRINGAR & SKULDER', suffix: ' kr', prefix: '', accentColor: '#EF4444', icon: 'ArrowDownRight', navigateTo: '/invoices?tab=incoming' },
  { id: 'ap_overdue', label: 'Förfallna leverantörsfakturor', category: 'FORDRINGAR & SKULDER', suffix: ' kr', prefix: '', accentColor: '#B91C1C', icon: 'ArrowDownRight', invertChange: true, navigateTo: '/invoices?tab=incoming' },
  { id: 'dso', label: 'Betalningstid kunder (DSO)', category: 'FORDRINGAR & SKULDER', suffix: ' dagar', prefix: '', accentColor: '#10B981', icon: 'Clock', invertChange: true, navigateTo: '/invoices' },
  { id: 'dpo', label: 'Betalningstid leverantörer (DPO)', category: 'FORDRINGAR & SKULDER', suffix: ' dagar', prefix: '', accentColor: '#059669', icon: 'Clock', navigateTo: '/invoices?tab=incoming' },

  // PERSONAL & SKATT
  { id: 'payroll', label: 'Löner & personalkostnader', category: 'PERSONAL & SKATT', suffix: ' kr', prefix: '', accentColor: '#6366F1', icon: 'Users', navigateTo: '/hr' },
  { id: 'vat_balance', label: 'Moms att betala / återfå', category: 'PERSONAL & SKATT', suffix: ' kr', prefix: '', accentColor: '#A855F7', icon: 'FileText', navigateTo: '/vat-reports' },
  { id: 'automation_pct', label: 'Automatiseringsgrad (AI %)', category: 'PERSONAL & SKATT', suffix: '%', prefix: '', accentColor: '#EC4899', icon: 'BarChart3', navigateTo: '/automation' },
  { id: 'verification_count', label: 'Antal verifikationer', category: 'PERSONAL & SKATT', suffix: ' st', prefix: '', accentColor: '#64748B', icon: 'FileText', navigateTo: '/verifications' },
];

export interface ActiveTile {
  kpiId: string;
  size: '1x1' | '2x1' | '4x1';
  comparison: 'prev_month' | 'prev_quarter' | 'prev_year' | 'budget';
  showSparkline: boolean;
  warningThreshold?: number;
  warningType?: 'yellow' | 'red';
  warningDirection?: 'below' | 'above';
}

// All KPIs default to M (2x1 = span 2 = half width).
export const DEFAULT_TILES: ActiveTile[] = [
  { kpiId: 'revenue', size: '1x1', comparison: 'prev_month', showSparkline: true },
  { kpiId: 'costs', size: '1x1', comparison: 'prev_month', showSparkline: true },
  { kpiId: 'result', size: '1x1', comparison: 'prev_month', showSparkline: true },
  { kpiId: 'cash', size: '1x1', comparison: 'prev_month', showSparkline: true },
  { kpiId: 'margin', size: '1x1', comparison: 'prev_month', showSparkline: true },
  { kpiId: 'ar', size: '1x1', comparison: 'prev_month', showSparkline: true },
  { kpiId: 'ap', size: '1x1', comparison: 'prev_month', showSparkline: true },
  { kpiId: 'dso', size: '1x1', comparison: 'prev_month', showSparkline: true },
];

// ── Widget definitions ──
export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
}

export const ALL_WIDGETS: WidgetDefinition[] = [
  { id: 'cashflow_chart', label: 'Kassaflödesdiagram', description: 'Senaste 6 månaders in- och utbetalningar' },
  { id: 'top_customers', label: 'Top 5 kunder', description: 'Donut-chart med största kunder' },
  { id: 'top_suppliers', label: 'Top 5 leverantörer', description: 'Donut-chart med största leverantörer' },
  { id: 'activity_feed', label: 'Aktivitetsfeed', description: 'Senaste verifikationer/fakturor' },
  { id: 'quick_actions', label: 'Snabbåtgärder', description: 'Knappar: Ny faktura, Ny verifikation, Ladda upp kvitto, Kör lön' },
  { id: 'overdue_invoices', label: 'Förfallna fakturor', description: 'Lista över obetalda som passerat förfallodatum' },
  { id: 'upcoming_deadlines', label: 'Kommande deadlines', description: 'Moms, AGI, bokslut' },
  { id: 'ai_insights', label: 'AI-insikter & prognoser', description: 'AI-driven analys av trender, anomalier och förbättringsförslag' },
  { id: 'business_pulse', label: 'Business Pulse', description: 'Handlingsbara insikter syntetiserade från alla moduler – max 6 prioriterade per allvarlighet' },
  { id: 'reconciliation_log', label: 'Avstämningslogg', description: 'Senaste automatiska avstämningar och flaggade transaktioner' },
  { id: 'revenue_forecast', label: 'Intäktsprognos', description: 'Stapeldiagram med prognos för kommande månader' },
  { id: 'expense_anomalies', label: 'Kostnadsavvikelser', description: 'AI-driven detektion av ovanliga kostnadsposter' },
  { id: 'monthly_result', label: 'Månadsresultat (trend)', description: 'Linjediagram med resultat per månad senaste 12 mån' },
];

export interface ActiveWidget {
  widgetId: string;
  visible: boolean;
  width: 'half' | 'full';
}

// Essential dashboard widgets only. Everything else is hidden by default
// and can be re-enabled via the "Anpassa dashboard" modal.
// Note: KPI-strip and the AI signal bar are rendered ABOVE the cockpit grid
// in `Dashboard.tsx`, so they are NOT included here.
export const DEFAULT_WIDGETS: ActiveWidget[] = [
  // Default visible — the 6 cockpit widgets
  { widgetId: 'business_pulse',     visible: true,  width: 'half' }, // Riskradar
  { widgetId: 'overdue_invoices',   visible: true,  width: 'half' }, // Förfallna fakturor
  { widgetId: 'cashflow_chart',     visible: true,  width: 'half' }, // Kassaflöde – 3 mån
  { widgetId: 'upcoming_deadlines', visible: true,  width: 'half' }, // Kommande deadlines
  { widgetId: 'monthly_result',     visible: true,  width: 'full' }, // Månadsresultat – 12 mån
  { widgetId: 'quick_actions',      visible: true,  width: 'full' }, // Snabbåtgärder

  // Default hidden — available via customization
  { widgetId: 'top_customers',      visible: false, width: 'half' },
  { widgetId: 'top_suppliers',      visible: false, width: 'half' },
  { widgetId: 'ai_insights',        visible: false, width: 'half' },
  { widgetId: 'reconciliation_log', visible: false, width: 'half' },
  { widgetId: 'activity_feed',      visible: false, width: 'half' },
  { widgetId: 'revenue_forecast',   visible: false, width: 'half' },
  { widgetId: 'expense_anomalies',  visible: false, width: 'half' },
];

// ── General settings ──
export interface DashboardGeneralSettings {
  defaultPeriod: 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'year';
  columnLayout: 3 | 4 | 5;
  defaultCompanyId?: string;
}

export const DEFAULT_GENERAL_SETTINGS: DashboardGeneralSettings = {
  defaultPeriod: 'month',
  columnLayout: 4,
};

// ── Unified layout item ──
export type WidgetSize = 'small' | 'medium' | 'large';

export interface LayoutItem {
  type: 'kpi' | 'widget';
  id: string; // kpiId or widgetId
  colSpan: number; // columns in the grid (1 = S, 2 = M, 4 = L full-row)
  rowSpan?: 1 | 2; // rows in the grid (2 = large)
}

export function getWidgetSize(item: LayoutItem): WidgetSize {
  if (item.colSpan >= 4) return 'large';
  if (item.colSpan >= 2) return 'medium';
  return 'small';
}

export function sizeToSpans(size: WidgetSize): { colSpan: number; rowSpan: 1 | 2 } {
  if (size === 'small') return { colSpan: 1, rowSpan: 1 };
  if (size === 'medium') return { colSpan: 2, rowSpan: 1 };
  return { colSpan: 4, rowSpan: 1 };
}

// Which sizes each widget type supports
export const WIDGET_SUPPORTED_SIZES: Record<string, WidgetSize[]> = {
  cashflow_chart: ['medium', 'large'],
  top_customers: ['medium', 'large'],
  top_suppliers: ['medium', 'large'],
  activity_feed: ['medium', 'large'],
  quick_actions: ['medium', 'large'],
  overdue_invoices: ['medium', 'large'],
  upcoming_deadlines: ['medium', 'large'],
  ai_insights: ['medium', 'large'],
  business_pulse: ['medium', 'large'],
  reconciliation_log: ['medium', 'large'],
  revenue_forecast: ['medium', 'large'],
  expense_anomalies: ['medium', 'large'],
  monthly_result: ['medium', 'large'],
};

// KPIs support all three sizes
export const KPI_SUPPORTED_SIZES: WidgetSize[] = ['small', 'medium', 'large'];

export function buildDefaultLayout(tiles: ActiveTile[], widgets: ActiveWidget[]): LayoutItem[] {
  const items: LayoutItem[] = [];
  const tileSpan = (s: ActiveTile['size']) => (s === '4x1' ? 4 : s === '2x1' ? 2 : 1);
  for (const t of tiles) {
    items.push({ type: 'kpi', id: t.kpiId, colSpan: tileSpan(t.size), rowSpan: 1 });
  }
  for (const w of widgets) {
    if (w.visible) {
      // Default all widgets to M (span 2) for a clean 2-per-row layout.
      items.push({ type: 'widget', id: w.widgetId, colSpan: 2, rowSpan: 1 });
    }
  }
  return items;
}

// Full config shape persisted to DB
export interface DashboardConfig {
  tiles: ActiveTile[];
  widgets: ActiveWidget[];
  general: DashboardGeneralSettings;
  layout?: LayoutItem[]; // unified order; if missing, auto-build from tiles+widgets
}

export const DEFAULT_LAYOUT = buildDefaultLayout(DEFAULT_TILES, DEFAULT_WIDGETS);

export const DEFAULT_CONFIG: DashboardConfig = {
  tiles: DEFAULT_TILES,
  widgets: DEFAULT_WIDGETS,
  general: DEFAULT_GENERAL_SETTINGS,
  layout: DEFAULT_LAYOUT,
};
