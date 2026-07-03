import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MONTH_KEYS, MonthKey, BudgetRowData,
  calcNetResult, calcRevenue, sumRange, calcEBIT, calcResultBeforeTax, calcTax,
} from "@/lib/budget/budgetEngine";
import { BRMonth } from "@/lib/budget/driverEngine";
import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { EquityBridgeChart } from "./EquityBridgeChart";
import { CashRunwayCard } from "./CashRunwayCard";
import { BudgetMonthTable, type BudgetRow } from "./BudgetMonthTable";

function formatSEK(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("sv-SE", { style: "decimal", maximumFractionDigits: 0 }).format(v) + " kr";
}

const padTo12 = (arr: number[]) => [...arr, ...Array(12 - arr.length).fill(0)].slice(0, 12);

interface BudgetBalanceSheetProps {
  rrRows: BudgetRowData[];
  cfData: Record<string, number[]>;
  driverBR?: BRMonth[];
}

export const BudgetBalanceSheet = ({ rrRows, cfData, driverBR }: BudgetBalanceSheetProps) => {
  const [dso, setDso] = useState(30);
  const [dpo, setDpo] = useState(30);
  const [openingBalances, setOpeningBalances] = useState({
    shareCapital: 25000,
    retainedEarnings: 0,
    openingCash: 0,
    existingLoans: 0,
  });

  const hasRowData = useMemo(() => rrRows.some(r => MONTH_KEYS.some(m => (r[m] || 0) !== 0)), [rrRows]);

  // ─── Monthly calculations ────────────────────────────────────
  const revenue = MONTH_KEYS.map(m => hasRowData ? calcRevenue(rrRows, m) : 0);
  const cogs = MONTH_KEYS.map(m => hasRowData ? sumRange(rrRows, ["4000", "4999"], m) : 0);
  const depreciation = MONTH_KEYS.map(m => hasRowData ? sumRange(rrRows, ["7700", "7899"], m) : 0);
  const netResult = MONTH_KEYS.map(m => hasRowData ? calcNetResult(rrRows, m) : 0);
  const tax = MONTH_KEYS.map(m => hasRowData ? calcTax(rrRows, m) : 0);

  const get = (key: string) => cfData[key] || new Array(12).fill(0);
  const tangibleCapex = get("tangible_capex");
  const intangibleCapex = get("intangible_capex");
  const loansReceived = get("loans_received");
  const loanRepayment = get("loan_repayment");

  const useDriver = !hasRowData && driverBR && driverBR.length === 12;

  const cumNetResult = netResult.reduce<number[]>((acc, v, i) => { acc.push((acc[i-1] || 0) + v); return acc; }, []);
  const cumDepreciation = depreciation.reduce<number[]>((acc, v, i) => { acc.push((acc[i-1] || 0) + v); return acc; }, []);
  const cumTangibleCapex = tangibleCapex.reduce<number[]>((acc, v, i) => { acc.push((acc[i-1] || 0) + Math.abs(v)); return acc; }, []);
  const cumIntangibleCapex = intangibleCapex.reduce<number[]>((acc, v, i) => { acc.push((acc[i-1] || 0) + Math.abs(v)); return acc; }, []);

  const intangibleAssets = MONTH_KEYS.map((_, i) => useDriver ? 0 : cumIntangibleCapex[i]);
  const tangibleAssets = MONTH_KEYS.map((_, i) => useDriver ? driverBR![i].fixedAssets : cumTangibleCapex[i] - cumDepreciation[i]);
  const financialAssets = MONTH_KEYS.map(() => 0);
  const fixedAssets = MONTH_KEYS.map((_, i) => intangibleAssets[i] + tangibleAssets[i] + financialAssets[i]);

  const inventory = MONTH_KEYS.map((_, i) => useDriver ? driverBR![i].inventory : 0);
  const receivables = MONTH_KEYS.map((_, i) => useDriver ? driverBR![i].accountsReceivable : Math.round((revenue[i] / 30) * dso));
  const otherReceivables = MONTH_KEYS.map(() => 0);
  const prepaidExpenses = MONTH_KEYS.map(() => 0);

  const shareCapital = MONTH_KEYS.map(() => openingBalances.shareCapital);
  const surplusFund = MONTH_KEYS.map(() => 0);
  const retainedEarnings = MONTH_KEYS.map(() => openingBalances.retainedEarnings);
  const yearResult = useDriver
    ? MONTH_KEYS.map((_, i) => driverBR![i].cumulativeNetIncome)
    : cumNetResult;
  const totalEquity = MONTH_KEYS.map((_, i) => shareCapital[i] + surplusFund[i] + retainedEarnings[i] + yearResult[i]);

  const cumLoans = loansReceived.reduce<number[]>((acc, v, i) => { acc.push((acc[i-1] || 0) + v); return acc; }, []);
  const cumRepayment = loanRepayment.reduce<number[]>((acc, v, i) => { acc.push((acc[i-1] || 0) + Math.abs(v)); return acc; }, []);
  const longTermLoans = MONTH_KEYS.map((_, i) => useDriver ? driverBR![i].loans : openingBalances.existingLoans + cumLoans[i] - cumRepayment[i]);
  const otherLtLiab = MONTH_KEYS.map(() => 0);
  const totalLtLiab = MONTH_KEYS.map((_, i) => longTermLoans[i] + otherLtLiab[i]);

  const payables = MONTH_KEYS.map((_, i) => useDriver ? driverBR![i].accountsPayable : Math.round((cogs[i] / 30) * dpo));
  const taxLiab = MONTH_KEYS.map((_, i) => tax[i]);
  const vatLiab = MONTH_KEYS.map((_, i) => hasRowData ? Math.round(revenue[i] * 0.25 - cogs[i] * 0.25) : 0);
  const accruedSalaries = MONTH_KEYS.map(m => hasRowData ? Math.round(sumRange(rrRows, ["7010", "7090"], m) * 0.3142) : 0);
  const otherStLiab = MONTH_KEYS.map(() => 0);
  const totalStLiab = MONTH_KEYS.map((_, i) => payables[i] + taxLiab[i] + vatLiab[i] + accruedSalaries[i] + otherStLiab[i]);

  const totalLiabilities = MONTH_KEYS.map((_, i) => totalLtLiab[i] + totalStLiab[i]);

  const hasCFCash = get("closing_cash").some(v => v !== 0) || get("opening_cash").some(v => v !== 0);
  const cash = MONTH_KEYS.map((_, i) => {
    if (useDriver) return driverBR![i].cash;
    if (hasCFCash) {
      const closingCashArr = get("closing_cash");
      const openingCashArr = get("opening_cash");
      if (closingCashArr.some(v => v !== 0)) return closingCashArr[i] || 0;
      return openingCashArr[i] || 0;
    }
    return totalEquity[i] + totalLiabilities[i] - fixedAssets[i] - inventory[i] - receivables[i] - otherReceivables[i] - prepaidExpenses[i];
  });

  const currentAssets = MONTH_KEYS.map((_, i) => inventory[i] + receivables[i] + otherReceivables[i] + prepaidExpenses[i] + cash[i]);
  const totalAssets = MONTH_KEYS.map((_, i) => fixedAssets[i] + currentAssets[i]);
  const totalEqAndLiab = MONTH_KEYS.map((_, i) => totalEquity[i] + totalLtLiab[i] + totalStLiab[i]);
  const balanceDiff = MONTH_KEYS.map((_, i) => Math.round(totalAssets[i] - totalEqAndLiab[i]));
  const isDifferenceZero = balanceDiff.every(d => Math.abs(d) < 1);
  const soliditetCalc = MONTH_KEYS.map((_, i) => totalAssets[i] > 0 ? (totalEquity[i] / totalAssets[i]) * 100 : 0);

  // Build BudgetRow[]
  const brRows: BudgetRow[] = useMemo(() => {
    const r: BudgetRow[] = [];

    // Assets
    r.push({ key: "assets_h", label: "TILLGÅNGAR", variant: "header", values: padTo12(new Array(12).fill(0)) });
    r.push({ key: "intangible", label: "  Immateriella tillgångar", values: padTo12(intangibleAssets), indent: 1 });
    r.push({ key: "tangible", label: "  Materiella anläggningstillgångar", values: padTo12(tangibleAssets), indent: 1 });
    r.push({ key: "financial", label: "  Finansiella anläggningstillgångar", values: padTo12(financialAssets), indent: 1 });
    r.push({ key: "sum_fixed", label: "= Summa anläggningstillgångar", variant: "subtotal", values: padTo12(fixedAssets) });
    r.push({ key: "inventory", label: "  Varulager", values: padTo12(inventory), indent: 1 });
    r.push({ key: "receivables", label: "  Kundfordringar", values: padTo12(receivables), indent: 1 });
    r.push({ key: "other_recv", label: "  Övriga kortfristiga fordringar", values: padTo12(otherReceivables), indent: 1 });
    r.push({ key: "prepaid", label: "  Förutbetalda kostnader", values: padTo12(prepaidExpenses), indent: 1 });
    r.push({ key: "cash", label: "  Likvida medel", values: padTo12(cash), indent: 1 });
    r.push({ key: "sum_current", label: "= Summa omsättningstillgångar", variant: "subtotal", values: padTo12(currentAssets) });
    r.push({ key: "total_assets", label: "SUMMA TILLGÅNGAR", variant: "milestone", values: padTo12(totalAssets) });

    // Equity & Liabilities
    r.push({ key: "eq_h", label: "EGET KAPITAL OCH SKULDER", variant: "header", values: padTo12(new Array(12).fill(0)) });
    r.push({ key: "share_cap", label: "  Aktiekapital", values: padTo12(shareCapital), indent: 1 });
    r.push({ key: "surplus", label: "  Överkursfond", values: padTo12(surplusFund), indent: 1 });
    r.push({ key: "retained", label: "  Balanserat resultat", values: padTo12(retainedEarnings), indent: 1 });
    r.push({ key: "year_result", label: "  Årets resultat (kumulativt)", values: padTo12(yearResult), indent: 1 });
    r.push({ key: "sum_equity", label: "= Summa eget kapital", variant: "subtotal", values: padTo12(totalEquity) });
    r.push({ key: "soliditet", label: "Soliditet %", variant: "metric", values: padTo12(soliditetCalc) });

    r.push({ key: "lt_loans", label: "  Långfristiga lån", values: padTo12(longTermLoans), indent: 1 });
    r.push({ key: "lt_other", label: "  Övriga långfristiga skulder", values: padTo12(otherLtLiab), indent: 1 });
    r.push({ key: "sum_lt", label: "= Summa långfristiga skulder", variant: "subtotal", values: padTo12(totalLtLiab) });

    r.push({ key: "payables", label: "  Leverantörsskulder", values: padTo12(payables), indent: 1 });
    r.push({ key: "tax_liab", label: "  Skatteskulder", values: padTo12(taxLiab), indent: 1 });
    r.push({ key: "vat_liab", label: "  Mervärdesskatteskuld", values: padTo12(vatLiab), indent: 1 });
    r.push({ key: "accrued_sal", label: "  Upplupna löner och soc. avg.", values: padTo12(accruedSalaries), indent: 1 });
    r.push({ key: "st_other", label: "  Övriga kortfristiga skulder", values: padTo12(otherStLiab), indent: 1 });
    r.push({ key: "sum_st", label: "= Summa kortfristiga skulder", variant: "subtotal", values: padTo12(totalStLiab) });

    r.push({ key: "total_eq_liab", label: "SUMMA EK + SKULDER", variant: "milestone", values: padTo12(totalEqAndLiab) });

    if (!isDifferenceZero) {
      r.push({ key: "diff", label: "⚠ Differens", variant: "result", color: "rose", values: padTo12(balanceDiff) });
    }

    return r;
  }, [intangibleAssets, tangibleAssets, financialAssets, fixedAssets, inventory, receivables, otherReceivables, prepaidExpenses, cash, currentAssets, totalAssets, shareCapital, surplusFund, retainedEarnings, yearResult, totalEquity, soliditetCalc, longTermLoans, otherLtLiab, totalLtLiab, payables, taxLiab, vatLiab, accruedSalaries, otherStLiab, totalStLiab, totalEqAndLiab, balanceDiff, isDifferenceZero]);

  return (
    <div className="flex flex-col h-full">
      {/* Equity Bridge Chart */}
      <div className="mx-3 mt-3 mb-2 bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Eget kapital & Likviditet — Trend
          </span>
        </div>
        <div className="px-2 py-1">
          <EquityBridgeChart equity={totalEquity} cash={cash} totalAssets={totalAssets} />
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 px-3">
        {[
          { label: "Totala tillgångar", value: formatSEK(totalAssets[11]), gradient: "from-slate-700 to-slate-800", sub: `December ${new Date().getFullYear()}` },
          { label: "Eget kapital", value: formatSEK(totalEquity[11]), gradient: totalEquity[11] >= 0 ? "from-emerald-600 to-green-700" : "from-rose-600 to-red-700", sub: `Soliditet: ${soliditetCalc[11].toFixed(1)}%` },
        ].map(card => (
          <div key={card.label} className={cn("bg-gradient-to-r rounded-2xl p-3 sm:p-5 shadow-md relative overflow-hidden text-white", card.gradient)}>
            <span className="text-white/70 text-[10px] sm:text-xs font-medium uppercase tracking-widest">{card.label}</span>
            <p className="text-lg sm:text-2xl font-black mt-1 tabular-nums">{card.value}</p>
            <span className="text-white/60 text-xs">{card.sub}</span>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          </div>
        ))}
        <CashRunwayCard cash={cash} netResult={netResult} />
      </div>

      {/* Opening balances + DSO/DPO controls */}
      <div className="mx-3 mb-4 p-4 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-xl">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Ingående balansvärden & nyckeltal</p>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: "Aktiekapital", value: openingBalances.shareCapital, onChange: (v: number) => setOpeningBalances(p => ({ ...p, shareCapital: v })) },
            { label: "Balanserat resultat", value: openingBalances.retainedEarnings, onChange: (v: number) => setOpeningBalances(p => ({ ...p, retainedEarnings: v })) },
            { label: "Ingående kassa", value: openingBalances.openingCash, onChange: (v: number) => setOpeningBalances(p => ({ ...p, openingCash: v })) },
            { label: "Befintliga lån", value: openingBalances.existingLoans, onChange: (v: number) => setOpeningBalances(p => ({ ...p, existingLoans: v })) },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">{f.label}</label>
              <Input type="number" value={f.value} onChange={e => f.onChange(parseInt(e.target.value) || 0)}
                className="mt-1 text-sm font-mono text-right h-8" />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#3b82f6]" /> DSO (dagar)
            </label>
            <Input type="number" value={dso} onChange={e => setDso(parseInt(e.target.value) || 30)}
              className="mt-1 text-sm font-mono text-right h-8" />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-orange-500" /> DPO (dagar)
            </label>
            <Input type="number" value={dpo} onChange={e => setDpo(parseInt(e.target.value) || 30)}
              className="mt-1 text-sm font-mono text-right h-8" />
          </div>
        </div>
      </div>

      {/* Budget Table — always 12 months via BudgetMonthTable */}
      <div className="px-3 pb-4">
        <BudgetMonthTable rows={brRows} title="Balansräkning" />
      </div>

      {/* Balance status */}
      {isDifferenceZero ? (
        <div className="mx-3 mb-4 bg-[#E1F5EE] dark:bg-emerald-900/20 border border-[#BFE6D6] dark:border-emerald-800 rounded-xl">
          <div className="flex items-center gap-2 px-4 py-3">
            <CheckCircle className="w-4 h-4 text-[#085041]" />
            <span className="text-sm font-semibold text-[#085041] dark:text-[#1D9E75]">✓ Balansräkningen är i balans</span>
          </div>
        </div>
      ) : (
        <div className="mx-3 mb-4 px-4 py-2 text-xs text-[#7A1A1A] dark:text-[#C73838] bg-[#FCE8E8] dark:bg-rose-900/20 border border-[#F4C8C8] dark:border-rose-800 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Kontrollera ingående balansvärden och att alla tillgångar är korrekt mappade
        </div>
      )}
    </div>
  );
};
