import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle } from "lucide-react";
import {
  MONTH_KEYS, BudgetRowData, MonthKey,
  calcRevenue, calcCosts, calcEBIT, calcFinancialNet,
  calcResultBeforeTax, calcTax, calcNetResult, sumRange,
} from "@/lib/budget/budgetEngine";

function formatSEK(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("sv-SE", { style: "decimal", maximumFractionDigits: 0 }).format(v) + " kr";
}

interface Props {
  rows: BudgetRowData[];
  cfData: Record<string, number[]>;
}

type PeriodMode = "month" | "quarter" | "year";

type RowType = "header" | "account" | "subtotal" | "total" | "kpi";

export const BudgetFinancialStatements = ({ rows, cfData }: Props) => {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("year");

  const rrPerMonth = useMemo(() => MONTH_KEYS.map(m => {
    const rev = calcRevenue(rows, m);
    const cogs = sumRange(rows, ["4000", "4999"], m);
    const grossProfit = rev - cogs;
    const staff = sumRange(rows, ["7000", "7699"], m);
    const external = sumRange(rows, ["5000", "6999"], m);
    const depr = sumRange(rows, ["7700", "7899"], m);
    const ebit = calcEBIT(rows, m);
    const finNet = calcFinancialNet(rows, m);
    const ebt = calcResultBeforeTax(rows, m);
    const tax = calcTax(rows, m);
    const net = calcNetResult(rows, m);
    return { rev, cogs, grossProfit, staff, external, depr, ebit, finNet, ebt, tax, net };
  }), [rows]);

  const annual = useMemo(() => ({
    rev: rrPerMonth.reduce((s, d) => s + d.rev, 0),
    cogs: rrPerMonth.reduce((s, d) => s + d.cogs, 0),
    grossProfit: rrPerMonth.reduce((s, d) => s + d.grossProfit, 0),
    staff: rrPerMonth.reduce((s, d) => s + d.staff, 0),
    external: rrPerMonth.reduce((s, d) => s + d.external, 0),
    depr: rrPerMonth.reduce((s, d) => s + d.depr, 0),
    ebit: rrPerMonth.reduce((s, d) => s + d.ebit, 0),
    finNet: rrPerMonth.reduce((s, d) => s + d.finNet, 0),
    ebt: rrPerMonth.reduce((s, d) => s + d.ebt, 0),
    tax: rrPerMonth.reduce((s, d) => s + d.tax, 0),
    net: rrPerMonth.reduce((s, d) => s + d.net, 0),
  }), [rrPerMonth]);

  const bsData = useMemo(() => {
    const get = (key: string) => cfData[key] || new Array(12).fill(0);
    const cumDepr = rrPerMonth.reduce((s, d) => s + d.depr, 0);
    const capex = get("tangible_capex").reduce((s: number, v: number) => s + Math.abs(v), 0);
    const tangible = capex - cumDepr;
    const receivables = Math.round(annual.rev / 12 * 30 / 30);
    const payables = Math.round(annual.cogs / 12 * 30 / 30);
    const closingCashArr = get("closing_cash");
    const cash = closingCashArr[11] || get("opening_cash")[0] || 0;
    const totalAssets = tangible + receivables + cash;
    const equity = annual.net;
    const totalEqLiab = equity + payables;
    const diff = totalAssets - totalEqLiab;
    return { tangible, receivables, cash, totalAssets, equity, payables, totalEqLiab, diff };
  }, [rows, cfData, annual, rrPerMonth]);

  const grossMargin = annual.rev > 0 ? (annual.grossProfit / annual.rev * 100).toFixed(1) : "0.0";
  const ebitMargin = annual.rev > 0 ? (annual.ebit / annual.rev * 100).toFixed(1) : "0.0";

  const renderRow = (label: string, value: number, type: RowType = "account", indent = 0) => {
    const isHeader = type === "header";
    const isTotal = type === "total";
    const isSubtotal = type === "subtotal";
    const isKPI = type === "kpi";

    return (
      <tr className={cn(
        "transition-colors",
        isHeader && "bg-slate-100 dark:bg-slate-800",
        isTotal && "bg-slate-800 dark:bg-slate-900",
        isSubtotal && "bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700",
        isKPI && "bg-blue-50/50 dark:bg-blue-950/10 border-b border-blue-100 dark:border-[#3b82f6]",
        type === "account" && "border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
      )}>
        <td className={cn(
          "py-2.5 px-4 text-xs",
          isHeader && "font-black uppercase tracking-widest text-slate-500 dark:text-slate-400",
          isTotal && "text-sm font-black text-white",
          isSubtotal && "font-semibold text-slate-800 dark:text-slate-200",
          isKPI && "font-semibold text-[#3b82f6] dark:text-[#1E3A5F]",
          type === "account" && "text-slate-700 dark:text-slate-300"
        )} style={{ paddingLeft: `${16 + indent * 16}px` }}>
          {label}
        </td>
        {!isHeader ? (
          <td className={cn(
            "py-2.5 px-4 text-right tabular-nums font-mono",
            isTotal && "text-sm font-black text-white",
            isSubtotal && "text-xs font-bold text-slate-800 dark:text-slate-200",
            isKPI && "text-xs font-bold text-[#3b82f6] dark:text-[#1E3A5F]",
            type === "account" && (value === 0 ? "text-slate-300 dark:text-slate-600 text-xs" : value < 0 ? "text-[#7A1A1A] dark:text-[#C73838] italic text-xs" : "text-slate-800 dark:text-slate-200 text-xs"),
          )}>
            {isKPI ? `${value}%` : value === 0 ? "—" : formatSEK(value)}
          </td>
        ) : (
          <td />
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Tabs value={periodMode} onValueChange={v => setPeriodMode(v as PeriodMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="year" className="text-xs h-7 px-3">Helår</TabsTrigger>
            <TabsTrigger value="quarter" className="text-xs h-7 px-3">Kvartal</TabsTrigger>
            <TabsTrigger value="month" className="text-xs h-7 px-3">Månad</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RESULTATRÄKNING */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card shadow-sm">
          <div className="px-4 py-3 bg-slate-800 dark:bg-slate-900 flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-[#3b82f6]" />
            <h3 className="text-sm font-bold text-white">Resultaträkning</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <colgroup>
                <col style={{ width: "60%" }} />
                <col style={{ width: "40%" }} />
              </colgroup>
              <tbody>
                {renderRow("RÖRELSENS INTÄKTER", 0, "header")}
                {renderRow("Nettoomsättning", sumRange(rows, ["3000","3799"], "jan" as MonthKey) > 0 ? MONTH_KEYS.reduce((s,m) => s + sumRange(rows, ["3000","3799"], m), 0) : annual.rev, "account", 1)}
                {renderRow("Övriga rörelseintäkter", MONTH_KEYS.reduce((s,m) => s + sumRange(rows, ["3900","3999"], m), 0), "account", 1)}
                {renderRow("= SUMMA INTÄKTER", annual.rev, "total")}

                {renderRow("KOSTNAD FÖR SÅLDA VAROR", 0, "header")}
                {renderRow("Råvaror och förnödenheter", -annual.cogs, "account", 1)}
                {renderRow("= SUMMA COGS", -annual.cogs, "subtotal")}

                {renderRow("BRUTTOVINST", annual.grossProfit, "total")}
                {renderRow(`Bruttomarginal`, parseFloat(grossMargin), "kpi")}

                {renderRow("RÖRELSEKOSTNADER", 0, "header")}
                {renderRow("Personalkostnader", -annual.staff, "account", 1)}
                {renderRow("Övriga externa kostnader", -annual.external, "account", 1)}
                {renderRow("Avskrivningar", -annual.depr, "account", 1)}

                {renderRow("RÖRELSERESULTAT (EBIT)", annual.ebit, "total")}
                {renderRow(`Rörelsemarginal`, parseFloat(ebitMargin), "kpi")}

                {renderRow("FINANSIELLA POSTER", 0, "header")}
                {renderRow("Netto finansiella poster", annual.finNet, "account", 1)}
                {renderRow("= RESULTAT FÖRE SKATT", annual.ebt, "subtotal")}
                {renderRow("Skatt (20,6%)", -annual.tax, "account", 1)}
                {renderRow("ÅRETS RESULTAT", annual.net, "total")}
              </tbody>
            </table>
          </div>
        </div>

        {/* BALANSRÄKNING */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card shadow-sm">
          <div className="px-4 py-3 bg-slate-800 dark:bg-slate-900 flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-violet-400" />
            <h3 className="text-sm font-bold text-white">Balansräkning</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <colgroup>
                <col style={{ width: "60%" }} />
                <col style={{ width: "40%" }} />
              </colgroup>
              <tbody>
                {renderRow("TILLGÅNGAR", 0, "header")}
                {renderRow("Anläggningstillgångar", bsData.tangible, "account", 1)}
                {renderRow("Kundfordringar", bsData.receivables, "account", 1)}
                {renderRow("Likvida medel", bsData.cash, "account", 1)}
                {renderRow("= SUMMA TILLGÅNGAR", bsData.totalAssets, "total")}

                {renderRow("EGET KAPITAL", 0, "header")}
                {renderRow("Aktiekapital", 25000, "account", 1)}
                {renderRow("Balanserat resultat", 0, "account", 1)}
                {renderRow("Årets resultat", bsData.equity, "account", 1)}
                {renderRow("= Summa eget kapital", bsData.equity + 25000, "subtotal")}

                {renderRow("SKULDER", 0, "header")}
                {renderRow("Leverantörsskulder", bsData.payables, "account", 1)}
                {renderRow("Övriga skulder", 0, "account", 1)}

                {renderRow("= SUMMA EK + SKULDER", bsData.totalEqLiab + 25000, "total")}
              </tbody>
            </table>

            {/* Balance check */}
            <div className={cn(
              "flex items-center gap-2 py-3 px-4",
              Math.abs(bsData.diff - 25000) < 1 ? "bg-[#E1F5EE] dark:bg-emerald-950/20" : "bg-[#FCE8E8] dark:bg-rose-950/20"
            )}>
              {Math.abs(bsData.diff - 25000) < 1 ? (
                <><CheckCircle className="w-4 h-4 text-[#085041] dark:text-[#1D9E75]" /><span className="text-sm font-bold text-[#085041] dark:text-[#1D9E75]">✓ Balanserad</span></>
              ) : (
                <><AlertTriangle className="w-4 h-4 text-[#7A1A1A] dark:text-[#C73838]" /><span className="text-sm font-bold text-[#7A1A1A] dark:text-[#C73838]">Differens: {formatSEK(bsData.diff - 25000)}</span></>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
