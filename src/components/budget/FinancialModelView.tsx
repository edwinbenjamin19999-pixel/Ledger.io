import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { RRMonth, BRMonth, MONTH_LABELS } from "@/lib/budget/driverEngine";
import { formatSEK } from "@/lib/budget/budgetEngine";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  rr: RRMonth[];
  br: BRMonth[];
}

type RowType = "header" | "account" | "subtotal" | "total" | "kpi" | "spacer";

interface ModelRow {
  key: string;
  label: string;
  type: RowType;
  indent?: number;
  values: number[];
  annual: number;
  formula?: string;
  isPercent?: boolean;
}

function fmt(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(v);
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

export const FinancialModelView = ({ rr, br }: Props) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["revenue", "cogs", "opex", "fin", "assets", "equity"]));

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Build P&L rows
  const plRows: ModelRow[] = useMemo(() => {
    const rows: ModelRow[] = [];
    const annual = (fn: (m: RRMonth) => number) => rr.reduce((s, m) => s + fn(m), 0);
    const monthly = (fn: (m: RRMonth) => number) => rr.map(fn);

    rows.push({ key: "revenue-header", label: "INTÄKTER", type: "header", values: [], annual: 0 });
    rows.push({ key: "revenue", label: "Nettoomsättning", type: "account", indent: 1, values: monthly(m => m.revenue), annual: annual(m => m.revenue), formula: "Kunder × Intäkt/kund × Prisfaktor" });
    rows.push({ key: "total-revenue", label: "Summa intäkter", type: "subtotal", values: monthly(m => m.revenue), annual: annual(m => m.revenue) });

    rows.push({ key: "cogs-header", label: "KOSTNAD SÅLDA VAROR", type: "header", values: [], annual: 0 });
    rows.push({ key: "cogs", label: "Direkta kostnader", type: "account", indent: 1, values: monthly(m => -m.cogs), annual: annual(m => -m.cogs), formula: "Intäkt × COGS%" });

    rows.push({ key: "gross-profit", label: "Bruttovinst", type: "total", values: monthly(m => m.grossProfit), annual: annual(m => m.grossProfit) });
    const grossMarginPct = annual(m => m.revenue) > 0 ? (annual(m => m.grossProfit) / annual(m => m.revenue)) * 100 : 0;
    rows.push({ key: "gross-margin", label: "Bruttomarginal", type: "kpi", values: monthly(m => m.revenue > 0 ? (m.grossProfit / m.revenue) * 100 : 0), annual: grossMarginPct, isPercent: true });

    rows.push({ key: "spacer1", label: "", type: "spacer", values: [], annual: 0 });
    rows.push({ key: "opex-header", label: "RÖRELSEKOSTNADER", type: "header", values: [], annual: 0 });
    rows.push({ key: "salaries", label: "Personalkostnader", type: "account", indent: 1, values: monthly(m => -m.salaries), annual: annual(m => -m.salaries), formula: "Fast lönekostnad/mån" });
    rows.push({ key: "marketing", label: "Marknadsföring", type: "account", indent: 1, values: monthly(m => -m.marketing), annual: annual(m => -m.marketing) });
    rows.push({ key: "admin", label: "Administration & hyra", type: "account", indent: 1, values: monthly(m => -m.admin), annual: annual(m => -m.admin) });
    rows.push({ key: "rd", label: "FoU", type: "account", indent: 1, values: monthly(m => -m.rd), annual: annual(m => -m.rd) });
    rows.push({ key: "total-opex", label: "Summa rörelsekostnader", type: "subtotal", values: monthly(m => -m.totalOpex), annual: annual(m => -m.totalOpex) });

    rows.push({ key: "ebitda", label: "EBITDA", type: "total", values: monthly(m => m.ebitda), annual: annual(m => m.ebitda) });
    rows.push({ key: "depreciation", label: "Avskrivningar", type: "account", indent: 1, values: monthly(m => -m.depreciation), annual: annual(m => -m.depreciation) });
    rows.push({ key: "ebit", label: "EBIT (Rörelseresultat)", type: "total", values: monthly(m => m.ebit), annual: annual(m => m.ebit) });

    const ebitMarginPct = annual(m => m.revenue) > 0 ? (annual(m => m.ebit) / annual(m => m.revenue)) * 100 : 0;
    rows.push({ key: "ebit-margin", label: "Rörelsemarginal", type: "kpi", values: monthly(m => m.revenue > 0 ? (m.ebit / m.revenue) * 100 : 0), annual: ebitMarginPct, isPercent: true });

    rows.push({ key: "spacer2", label: "", type: "spacer", values: [], annual: 0 });
    rows.push({ key: "fin-header", label: "FINANSIELLA POSTER", type: "header", values: [], annual: 0 });
    rows.push({ key: "interest-cost", label: "Räntekostnader", type: "account", indent: 1, values: monthly(m => -m.interestCost), annual: annual(m => -m.interestCost) });
    rows.push({ key: "ebt", label: "Resultat före skatt", type: "subtotal", values: monthly(m => m.ebt), annual: annual(m => m.ebt) });
    rows.push({ key: "tax", label: "Skatt", type: "account", indent: 1, values: monthly(m => -m.tax), annual: annual(m => -m.tax) });
    rows.push({ key: "net-income", label: "ÅRETS RESULTAT", type: "total", values: monthly(m => m.netIncome), annual: annual(m => m.netIncome) });

    return rows;
  }, [rr]);

  // Build BS rows
  const bsRows: ModelRow[] = useMemo(() => {
    const rows: ModelRow[] = [];
    const last = br[11] || {} as BRMonth;
    const monthly = (fn: (m: BRMonth) => number) => br.map(fn);
    const ann = (fn: (m: BRMonth) => number) => fn(last);

    rows.push({ key: "assets-header", label: "TILLGÅNGAR", type: "header", values: [], annual: 0 });
    rows.push({ key: "fixed-assets", label: "Anläggningstillgångar", type: "account", indent: 1, values: monthly(m => m.fixedAssets), annual: ann(m => m.fixedAssets), formula: "Capex ack. − Avskrivn. ack." });
    rows.push({ key: "ar", label: "Kundfordringar", type: "account", indent: 1, values: monthly(m => m.accountsReceivable), annual: ann(m => m.accountsReceivable), formula: "Intäkt × DSO / 30" });
    rows.push({ key: "inventory", label: "Varulager", type: "account", indent: 1, values: monthly(m => m.inventory), annual: ann(m => m.inventory) });
    rows.push({ key: "cash-bs", label: "Likvida medel", type: "account", indent: 1, values: monthly(m => m.cash), annual: ann(m => m.cash), formula: "Balanserande post" });
    rows.push({ key: "total-assets", label: "SUMMA TILLGÅNGAR", type: "total", values: monthly(m => m.totalAssets), annual: ann(m => m.totalAssets) });

    rows.push({ key: "spacer-bs", label: "", type: "spacer", values: [], annual: 0 });
    rows.push({ key: "equity-header", label: "EGET KAPITAL & SKULDER", type: "header", values: [], annual: 0 });
    rows.push({ key: "opening-eq", label: "Ingående eget kapital", type: "account", indent: 1, values: monthly(m => m.openingEquity), annual: ann(m => m.openingEquity) });
    rows.push({ key: "cum-net", label: "Ackumulerat resultat", type: "account", indent: 1, values: monthly(m => m.cumulativeNetIncome), annual: ann(m => m.cumulativeNetIncome), formula: "Summa nettoresultat m1–m" });
    rows.push({ key: "total-equity", label: "Summa eget kapital", type: "subtotal", values: monthly(m => m.totalEquity), annual: ann(m => m.totalEquity) });

    rows.push({ key: "ap", label: "Leverantörsskulder", type: "account", indent: 1, values: monthly(m => m.accountsPayable), annual: ann(m => m.accountsPayable), formula: "COGS × DPO / 30" });
    rows.push({ key: "loans", label: "Lån", type: "account", indent: 1, values: monthly(m => m.loans), annual: ann(m => m.loans) });
    rows.push({ key: "total-liab", label: "Summa skulder", type: "subtotal", values: monthly(m => m.totalLiabilities), annual: ann(m => m.totalLiabilities) });
    rows.push({ key: "total-eq-liab", label: "SUMMA EK + SKULDER", type: "total", values: monthly(m => m.totalEquityAndLiabilities), annual: ann(m => m.totalEquityAndLiabilities) });

    return rows;
  }, [br]);

  // Balance check
  const isBalanced = br.length > 0 && br[11]?.isBalanced;

  const renderRow = (row: ModelRow) => {
    if (row.type === "spacer") return <tr key={row.key} className="h-3"><td colSpan={14} /></tr>;
    if (row.type === "header") {
      const sectionKey = row.key.replace("-header", "");
      const isExpanded = expandedSections.has(sectionKey);
      return (
        <tr key={row.key} className="bg-slate-900 dark:bg-slate-950 cursor-pointer select-none" onClick={() => toggleSection(sectionKey)}>
          <td colSpan={14} className="py-2 px-3 text-[11px] font-black uppercase tracking-widest text-white">
            <span className="flex items-center gap-1.5">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {row.label}
            </span>
          </td>
        </tr>
      );
    }

    // Hide account/subtotal rows if their section is collapsed
    const parentSection = (() => {
      if (row.key.startsWith("revenue") || row.key === "total-revenue") return "revenue";
      if (row.key.startsWith("cogs") || row.key === "gross-profit" || row.key === "gross-margin") return "cogs";
      if (["salaries","marketing","admin","rd","total-opex"].includes(row.key)) return "opex";
      if (["interest-cost","ebt","tax"].includes(row.key)) return "fin";
      if (["fixed-assets","ar","inventory","cash-bs","total-assets"].includes(row.key)) return "assets";
      if (["opening-eq","cum-net","total-equity","ap","loans","total-liab","total-eq-liab"].includes(row.key)) return "equity";
      return null;
    })();
    if (parentSection && !expandedSections.has(parentSection) && row.type !== "total") return null;

    const isTotal = row.type === "total";
    const isSubtotal = row.type === "subtotal";
    const isKPI = row.type === "kpi";

    return (
      <tr
        key={row.key}
        className={cn(
          "transition-colors",
          isTotal && "bg-slate-900 dark:bg-slate-950 text-white font-bold",
          isSubtotal && "bg-slate-100 dark:bg-slate-800 font-semibold border-t border-slate-200 dark:border-slate-700",
          isKPI && "bg-cyan-50/50 dark:bg-cyan-950/20",
          !isTotal && !isSubtotal && !isKPI && "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-900",
        )}
      >
        <td className={cn("py-1.5 px-3 text-xs whitespace-nowrap", isTotal && "text-white font-bold text-[13px]")} style={{ paddingLeft: `${12 + (row.indent || 0) * 16}px` }}>
          <span className="flex items-center gap-1.5">
            {row.label}
            {row.formula && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs max-w-[200px]">
                    <p className="font-mono text-[10px]">{row.formula}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
        </td>
        {row.values.map((v, i) => (
          <td key={i} className={cn(
            "py-1.5 px-1.5 text-right text-[11px] tabular-nums font-mono whitespace-nowrap",
            isTotal && "text-white font-bold",
            isKPI && "text-[#3b82f6] dark:text-[#1E3A5F] font-semibold",
            !isTotal && !isKPI && v < 0 && "text-[#7A1A1A] dark:text-[#C73838]",
          )}>
            {row.isPercent ? fmtPct(v) : fmt(v)}
          </td>
        ))}
        <td className={cn(
          "py-1.5 px-2 text-right text-xs tabular-nums font-mono font-bold whitespace-nowrap border-l-2 border-slate-200 dark:border-slate-700",
          isTotal && "text-white border-slate-700",
          isKPI && "text-[#3b82f6] dark:text-[#1E3A5F]",
          !isTotal && !isKPI && row.annual < 0 && "text-[#7A1A1A] dark:text-[#C73838]",
        )}>
          {row.isPercent ? fmtPct(row.annual) : fmt(row.annual)}
        </td>
      </tr>
    );
  };

  const renderTable = (title: string, rows: ModelRow[], accentColor: string, annualLabel?: string) => (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card shadow-sm flex-1 min-w-0">
      <div className="px-4 py-2.5 bg-slate-900 dark:bg-slate-950 flex items-center gap-2">
        <div className={cn("w-1 h-5 rounded-full", accentColor)} />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">Post</th>
              {MONTH_LABELS.map(m => (
                <th key={m} className="py-2 px-1.5 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{m}</th>
              ))}
              <th className="py-2 px-2 text-right text-[10px] font-bold text-foreground uppercase tracking-wider border-l-2 border-slate-200 dark:border-slate-700">{annualLabel || "Helår"}</th>
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Balance check indicator */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold",
        isBalanced
          ? "bg-[#E1F5EE] dark:bg-emerald-950/20 text-[#085041] dark:text-[#1D9E75]"
          : "bg-[#FCE8E8] dark:bg-rose-950/20 text-[#7A1A1A] dark:text-[#C73838]"
      )}>
        {isBalanced ? (
          <><CheckCircle className="w-4 h-4" /><span>Balansräkningen stämmer — Tillgångar = Eget kapital + Skulder</span></>
        ) : (
          <><AlertTriangle className="w-4 h-4" /><span>Obalans upptäckt i balansräkningen</span></>
        )}
      </div>

      {/* Side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {renderTable("Resultaträkning", plRows, "bg-[#3b82f6]", "Helår")}
        {renderTable("Balansräkning", bsRows, "bg-violet-400", "Dec")}
      </div>
    </div>
  );
};
