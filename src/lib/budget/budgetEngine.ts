/**
 * Budget calculation engine — handles RR, KF, BR computations
 */

export const MONTH_KEYS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;
export type MonthKey = (typeof MONTH_KEYS)[number];
export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
export const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];

export interface BudgetRowData {
  id: string;
  account_number: string;
  account_name: string;
  jan: number; feb: number; mar: number; apr: number; maj: number; jun: number;
  jul: number; aug: number; sep: number; okt: number; nov: number; dec: number;
  ai_generated: boolean;
  manually_adjusted: boolean;
  notes: string | null;
  type?: string;
  scenario?: string;
}

export interface RRCategoryNode {
  key: string;
  label: string;
  range: [string, string];
  isSummary?: boolean;
  isResult?: boolean;
  children?: RRCategoryNode[];
}

export const RR_STRUCTURE: RRCategoryNode[] = [
  {
    key: "revenue",
    label: "RÖRELSENS INTÄKTER",
    range: ["3000", "3999"],
    children: [
      { key: "net_sales", label: "Nettoomsättning", range: ["3000", "3799"] },
      { key: "activated_work", label: "Aktiverat arbete för egen räkning", range: ["3800", "3899"] },
      { key: "other_revenue", label: "Övriga rörelseintäkter", range: ["3900", "3999"] },
    ],
  },
  {
    key: "costs",
    label: "RÖRELSENS KOSTNADER",
    range: ["4000", "7999"],
    children: [
      {
        key: "cogs",
        label: "Råvaror och förnödenheter",
        range: ["4000", "4999"],
        children: [
          { key: "purchases", label: "Inköp av varor", range: ["4000", "4599"] },
          { key: "inventory_change", label: "Förändring varulager", range: ["4700", "4999"] },
        ],
      },
      {
        key: "external",
        label: "Övriga externa kostnader",
        range: ["5000", "6999"],
        children: [
          { key: "premises", label: "Lokalkostnader", range: ["5000", "5999"] },
          { key: "vehicles", label: "Fordonskostnader", range: ["6000", "6099"] },
          { key: "marketing", label: "Marknadsföring", range: ["6100", "6299"] },
          { key: "it_sw", label: "IT och programvara", range: ["6400", "6599"] },
          { key: "other_ext", label: "Övriga externa kostnader", range: ["6600", "6999"] },
        ],
      },
      {
        key: "staff",
        label: "Personalkostnader",
        range: ["7000", "7699"],
        children: [
          { key: "salaries", label: "Löner och arvoden", range: ["7010", "7090"] },
          { key: "social_fees", label: "Arbetsgivaravgifter", range: ["7510", "7519"] },
          { key: "pension", label: "Pensionskostnader", range: ["7520", "7540"] },
          { key: "other_staff", label: "Övriga personalkostnader", range: ["7600", "7699"] },
        ],
      },
      {
        key: "depreciation",
        label: "Avskrivningar",
        range: ["7700", "7899"],
        children: [
          { key: "dep_immaterial", label: "Avskrivningar immateriella tillgångar", range: ["7700", "7799"] },
          { key: "dep_material", label: "Avskrivningar materiella tillgångar", range: ["7800", "7899"] },
        ],
      },
      { key: "other_operating", label: "Övriga rörelsekostnader", range: ["7900", "7999"] },
    ],
  },
  {
    key: "financial",
    label: "FINANSIELLA POSTER",
    range: ["8000", "8799"],
    children: [
      { key: "interest_income", label: "Ränteintäkter", range: ["8300", "8399"] },
      { key: "interest_expense", label: "Räntekostnader", range: ["8400", "8499"] },
      { key: "other_financial", label: "Övriga finansiella poster", range: ["8000", "8299"] },
    ],
  },
  {
    key: "dispositions",
    label: "Bokslutsdispositioner",
    range: ["8800", "8899"],
  },
];

export function getMonthValue(row: BudgetRowData, month: MonthKey): number {
  return row[month] || 0;
}

export function getAnnualTotal(row: BudgetRowData): number {
  return MONTH_KEYS.reduce((sum, m) => sum + (row[m] || 0), 0);
}

export function getQuarterTotal(row: BudgetRowData, quarter: number): number {
  const start = quarter * 3;
  return MONTH_KEYS.slice(start, start + 3).reduce((sum, m) => sum + (row[m] || 0), 0);
}

export function filterRowsByRange(rows: BudgetRowData[], range: [string, string]): BudgetRowData[] {
  return rows.filter(r => r.account_number >= range[0] && r.account_number <= range[1]);
}

export function sumRange(rows: BudgetRowData[], range: [string, string], month: MonthKey): number {
  return filterRowsByRange(rows, range).reduce((s, r) => s + (r[month] || 0), 0);
}

export function sumRangeAnnual(rows: BudgetRowData[], range: [string, string]): number {
  return filterRowsByRange(rows, range).reduce((s, r) => s + getAnnualTotal(r), 0);
}

// Calculate RR line items
export function calcRevenue(rows: BudgetRowData[], month: MonthKey): number {
  return sumRange(rows, ["3000", "3999"], month);
}

export function calcCosts(rows: BudgetRowData[], month: MonthKey): number {
  return sumRange(rows, ["4000", "7999"], month);
}

export function calcEBIT(rows: BudgetRowData[], month: MonthKey): number {
  return calcRevenue(rows, month) - calcCosts(rows, month);
}

export function calcFinancialNet(rows: BudgetRowData[], month: MonthKey): number {
  return sumRange(rows, ["8300", "8399"], month) - sumRange(rows, ["8400", "8499"], month) + sumRange(rows, ["8000", "8299"], month);
}

export function calcResultAfterFinancial(rows: BudgetRowData[], month: MonthKey): number {
  return calcEBIT(rows, month) + calcFinancialNet(rows, month);
}

export function calcDispositions(rows: BudgetRowData[], month: MonthKey): number {
  return sumRange(rows, ["8800", "8899"], month);
}

export function calcResultBeforeTax(rows: BudgetRowData[], month: MonthKey): number {
  return calcResultAfterFinancial(rows, month) + calcDispositions(rows, month);
}

export function calcTax(rows: BudgetRowData[], month: MonthKey): number {
  const rbt = calcResultBeforeTax(rows, month);
  return rbt > 0 ? Math.round(rbt * 0.206) : 0;
}

export function calcNetResult(rows: BudgetRowData[], month: MonthKey): number {
  return calcResultBeforeTax(rows, month) - calcTax(rows, month);
}

// Cash flow (indirect method) helpers
export interface CashFlowLine {
  key: string;
  label: string;
  values: number[];
  isSummary?: boolean;
  isEditable?: boolean;
  indent?: number;
}

export function buildCashFlowLines(rows: BudgetRowData[], cfRows: Record<string, number[]>): CashFlowLine[] {
  const netResult = MONTH_KEYS.map((m) => calcNetResult(rows, m));
  const depreciation = MONTH_KEYS.map((m) => sumRange(rows, ["7700", "7899"], m));

  const get = (key: string) => cfRows[key] || new Array(12).fill(0);

  const cashFromOps = MONTH_KEYS.map((_, i) =>
    netResult[i] + depreciation[i] + (get("writedowns")[i] || 0) - (get("asset_gains")[i] || 0)
  );

  const wcChange = MONTH_KEYS.map((_, i) =>
    (get("receivables_change")[i] || 0) + (get("inventory_change")[i] || 0) +
    (get("payables_change")[i] || 0) + (get("other_wc_change")[i] || 0)
  );

  const cfOperating = MONTH_KEYS.map((_, i) => cashFromOps[i] + wcChange[i]);

  const cfInvesting = MONTH_KEYS.map((_, i) =>
    (get("intangible_capex")[i] || 0) + (get("tangible_capex")[i] || 0) + (get("asset_disposal")[i] || 0)
  );

  const cfFinancing = MONTH_KEYS.map((_, i) =>
    (get("loans_received")[i] || 0) + (get("loan_repayment")[i] || 0) +
    (get("dividends")[i] || 0) + (get("equity_issue")[i] || 0)
  );

  const periodCF = MONTH_KEYS.map((_, i) => cfOperating[i] + cfInvesting[i] + cfFinancing[i]);

  const openingCash = get("opening_cash");
  const closingCash = MONTH_KEYS.map((_, i) => (openingCash[i] || 0) + periodCF[i]);

  return [
    { key: "net_result", label: "ÅRETS RESULTAT", values: netResult, isSummary: true },
    { key: "section_adj", label: "JUSTERING FÖR EJ KASSAFLÖDESPÅVERKANDE POSTER", values: [], isSummary: true },
    { key: "depreciation", label: "+ Avskrivningar", values: depreciation, indent: 1 },
    { key: "writedowns", label: "+ Nedskrivningar", values: get("writedowns"), isEditable: true, indent: 1 },
    { key: "asset_gains", label: "- Reavinster på anläggningstillgångar", values: get("asset_gains"), isEditable: true, indent: 1 },
    { key: "cf_before_wc", label: "= Kassaflöde före rörelsekapitalförändringar", values: cashFromOps, isSummary: true },
    { key: "section_wc", label: "FÖRÄNDRINGAR I RÖRELSEKAPITAL", values: [], isSummary: true },
    { key: "receivables_change", label: "Förändring kundfordringar", values: get("receivables_change"), isEditable: true, indent: 1 },
    { key: "inventory_change", label: "Förändring varulager", values: get("inventory_change"), isEditable: true, indent: 1 },
    { key: "payables_change", label: "Förändring leverantörsskulder", values: get("payables_change"), isEditable: true, indent: 1 },
    { key: "other_wc_change", label: "Förändring övriga fordringar/skulder", values: get("other_wc_change"), isEditable: true, indent: 1 },
    { key: "cf_operating", label: "= Kassaflöde från den löpande verksamheten (A)", values: cfOperating, isSummary: true },
    { key: "section_invest", label: "INVESTERINGSVERKSAMHETEN", values: [], isSummary: true },
    { key: "intangible_capex", label: "Förvärv av immateriella tillgångar", values: get("intangible_capex"), isEditable: true, indent: 1 },
    { key: "tangible_capex", label: "Förvärv av materiella tillgångar (capex)", values: get("tangible_capex"), isEditable: true, indent: 1 },
    { key: "asset_disposal", label: "Avyttring av anläggningstillgångar", values: get("asset_disposal"), isEditable: true, indent: 1 },
    { key: "cf_investing", label: "= Kassaflöde från investeringsverksamheten (B)", values: cfInvesting, isSummary: true },
    { key: "section_finance", label: "FINANSIERINGSVERKSAMHETEN", values: [], isSummary: true },
    { key: "loans_received", label: "Erhållna lån", values: get("loans_received"), isEditable: true, indent: 1 },
    { key: "loan_repayment", label: "Amortering av lån", values: get("loan_repayment"), isEditable: true, indent: 1 },
    { key: "dividends", label: "Utbetald utdelning", values: get("dividends"), isEditable: true, indent: 1 },
    { key: "equity_issue", label: "Nyemission", values: get("equity_issue"), isEditable: true, indent: 1 },
    { key: "cf_financing", label: "= Kassaflöde från finansieringsverksamheten (C)", values: cfFinancing, isSummary: true },
    { key: "period_cf", label: "= PERIODENS KASSAFLÖDE (A+B+C)", values: periodCF, isSummary: true },
    { key: "opening_cash", label: "Likvida medel vid periodens början", values: openingCash, isEditable: true, indent: 1 },
    { key: "closing_cash", label: "= LIKVIDA MEDEL VID PERIODENS SLUT", values: closingCash, isSummary: true },
  ];
}

// Formatting helpers
export function formatSEK(n: number): string {
  return n.toLocaleString("sv-SE");
}

export function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// Sparkline SVG path generator
export function sparklinePath(values: number[], width = 80, height = 20): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// Cash heatmap color
export function cashHeatColor(value: number, avgMonthlyCost: number): string {
  if (avgMonthlyCost === 0) return "bg-emerald-100";
  const ratio = value / avgMonthlyCost;
  if (ratio < 0) return "bg-red-600 text-white";
  if (ratio < 0.5) return "bg-red-400 text-white";
  if (ratio < 1) return "bg-orange-400 text-white";
  if (ratio < 2) return "bg-amber-300";
  if (ratio < 3) return "bg-emerald-300";
  return "bg-emerald-500 text-white";
}
