import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  MONTH_KEYS, BudgetRowData,
  buildCashFlowLines, formatSEK, cashHeatColor, calcCosts,
} from "@/lib/budget/budgetEngine";
import { BUDGET_MONTHS } from "@/lib/budget/budgetMonths";
import { BudgetMonthTable, type BudgetRow } from "./BudgetMonthTable";
import { KFMonth, MONTH_LABELS } from "@/lib/budget/driverEngine";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

const padTo12 = (arr: number[]) => [...arr, ...Array(12 - arr.length).fill(0)].slice(0, 12);

interface BudgetCashFlowProps {
  rrRows: BudgetRowData[];
  cfData: Record<string, number[]>;
  onCFChange: (key: string, monthIdx: number, value: number) => void;
  isLocked: boolean;
  driverKF?: KFMonth[];
}

export const BudgetCashFlow = ({ rrRows, cfData, onCFChange, isLocked, driverKF }: BudgetCashFlowProps) => {
  const lines = buildCashFlowLines(rrRows, cfData);
  const closingLine = lines.find(l => l.key === "closing_cash");
  const closingValues = closingLine?.values || new Array(12).fill(0);
  const avgMonthlyCost = MONTH_KEYS.reduce((s, m) => s + calcCosts(rrRows, m), 0) / 12;

  // Build BudgetRow[] from cash flow lines
  const cfRows: BudgetRow[] = useMemo(() => {
    return lines.map(line => {
      const isSection = line.values.length === 0 && line.isSummary;
      const variant: BudgetRow["variant"] = isSection ? "header" : line.isSummary ? "subtotal" : undefined;
      return {
        key: line.key,
        label: line.label,
        variant,
        values: padTo12(line.values.length > 0 ? line.values : new Array(12).fill(0)),
        indent: line.indent,
      };
    });
  }, [lines]);

  // Cash position chart data from driver model
  const cashChartData = useMemo(() => {
    if (driverKF && driverKF.length > 0) {
      return driverKF.map((m, i) => ({
        name: MONTH_LABELS[i],
        cash: Math.round(m.closingCash),
        operatingCF: Math.round(m.operatingCF),
      }));
    }
    return MONTH_LABELS.map((label, i) => ({
      name: label,
      cash: closingValues[i] || 0,
      operatingCF: 0,
    }));
  }, [driverKF, closingValues]);

  const minCash = Math.min(...cashChartData.map(d => d.cash));
  const negativeMonth = cashChartData.findIndex(d => d.cash < 0);

  // Runway calculation
  const avgBurn = driverKF
    ? driverKF.reduce((s, m) => s + m.netCashFlow, 0) / 12
    : 0;
  const endCash = driverKF ? driverKF[11]?.closingCash || 0 : closingValues[11] || 0;
  const runway = avgBurn < 0 ? Math.floor(endCash / Math.abs(avgBurn)) : null;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Cash Position Chart */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">Kassaposition över tid</p>
          <div className="flex items-center gap-3 text-[10px]">
            {runway !== null && (
              <span className={cn(
                "px-2 py-0.5 rounded-full font-semibold",
                runway <= 3 ? "bg-[#FCE8E8] text-[#7A1A1A]" : runway <= 6 ? "bg-[#FAEEDA] text-[#7A5417]" : "bg-[#E1F5EE] text-[#085041]"
              )}>
                Runway: {runway} mån
              </span>
            )}
            <span className="text-muted-foreground">Slutkassa: <span className={cn("font-bold", endCash >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>{formatSEK(Math.round(endCash))} kr</span></span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={cashChartData}>
            <defs>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `${formatSEK(v)} kr`} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
            <Area type="monotone" dataKey="cash" fill="url(#cashGrad)" stroke="#6366f1" strokeWidth={2} name="Kassa" />
          </AreaChart>
        </ResponsiveContainer>
        {negativeMonth >= 0 && (
          <p className="text-[10px] text-[#7A1A1A] font-semibold mt-1">
            ⚠️ Kassan blir negativ i {MONTH_LABELS[negativeMonth]}
          </p>
        )}
      </div>

      {/* Budget Table — always 12 months via BudgetMonthTable */}
      <div className="px-3 pb-2">
        <BudgetMonthTable rows={cfRows} title="Kassaflödespost" />
      </div>

      {/* Cash Heatmap */}
      <div className="px-3 pb-4">
        <p className="text-xs font-semibold mb-2">Likviditets-heatmap — projicerad kassa per månad</p>
        {(() => {
          const heatValues = driverKF && driverKF.length === 12
            ? driverKF.map(m => m.closingCash)
            : closingValues;
          return (
            <div className="flex gap-1">
              {heatValues.map((v: number, i: number) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 h-10 rounded-md flex flex-col items-center justify-center text-[10px] font-medium tabular-nums transition-colors",
                    cashHeatColor(v, avgMonthlyCost)
                  )}
                  title={`${BUDGET_MONTHS[i]?.label}: ${formatSEK(Math.round(v))} kr`}
                >
                  <span>{BUDGET_MONTHS[i]?.label}</span>
                  <span>{(v / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
