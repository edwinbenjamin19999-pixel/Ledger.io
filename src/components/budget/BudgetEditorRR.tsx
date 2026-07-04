import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, Table, RotateCcw } from "lucide-react";
import {
  MONTH_KEYS, MonthKey, BudgetRowData,
  sumRange,
  calcRevenue, calcEBIT,
  calcFinancialNet,
  calcResultBeforeTax,
  calcTax, calcNetResult,
} from "@/lib/budget/budgetEngine";
import { RRMonth } from "@/lib/budget/driverEngine";
import { WaterfallChart } from "./WaterfallChart";
import { BudgetMonthTable, type BudgetRow } from "./BudgetMonthTable";
import { BUDGET_MONTHS } from "@/lib/budget/budgetMonths";

function formatSEK(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("sv-SE", { style: "decimal", maximumFractionDigits: 0 }).format(v) + " kr";
}

const padTo12 = (arr: number[]) => [...arr, ...Array(12 - arr.length).fill(0)].slice(0, 12);

type BudgetViewMode = "budget" | "comparison" | "forecast";
type ScenarioType = "base" | "optimistic" | "pessimistic";

const SCENARIO_MULTIPLIERS: Record<ScenarioType, { revenue: number; costs: number }> = {
  pessimistic: { revenue: 0.80, costs: 1.05 },
  base:        { revenue: 1.00, costs: 1.00 },
  optimistic:  { revenue: 1.20, costs: 0.95 },
};

const EDITABLE_ROW_KEYS = new Set([
  "net_sales", "activated_work", "other_rev",
  "raw_mat", "inv_change",
  "salaries", "social_fees", "pension",
  "premises", "marketing", "it_sw", "other_ext",
  "depreciation",
  "int_income", "int_expense", "other_fin",
]);

interface BudgetEditorRRProps {
  rows: BudgetRowData[];
  onCellChange: (rowIdx: number, month: MonthKey, value: string) => void;
  isLocked: boolean;
  companyId?: string;
  fiscalYear?: number;
  driverRR?: RRMonth[];
  budgetView: BudgetViewMode;
  onViewChange: (v: BudgetViewMode) => void;
  scenario: ScenarioType;
  onScenarioChange: (s: ScenarioType) => void;
}

export const BudgetEditorRR = ({ rows, onCellChange, isLocked, driverRR, budgetView, onViewChange, scenario, onScenarioChange }: BudgetEditorRRProps) => {
  const [showWaterfall, setShowWaterfall] = useState(true);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});

  const hasRowData = useMemo(() => rows.some(r => MONTH_KEYS.some(m => (r[m] || 0) !== 0)), [rows]);

  const mult = SCENARIO_MULTIPLIERS[scenario];

  // Helper: get override or apply scenario multiplier to base value
  const ov = (key: string, idx: number, base: number, isRevenue: boolean): number => {
    const oKey = `${key}_${idx}`;
    if (manualOverrides[oKey] !== undefined) return manualOverrides[oKey];
    return base * (isRevenue ? mult.revenue : mult.costs);
  };

  const rrPerMonth = useMemo(() => MONTH_KEYS.map((m, idx) => {
    if (hasRowData) {
      // Read raw values from DB rows
      const rawNetSales = sumRange(rows, ["3000","3799"], m);
      const rawActivatedWork = sumRange(rows, ["3800","3899"], m);
      const rawOtherRevIncome = sumRange(rows, ["3900","3999"], m);
      const rawRawMaterials = sumRange(rows, ["4000","4599"], m);
      const rawInventoryChange = sumRange(rows, ["4700","4999"], m);
      const rawSalaries = sumRange(rows, ["7010","7090"], m);
      const rawSocialFees = sumRange(rows, ["7510","7519"], m);
      const rawPension = sumRange(rows, ["7520","7540"], m);
      const rawPremises = sumRange(rows, ["5000","5999"], m);
      const rawMarketing = sumRange(rows, ["6100","6299"], m);
      const rawItSw = sumRange(rows, ["6400","6599"], m);
      const rawOtherExt = sumRange(rows, ["6600","6999"], m);
      const rawDepr = sumRange(rows, ["7700","7899"], m);
      const rawIntIncome = sumRange(rows, ["8300","8399"], m);
      const rawIntExpense = sumRange(rows, ["8400","8499"], m);
      const rawOtherFin = sumRange(rows, ["8000","8299"], m);

      // Apply scenario multipliers + manual overrides
      const netSales = ov("net_sales", idx, rawNetSales, true);
      const activatedWork = ov("activated_work", idx, rawActivatedWork, true);
      const otherRevIncome = ov("other_rev", idx, rawOtherRevIncome, true);
      const rev = netSales + activatedWork + otherRevIncome;

      const rawMaterials = ov("raw_mat", idx, rawRawMaterials, false);
      const inventoryChange = ov("inv_change", idx, rawInventoryChange, false);
      const cogs = rawMaterials + inventoryChange;
      const grossProfit = rev - cogs;

      const salaries = ov("salaries", idx, rawSalaries, false);
      const socialFees = ov("social_fees", idx, rawSocialFees, false);
      const pension = ov("pension", idx, rawPension, false);
      const staff = salaries + socialFees + pension;

      const premises = ov("premises", idx, rawPremises, false);
      const marketing = ov("marketing", idx, rawMarketing, false);
      const itSw = ov("it_sw", idx, rawItSw, false);
      const otherExt = ov("other_ext", idx, rawOtherExt, false);
      const external = premises + marketing + itSw + otherExt;

      const depr = ov("depreciation", idx, rawDepr, false);
      const otherStaff = sumRange(rows, ["7900","7999"], m) * mult.costs;
      const totalOpex = cogs + external + staff + depr + otherStaff;
      const ebit = rev - totalOpex;

      const intIncome = ov("int_income", idx, rawIntIncome, true);
      const intExpense = ov("int_expense", idx, rawIntExpense, false);
      const otherFin = ov("other_fin", idx, rawOtherFin, true);
      const finNet = intIncome - intExpense + otherFin;

      const ebt = ebit + finNet;
      const tax = ebt > 0 ? ebt * 0.206 : 0;
      const netResult = ebt - tax;

      return { rev, netSales, activatedWork, otherRevIncome, cogs, rawMaterials, inventoryChange,
        grossProfit, staff, salaries, socialFees, pension, premises, external, marketing, itSw, otherExt,
        depr, totalOpex, ebit, finNet, intIncome, intExpense, otherFin, ebt, tax, netResult };
    }

    if (driverRR && driverRR[idx]) {
      const d = driverRR[idx];
      // Driver data already has scenario applied via Budget.tsx scenarioDrivers
      // But apply manual overrides on top
      const netSales = manualOverrides[`net_sales_${idx}`] ?? d.revenue;
      const rev = netSales;
      const rawMaterials = manualOverrides[`raw_mat_${idx}`] ?? d.cogs;
      const cogs = rawMaterials;
      const grossProfit = rev - cogs;
      const salaries = manualOverrides[`salaries_${idx}`] ?? d.salaries;
      const socialFees = manualOverrides[`social_fees_${idx}`] ?? d.salaries * 0.3142;
      const pension = manualOverrides[`pension_${idx}`] ?? d.salaries * 0.045;
      const staff = salaries + socialFees + pension;
      const premises = manualOverrides[`premises_${idx}`] ?? d.admin * 0.5;
      const marketing = manualOverrides[`marketing_${idx}`] ?? d.marketing;
      const itSw = manualOverrides[`it_sw_${idx}`] ?? d.rd;
      const otherExt = manualOverrides[`other_ext_${idx}`] ?? d.admin * 0.5;
      const external = premises + marketing + itSw + otherExt;
      const depr = manualOverrides[`depreciation_${idx}`] ?? d.depreciation;
      const ebit = grossProfit - staff - external - depr;
      const intIncome = manualOverrides[`int_income_${idx}`] ?? d.interestIncome;
      const intExpense = manualOverrides[`int_expense_${idx}`] ?? d.interestCost;
      const otherFin = manualOverrides[`other_fin_${idx}`] ?? 0;
      const finNet = intIncome - intExpense + otherFin;
      const ebt = ebit + finNet;
      const tax = ebt > 0 ? ebt * 0.206 : 0;
      const netResult = ebt - tax;
      const totalOpex = cogs + external + staff + depr;
      return {
        rev, netSales, activatedWork: 0, otherRevIncome: 0,
        cogs, rawMaterials, inventoryChange: 0,
        grossProfit, staff, salaries, socialFees, pension,
        premises, external, marketing, itSw, otherExt,
        depr, totalOpex, ebit, finNet, intIncome, intExpense, otherFin: otherFin,
        ebt, tax, netResult,
      };
    }

    return {
      rev: 0, netSales: 0, activatedWork: 0, otherRevIncome: 0,
      cogs: 0, rawMaterials: 0, inventoryChange: 0, grossProfit: 0,
      staff: 0, salaries: 0, socialFees: 0, pension: 0, premises: 0, external: 0,
      marketing: 0, itSw: 0, otherExt: 0, depr: 0, totalOpex: 0, ebit: 0,
      finNet: 0, intIncome: 0, intExpense: 0, otherFin: 0, ebt: 0, tax: 0, netResult: 0,
    };
  }), [rows, hasRowData, driverRR, scenario, manualOverrides, mult]);

  const line = (accessor: (d: typeof rrPerMonth[0]) => number): number[] =>
    padTo12(rrPerMonth.map(accessor));

  const annualRevenue = rrPerMonth.reduce((s, m) => s + m.rev, 0);
  const grossProfit = rrPerMonth.reduce((s, d) => s + d.grossProfit, 0);
  const ebit = rrPerMonth.reduce((s, d) => s + d.ebit, 0);
  const netResult = rrPerMonth.reduce((s, d) => s + d.netResult, 0);
  const grossMargin = annualRevenue > 0 ? (grossProfit / annualRevenue) * 100 : 0;
  const ebitMargin = annualRevenue > 0 ? (ebit / annualRevenue) * 100 : 0;
  const netMargin = annualRevenue > 0 ? (netResult / annualRevenue) * 100 : 0;

  const handleCellEdit = (rowKey: string, monthIndex: number, value: number) => {
    setManualOverrides(prev => ({ ...prev, [`${rowKey}_${monthIndex}`]: value }));
  };

  const hasOverrides = Object.keys(manualOverrides).length > 0;

  const rrRows: BudgetRow[] = useMemo(() => {
    const r: BudgetRow[] = [];
    r.push({ key: "rev_header", label: "RÖRELSENS INTÄKTER", variant: "header", values: padTo12(new Array(12).fill(0)) });
    r.push({ key: "net_sales", label: "  Nettoomsättning", values: line(d => d.netSales), indent: 1 });
    r.push({ key: "activated_work", label: "  Aktiverat arbete", values: line(d => d.activatedWork), indent: 1 });
    r.push({ key: "other_rev", label: "  Övriga rörelseintäkter", values: line(d => d.otherRevIncome), indent: 1 });
    r.push({ key: "sum_rev", label: "= SUMMA INTÄKTER", variant: "subtotal", values: line(d => d.rev) });

    r.push({ key: "cogs_header", label: "KOSTNAD SÅLDA VAROR", variant: "header", values: padTo12(new Array(12).fill(0)) });
    r.push({ key: "raw_mat", label: "  Råvaror och förnödenheter", values: line(d => d.rawMaterials), indent: 1 });
    r.push({ key: "inv_change", label: "  Förändring lager", values: line(d => d.inventoryChange), indent: 1 });
    r.push({ key: "sum_cogs", label: "= SUMMA COGS", variant: "subtotal", values: line(d => -d.cogs) });

    r.push({ key: "gross_profit", label: "BRUTTOVINST", variant: "milestone", values: line(d => d.grossProfit) });
    r.push({ key: "gross_margin", label: "Bruttomarginal %", variant: "metric", values: padTo12(rrPerMonth.map(d => d.rev > 0 ? (d.grossProfit / d.rev) * 100 : 0)) });

    r.push({ key: "opex_header", label: "RÖRELSEKOSTNADER (OPEX)", variant: "header", values: padTo12(new Array(12).fill(0)) });
    r.push({ key: "salaries", label: "  Löner och arvoden", values: line(d => d.salaries), indent: 1 });
    r.push({ key: "social_fees", label: "  Sociala avgifter", values: line(d => d.socialFees), indent: 1 });
    r.push({ key: "pension", label: "  Pensionskostnader", values: line(d => d.pension), indent: 1 });
    r.push({ key: "sum_staff", label: "= Summa personal", variant: "subtotal", values: line(d => d.staff) });
    r.push({ key: "premises", label: "  Lokalkostnader", values: line(d => d.premises), indent: 1 });
    r.push({ key: "marketing", label: "  Marknadsföring", values: line(d => d.marketing), indent: 1 });
    r.push({ key: "it_sw", label: "  IT och mjukvara", values: line(d => d.itSw), indent: 1 });
    r.push({ key: "other_ext", label: "  Övriga externa", values: line(d => d.otherExt), indent: 1 });
    r.push({ key: "sum_external", label: "= Summa övriga externa", variant: "subtotal", values: line(d => d.external) });
    r.push({ key: "depreciation", label: "  Avskrivningar", values: line(d => d.depr), indent: 1 });
    r.push({ key: "sum_opex", label: "= SUMMA RÖRELSEKOSTNADER", variant: "total", color: "slate", values: line(d => -(d.totalOpex)) });

    r.push({ key: "ebit", label: "RÖRELSERESULTAT (EBIT)", variant: "milestone", values: line(d => d.ebit) });
    r.push({ key: "ebit_margin", label: "Rörelsemarginal %", variant: "metric", values: padTo12(rrPerMonth.map(d => d.rev > 0 ? (d.ebit / d.rev) * 100 : 0)) });

    r.push({ key: "fin_header", label: "FINANSIELLA POSTER", variant: "header", values: padTo12(new Array(12).fill(0)) });
    r.push({ key: "int_income", label: "  Ränteintäkter", values: line(d => d.intIncome), indent: 1 });
    r.push({ key: "int_expense", label: "  Räntekostnader", values: line(d => -d.intExpense), indent: 1 });
    r.push({ key: "other_fin", label: "  Övriga finansiella poster", values: line(d => d.otherFin), indent: 1 });
    r.push({ key: "sum_fin", label: "= Netto finansiella poster", variant: "subtotal", values: line(d => d.finNet) });

    r.push({ key: "ebt", label: "RESULTAT FÖRE SKATT (EBT)", variant: "milestone", values: line(d => d.ebt) });
    r.push({ key: "tax", label: "  Skatt på årets resultat (20,6%)", values: line(d => -d.tax), indent: 1 });

    r.push({ key: "net_result", label: "ÅRETS RESULTAT", variant: "result", values: line(d => d.netResult) });
    r.push({ key: "net_margin", label: "Nettomarginal %", variant: "metric", values: padTo12(rrPerMonth.map(d => d.rev > 0 ? (d.netResult / d.rev) * 100 : 0)) });

    return r;
  }, [rrPerMonth]);

  return (
    <div className="flex flex-col h-full">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 px-3 pt-3">
        {[
          {
            label: "Nettoomsättning",
            value: formatSEK(annualRevenue),
            bg: "linear-gradient(135deg, #1e3a5f 0%, #0052FF 100%)",
            labelColor: "text-blue-200",
            sub: "Helår prognos",
          },
          {
            label: "Bruttomarginal",
            value: `${grossMargin.toFixed(1)}%`,
            bg: "linear-gradient(135deg, #78350f 0%, #f59e0b 100%)",
            labelColor: "text-amber-200",
            sub: `Bruttovinst: ${formatSEK(grossProfit)}`,
          },
          {
            label: "EBIT (Rörelseresultat)",
            value: formatSEK(ebit),
            bg: "linear-gradient(135deg, #3b0764 0%, #7c3aed 100%)",
            labelColor: "text-violet-200",
            sub: `Rörelsemarginal ${ebitMargin.toFixed(1)}%`,
          },
          {
            label: "Årets resultat",
            value: formatSEK(netResult),
            bg: netResult > 0
              ? "linear-gradient(135deg, #064e3b 0%, #10b981 100%)"
              : netResult < 0
              ? "linear-gradient(135deg, #4c0519 0%, #e11d48 100%)"
              : "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
            labelColor: netResult > 0 ? "text-emerald-200" : netResult < 0 ? "text-rose-200" : "text-slate-300",
            sub: `Nettomarginal ${netMargin.toFixed(1)}%`,
          },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-2xl p-6 min-h-[130px] shadow-xl relative overflow-hidden text-white flex flex-col justify-between"
            style={{ background: card.bg }}
          >
            <span className={`${card.labelColor} text-xs font-medium uppercase tracking-widest`}>{card.label}</span>
            <p className="text-3xl font-black mt-2 tabular-nums">{card.value}</p>
            <span className="text-white/60 text-xs mt-1">{card.sub}</span>
          </div>
        ))}
      </div>

      {/* Waterfall Chart */}
      {annualRevenue !== 0 && (
        <div className="mx-3 mb-4 bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Intäkter → Årets resultat
            </span>
            <button
              onClick={() => setShowWaterfall(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              {showWaterfall ? <Table className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
              {showWaterfall ? "Visa som tabell" : "Visa som diagram"}
            </button>
          </div>
          {showWaterfall && (
            <div className="px-2 py-1">
              <WaterfallChart
                revenue={annualRevenue}
                cogs={rrPerMonth.reduce((s, d) => s + d.cogs, 0)}
                grossProfit={grossProfit}
                opex={rrPerMonth.reduce((s, d) => s + d.totalOpex, 0) - rrPerMonth.reduce((s, d) => s + d.cogs, 0)}
                ebit={ebit}
                tax={rrPerMonth.reduce((s, d) => s + d.tax, 0)}
                netIncome={netResult}
              />
            </div>
          )}
        </div>
      )}

      {/* View Toggle + Scenario */}
      <div className="px-3 mb-2 flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {([
            { key: "budget" as const, label: "Budget" },
            { key: "comparison" as const, label: "Budget vs Utfall" },
            { key: "forecast" as const, label: "Prognos" },
          ]).map(v => (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                budgetView === v.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <select
          value={scenario}
          onChange={e => onScenarioChange(e.target.value as ScenarioType)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800"
        >
          <option value="base">📊 Basscenario</option>
          <option value="optimistic">📈 Optimistiskt (+20%)</option>
          <option value="pessimistic">📉 Pessimistiskt (−20%)</option>
        </select>
        {hasOverrides && (
          <button
            onClick={() => setManualOverrides({})}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#7A1A1A] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Återställ manuella värden
          </button>
        )}
      </div>

      {/* Budget Table */}
      <div className="px-3 pb-4">
        {budgetView === "budget" && (
          <BudgetMonthTable
            rows={rrRows}
            title="Resultaträkning"
            editableKeys={EDITABLE_ROW_KEYS}
            onCellEdit={handleCellEdit}
            manualOverrides={manualOverrides}
          />
        )}
        {budgetView === "comparison" && (
          <ComparisonTable rrPerMonth={rrPerMonth} />
        )}
        {budgetView === "forecast" && (
          <ForecastTable rrPerMonth={rrPerMonth} rrRows={rrRows} />
        )}
      </div>
    </div>
  );
};

/* ── Row config for Comparison & Forecast ── */
type RowTier = "normal" | "milestone" | "result";

interface CompRow {
  key: string;
  label: string;
  accessor: (d: any) => number;
  isRevenue: boolean;
  tier: RowTier;
}

const COMPARISON_ROWS: CompRow[] = [
  { key: "netSales", label: "Nettoomsättning", accessor: (d: any) => d.netSales, isRevenue: true, tier: "normal" },
  { key: "cogs", label: "Råvaror och förnödenheter", accessor: (d: any) => d.rawMaterials, isRevenue: false, tier: "normal" },
  { key: "grossProfit", label: "Bruttovinst", accessor: (d: any) => d.grossProfit, isRevenue: true, tier: "milestone" },
  { key: "salaries", label: "Löner och arvoden", accessor: (d: any) => d.salaries, isRevenue: false, tier: "normal" },
  { key: "socialFees", label: "Sociala avgifter", accessor: (d: any) => d.socialFees, isRevenue: false, tier: "normal" },
  { key: "pension", label: "Pensionskostnader", accessor: (d: any) => d.pension, isRevenue: false, tier: "normal" },
  { key: "premises", label: "Lokalkostnader", accessor: (d: any) => d.premises, isRevenue: false, tier: "normal" },
  { key: "marketing", label: "Marknadsföring", accessor: (d: any) => d.marketing, isRevenue: false, tier: "normal" },
  { key: "itSw", label: "IT och mjukvara", accessor: (d: any) => d.itSw, isRevenue: false, tier: "normal" },
  { key: "ebit", label: "EBIT", accessor: (d: any) => d.ebit, isRevenue: true, tier: "milestone" },
  { key: "ebt", label: "EBT", accessor: (d: any) => d.ebt, isRevenue: true, tier: "milestone" },
  { key: "netResult", label: "Årets resultat", accessor: (d: any) => d.netResult, isRevenue: true, tier: "result" },
];

function getCompRowClass(tier: RowTier, key: string): string {
  if (tier === "result") return "bg-emerald-50/50 dark:bg-emerald-950/10 font-black text-base";
  if (tier === "milestone") {
    if (key.includes("gross")) return "bg-indigo-50/50 dark:bg-indigo-950/10 font-bold border-l-4 border-l-indigo-400 dark:border-l-indigo-500";
    if (key.includes("ebit") && !key.includes("ebt")) return "bg-violet-50/50 dark:bg-violet-950/10 font-bold border-l-4 border-l-violet-400 dark:border-l-violet-500";
    return "bg-slate-50 dark:bg-slate-800/30 font-bold";
  }
  return "hover:bg-slate-50/80 dark:hover:bg-slate-800/30";
}

function getStickyCompBg(tier: RowTier, key: string): string {
  if (tier === "result") return "bg-emerald-50/50 dark:bg-emerald-950/10";
  if (tier === "milestone") {
    if (key.includes("gross")) return "bg-indigo-50/50 dark:bg-indigo-950/10";
    if (key.includes("ebit") && !key.includes("ebt")) return "bg-violet-50/50 dark:bg-violet-950/10";
    return "bg-slate-50 dark:bg-slate-800/30";
  }
  return "bg-white dark:bg-card";
}

/* ── Comparison Table (Budget vs Utfall) ── */
function ComparisonTable({ rrPerMonth }: { rrPerMonth: any[] }) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed" style={{ minWidth: "1400px" }}>
          <colgroup>
            <col style={{ width: "200px" }} />
            {BUDGET_MONTHS.map(m => (
              <React.Fragment key={m.key}>
                <col style={{ width: "70px" }} />
                <col style={{ width: "70px" }} />
                <col style={{ width: "55px" }} />
              </React.Fragment>
            ))}
          </colgroup>
          <thead className="sticky top-0 z-30">
            <tr className="bg-slate-800 dark:bg-slate-900 text-slate-300">
              <th className="text-left px-4 py-3 sticky left-0 z-40 bg-slate-800 dark:bg-slate-900 text-xs font-semibold uppercase tracking-wider border-r border-slate-700">
                Post
              </th>
              {BUDGET_MONTHS.map(m => (
                <th key={m.key} colSpan={3} className="text-center px-1 py-3 border-l border-slate-700 text-xs font-semibold uppercase tracking-wider">
                  {m.label}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-700 dark:bg-slate-800 text-slate-400">
              <th className="sticky left-0 z-40 bg-slate-700 dark:bg-slate-800 border-r border-slate-600" />
              {BUDGET_MONTHS.map(m => (
                <React.Fragment key={m.key}>
                  <th className="text-[10px] text-slate-400 text-center px-1 py-1.5 font-medium">Budget</th>
                  <th className="text-[10px] text-slate-400 text-center px-1 py-1.5 font-medium">Utfall</th>
                  <th className="text-[10px] font-semibold text-center px-1 py-1.5 text-indigo-400">Δ%</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map(row => {
              const budgetValues = rrPerMonth.map(row.accessor);
              return (
                <tr key={row.key} className={cn(
                  "border-b border-slate-100 dark:border-slate-800 transition-colors",
                  getCompRowClass(row.tier, row.key)
                )}>
                  <td className={cn(
                    "px-4 py-2.5 sticky left-0 z-20 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700",
                    getStickyCompBg(row.tier, row.key)
                  )}>
                    {row.label}
                  </td>
                  {budgetValues.map((bv, i) => {
                    const uv = 0;
                    const delta = Math.abs(bv) > 0 ? ((uv - bv) / Math.abs(bv)) * 100 : null;
                    const deltaColor = delta === null ? "text-slate-300 dark:text-slate-600" :
                      row.isRevenue
                        ? (delta >= 0 ? "text-[#085041] dark:text-[#1D9E75]" : "text-[#7A1A1A] dark:text-[#C73838]")
                        : (delta >= 0 ? "text-[#7A1A1A] dark:text-[#C73838]" : "text-[#085041] dark:text-[#1D9E75]");
                    return (
                      <React.Fragment key={i}>
                        <td className="text-right px-2 py-2.5 tabular-nums font-mono text-slate-700 dark:text-slate-300">
                          {Math.abs(bv) < 1 ? <span className="text-slate-300 dark:text-slate-600">—</span> : formatSEK(Math.round(bv))}
                        </td>
                        <td className="text-right px-2 py-2.5 tabular-nums font-mono text-slate-400 dark:text-slate-500">
                          {uv === 0 ? <span className="text-slate-300 dark:text-slate-600">—</span> : formatSEK(Math.round(uv))}
                        </td>
                        <td className={cn("text-right px-2 py-2.5 tabular-nums font-mono font-semibold", deltaColor)}>
                          {delta === null ? <span className="text-slate-300 dark:text-slate-600">—</span> : `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
        U = Utfall (bokföring). Kopplas automatiskt när data finns tillgänglig.
      </div>
    </div>
  );
}

/* ── Forecast Table (Rolling Forecast) ── */
function ForecastTable({ rrPerMonth, rrRows }: { rrPerMonth: any[]; rrRows: BudgetRow[] }) {
  const currentMonth = new Date().getMonth();

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed" style={{ minWidth: "1200px" }}>
          <colgroup>
            <col style={{ width: "200px" }} />
            {BUDGET_MONTHS.map(() => <col style={{ width: "75px" }} />)}
            <col style={{ width: "100px" }} />
          </colgroup>
          <thead className="sticky top-0 z-30">
            <tr className="bg-slate-800 dark:bg-slate-900 text-slate-300">
              <th className="text-left px-4 py-3 sticky left-0 z-40 bg-slate-800 dark:bg-slate-900 text-xs font-semibold uppercase tracking-wider border-r border-slate-700">
                Post
              </th>
              {BUDGET_MONTHS.map((m, i) => (
                <th key={m.key} className={cn(
                  "text-center px-2 py-3 border-l border-slate-700 text-xs font-semibold uppercase tracking-wider relative",
                  i === currentMonth && "border-l-2 border-l-indigo-400"
                )}>
                  {m.label}
                  {i === currentMonth && (
                    <div className="absolute -bottom-0 left-0 right-0 text-[8px] text-indigo-300 font-normal normal-case tracking-normal">← Utfall | Prognos →</div>
                  )}
                </th>
              ))}
              <th className="text-center px-2 py-3 border-l border-slate-700 text-indigo-200 font-semibold text-xs uppercase tracking-wider bg-indigo-900 dark:bg-indigo-950">
                Prognos helår
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map(row => {
              const budgetValues = rrPerMonth.map(row.accessor);
              const helaar = budgetValues.reduce((s, v) => s + v, 0);
              return (
                <tr key={row.key} className={cn(
                  "border-b border-slate-100 dark:border-slate-800 transition-colors",
                  getCompRowClass(row.tier, row.key)
                )}>
                  <td className={cn(
                    "px-4 py-2.5 sticky left-0 z-20 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700",
                    getStickyCompBg(row.tier, row.key)
                  )}>
                    {row.label}
                  </td>
                  {budgetValues.map((v, i) => {
                    const isActual = i < currentMonth;
                    return (
                      <td key={i} className={cn(
                        "text-right px-2 py-2.5 tabular-nums font-mono",
                        isActual
                          ? "bg-slate-50/80 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400"
                          : "text-slate-700 dark:text-slate-300",
                        i === currentMonth && "border-l-2 border-l-indigo-200 dark:border-l-indigo-700"
                      )}>
                        {Math.abs(v) < 1 ? <span className="text-slate-300 dark:text-slate-600">—</span> : formatSEK(Math.round(v))}
                      </td>
                    );
                  })}
                  <td className={cn(
                    "text-right px-3 py-2.5 tabular-nums font-mono font-bold border-l border-[#C8DDF5] dark:border-indigo-800",
                    "bg-[#EFF6FF] dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                  )}>
                    {Math.abs(helaar) < 1 ? <span className="text-slate-300 dark:text-slate-600">—</span> : formatSEK(Math.round(helaar))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
        Månader före nuvarande visar utfall, resterande visar budgetvärden.
      </div>
    </div>
  );
}
