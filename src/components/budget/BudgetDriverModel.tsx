import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Users, DollarSign, TrendingUp, Wallet, Building2,
  ChevronDown, ChevronRight, Calculator, Briefcase, BarChart3,
  Sparkles, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  BudgetDrivers, DEFAULT_DRIVERS, RRMonth, BRMonth, KFMonth,
  calculateRR, calculateBR, calculateKF, calculateMetrics, MONTH_LABELS,
} from "@/lib/budget/driverEngine";
import { formatSEK } from "@/lib/budget/budgetEngine";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { useChartTheme } from "@/hooks/useChartTheme";
import { BudgetKPIBar } from "./BudgetKPIBar";
import { BudgetAIHints } from "./BudgetAIHints";
import { EditableCell } from "./EditableCell";
import { Sparkline } from "./Sparkline";
import { BudgetScenarioComparison } from "./BudgetScenarioComparison";

/* ── Number input helper ── */
const DriverInput = ({ label, value, onChange, suffix, icon: Icon, min, max, step = 1, slider }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; icon?: React.ElementType; min?: number; max?: number; step?: number; slider?: boolean;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
        {label}
      </Label>
      {slider && <span className="text-xs font-semibold tabular-nums text-foreground">{value}{suffix}</span>}
    </div>
    {slider ? (
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min ?? 0} max={max ?? 100} step={step} />
    ) : (
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="h-8 text-sm pr-10"
          min={min} max={max} step={step}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    )}
  </div>
);

/* ── Driver group ── */
const DriverGroup = ({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 py-2 px-1 hover:bg-muted/30 rounded-lg transition-colors">
          <Icon className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-semibold text-foreground flex-1 text-left">{title}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-2 pl-6">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/* ── Statement row with inline edit + sparkline ── */
const StatementRow = ({ label, values, annual, bold = false, indent = 0, colorize = true, editable = false, onEdit, sparkline = false }: {
  label: string; values: number[]; annual: number; bold?: boolean; indent?: number; colorize?: boolean;
  editable?: boolean; onEdit?: (monthIdx: number, val: number) => void; sparkline?: boolean;
}) => (
  <div className={cn("flex items-center border-b", bold && "font-semibold bg-muted/20")}>
    <div className="min-w-[180px] px-3 py-1.5 text-xs sticky left-0 bg-inherit z-10 border-r" style={{ paddingLeft: `${12 + indent * 14}px` }}>{label}</div>
    {values.map((v, i) => (
      <div key={i} className={cn("w-[75px] min-w-[75px] text-right py-0.5 text-xs tabular-nums border-r",
        !editable && colorize && v < 0 ? "text-destructive" : !editable && colorize && v > 0 ? "text-[#085041] dark:text-[#1D9E75]" : "text-muted-foreground")}>
        {editable && onEdit ? (
          <EditableCell value={v} onSave={(val) => onEdit(i, val)} />
        ) : (
          <span className="px-2 py-1 block">{Math.abs(v) < 1 ? "—" : formatSEK(Math.round(v))}</span>
        )}
      </div>
    ))}
    <div className={cn("w-[90px] min-w-[90px] text-right px-2 py-1.5 text-xs tabular-nums font-bold bg-muted/10 flex items-center justify-end gap-1",
      colorize && annual < 0 ? "text-destructive" : colorize && annual > 0 ? "text-[#085041] dark:text-[#1D9E75]" : "")}>
      {sparkline && <Sparkline data={values} color="auto" width={40} height={16} />}
      {formatSEK(Math.round(annual))}
    </div>
  </div>
);

const SectionHeader = ({ label }: { label: string }) => (
  <div className="px-3 py-1.5 bg-muted/30 border-b text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
);

const TableHeader = ({ title, lastColLabel = "Helår" }: { title: string; lastColLabel?: string }) => (
  <div className="flex items-center border-b bg-muted/50 sticky top-0 z-20">
    <div className="min-w-[180px] px-3 py-2 text-xs font-semibold sticky left-0 bg-muted/50 z-30 border-r">{title}</div>
    {MONTH_LABELS.map(h => <div key={h} className="w-[75px] min-w-[75px] text-center text-xs font-semibold py-2 border-r">{h}</div>)}
    <div className="w-[90px] min-w-[90px] text-center text-xs font-bold py-2 bg-muted/40">{lastColLabel}</div>
  </div>
);

const SummaryRow = ({ label, values, annual, sparkline = false }: { label: string; values: number[]; annual: number; sparkline?: boolean }) => (
  <div className="flex items-center border-t-2 border-[#C8DDF5] dark:border-indigo-800 bg-[#0F1F3D] dark:from-indigo-950/30 dark:to-blue-950/20">
    <div className="min-w-[180px] px-3 py-2 text-sm font-bold sticky left-0 bg-inherit z-10 border-r">{label}</div>
    {values.map((v, i) => (
      <div key={i} className={cn("w-[75px] min-w-[75px] text-right px-1.5 py-2 text-xs font-bold tabular-nums border-r",
        v < 0 ? "text-destructive" : "text-[#085041] dark:text-[#1D9E75]")}>
        {formatSEK(Math.round(v))}
      </div>
    ))}
    <div className={cn("w-[90px] min-w-[90px] text-right px-2 py-2 text-sm font-bold tabular-nums bg-muted/10 flex items-center justify-end gap-1",
      annual < 0 ? "text-destructive" : "text-[#085041] dark:text-[#1D9E75]")}>
      {sparkline && <Sparkline data={values} color="auto" width={40} height={16} />}
      {formatSEK(Math.round(annual))}
    </div>
  </div>
);

/* ── RR Table ── */
const RRTable = ({ rr }: { rr: RRMonth[] }) => {
  const row = (label: string, fn: (m: RRMonth) => number, bold = false, indent = 0, spark = false) => {
    const vals = rr.map(fn);
    return <StatementRow key={label} label={label} values={vals} annual={vals.reduce((s, v) => s + v, 0)} bold={bold} indent={indent} sparkline={spark} />;
  };
  const netVals = rr.map(m => m.netIncome);
  return (
    <div className="overflow-x-auto"><div className="min-w-max">
      <TableHeader title="Resultaträkning" />
      <SectionHeader label="Rörelsens intäkter" />
      {row("Nettoomsättning", m => m.revenue, false, 1)}
      {row("= Summa intäkter", m => m.revenue, true, 0, true)}
      <SectionHeader label="Rörelsens kostnader" />
      {row("Råvaror och förnödenheter", m => -m.cogs, false, 1)}
      {row("= Bruttovinst", m => m.grossProfit, true, 0, true)}
      {row("Personalkostnader", m => -m.salaries, false, 1)}
      {row("Marknadsföring", m => -m.marketing, false, 1)}
      {row("Administration", m => -m.admin, false, 1)}
      {row("Utveckling / FoU", m => -m.rd, false, 1)}
      {row("= EBITDA", m => m.ebitda, true, 0, true)}
      {row("Avskrivningar", m => -m.depreciation, false, 1)}
      {row("= Rörelseresultat (EBIT)", m => m.ebit, true)}
      <SectionHeader label="Finansiella poster" />
      {row("Räntekostnader", m => -m.interestCost, false, 1)}
      {row("= Resultat före skatt", m => m.ebt, true)}
      {row("Skatt (20,6%)", m => -m.tax, false, 1)}
      <SummaryRow label="= Årets resultat" values={netVals} annual={netVals.reduce((s, v) => s + v, 0)} sparkline />
    </div></div>
  );
};

/* ── BR Table ── */
const BRTable = ({ br }: { br: BRMonth[] }) => {
  const row = (label: string, fn: (m: BRMonth) => number, bold = false, indent = 0) => {
    const vals = br.map(fn);
    return <StatementRow key={label} label={label} values={vals} annual={vals[11] || 0} bold={bold} indent={indent} colorize={false} />;
  };
  const allBalanced = br.every(m => m.isBalanced);
  return (
    <div className="overflow-x-auto"><div className="min-w-max">
      <TableHeader title="Balansräkning" lastColLabel="Dec" />
      <SectionHeader label="Tillgångar" />
      {row("Anläggningstillgångar", m => m.fixedAssets, false, 1)}
      {row("Kundfordringar", m => m.accountsReceivable, false, 1)}
      {row("Varulager", m => m.inventory, false, 1)}
      {row("Likvida medel", m => m.cash, false, 1)}
      {row("= Summa tillgångar", m => m.totalAssets, true)}
      <SectionHeader label="Eget kapital & skulder" />
      {row("Ingående eget kapital", m => m.openingEquity, false, 1)}
      {row("Ackumulerat resultat", m => m.cumulativeNetIncome, false, 1)}
      {row("= Summa eget kapital", m => m.totalEquity, true)}
      {row("Leverantörsskulder", m => m.accountsPayable, false, 1)}
      {row("Lån", m => m.loans, false, 1)}
      {row("= Summa skulder", m => m.totalLiabilities, true)}
      {row("= Summa EK + skulder", m => m.totalEquityAndLiabilities, true)}
      <div className={cn("flex items-center border-t-2 py-2 px-3",
        allBalanced ? "bg-[#E1F5EE] dark:bg-emerald-950/30 border-[#BFE6D6] dark:border-emerald-800" : "bg-[#FCE8E8] dark:bg-red-950/30 border-[#F4C8C8] dark:border-red-800")}>
        <div className="min-w-[180px] text-xs font-bold sticky left-0 bg-inherit z-10 flex items-center gap-1.5">
          {allBalanced ? <CheckCircle2 className="w-3.5 h-3.5 text-[#085041]" /> : <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
          {allBalanced ? "✓ Balansräkning i balans" : "⚠ Differens — kontrollera antaganden"}
        </div>
      </div>
    </div></div>
  );
};

/* ── KF Table ── */
const KFTable = ({ kf }: { kf: KFMonth[] }) => {
  const row = (label: string, fn: (m: KFMonth) => number, bold = false, indent = 0) => {
    const vals = kf.map(fn);
    return <StatementRow key={label} label={label} values={vals} annual={vals.reduce((s, v) => s + v, 0)} bold={bold} indent={indent} />;
  };
  const closingVals = kf.map(m => m.closingCash);
  return (
    <div className="overflow-x-auto"><div className="min-w-max">
      <TableHeader title="Kassaflödesanalys" />
      <SectionHeader label="Kassaflöde från rörelsen" />
      {row("Årets resultat", m => m.netIncome, false, 1)}
      {row("+ Avskrivningar", m => m.depreciation, false, 1)}
      {row("Δ Kundfordringar", m => -m.arChange, false, 1)}
      {row("Δ Leverantörsskulder", m => m.apChange, false, 1)}
      {row("Δ Varulager", m => -m.invChange, false, 1)}
      {row("= Kassaflöde från rörelsen (A)", m => m.operatingCF, true)}
      <SectionHeader label="Investeringsverksamheten" />
      {row("Investeringar (capex)", m => m.capex, false, 1)}
      {row("= Kassaflöde investering (B)", m => m.investingCF, true)}
      <SectionHeader label="Finansieringsverksamheten" />
      {row("Förändring lån", m => m.loanChange, false, 1)}
      {row("= Kassaflöde finansiering (C)", m => m.financingCF, true)}
      {row("= Periodens kassaflöde (A+B+C)", m => m.netCashFlow, true)}
      {row("Ingående kassa", m => m.openingCash, false, 1)}
      <SummaryRow label="= Utgående kassa" values={closingVals} annual={closingVals[11] || 0} sparkline />
    </div></div>
  );
};

/* ── MAIN COMPONENT ── */
interface Props { className?: string; companyId?: string; drivers: BudgetDrivers; onDriversChange: (d: BudgetDrivers) => void; }

export const BudgetDriverModel = ({ className, drivers, onDriversChange }: Props) => {
  const chartTheme = useChartTheme();
  const [activeView, setActiveView] = useState<"model" | "scenarios">("model");
  const [activeStatement, setActiveStatement] = useState<"rr" | "br" | "kf">("rr");
  const [driversOpen, setDriversOpen] = useState(true);

  const setDriver = useCallback(<K extends keyof BudgetDrivers>(key: K, value: BudgetDrivers[K]) => {
    onDriversChange({ ...drivers, [key]: value });
  }, [drivers, onDriversChange]);

  const rr = useMemo(() => calculateRR(drivers), [drivers]);
  const br = useMemo(() => calculateBR(drivers, rr), [drivers, rr]);
  const kf = useMemo(() => calculateKF(drivers, rr, br), [drivers, rr, br]);
  const metrics = useMemo(() => calculateMetrics(drivers, rr, kf), [drivers, rr, kf]);

  const chartData = useMemo(() => MONTH_LABELS.map((label, i) => ({
    name: label,
    intäkter: Math.round(rr[i].revenue),
    resultat: Math.round(rr[i].netIncome),
    kassa: Math.round(kf[i].closingCash),
  })), [rr, kf]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* STICKY KPI BAR */}
      <BudgetKPIBar metrics={metrics} />

      {/* AI HINTS */}
      <BudgetAIHints metrics={metrics} />

      {/* VIEW TOGGLE: Model vs Scenarios */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView("model")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeView === "model"
              ? "bg-[#0F1F3D] text-white shadow-lg shadow-indigo-500/25"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Finansiell modell
        </button>
        <button
          onClick={() => setActiveView("scenarios")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeView === "scenarios"
              ? "bg-[#0F1F3D] text-white shadow-lg shadow-indigo-500/25"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Scenariojämförelse
        </button>
      </div>

      {activeView === "scenarios" ? (
        <BudgetScenarioComparison baseDrivers={drivers} />
      ) : (
        <>
          {/* DRIVERS */}
          <Collapsible open={driversOpen} onOpenChange={setDriversOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-indigo-500" />
                    <CardTitle className="text-sm flex-1 text-left">Antaganden (drivare)</CardTitle>
                    <span className="text-xs text-muted-foreground">Ändra för att uppdatera alla rapporter</span>
                    {driversOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  <DriverGroup title="Intäktsdrivare" icon={TrendingUp}>
                    <DriverInput label="Startkunder" value={drivers.startingCustomers} onChange={v => setDriver("startingCustomers", v)} icon={Users} suffix="st" />
                    <DriverInput label="Nya kunder/mån" value={drivers.newCustomersPerMonth} onChange={v => setDriver("newCustomersPerMonth", v)} icon={Users} suffix="st" />
                    <DriverInput label="Churn" value={drivers.churnRate} onChange={v => setDriver("churnRate", v)} slider min={0} max={20} step={0.5} suffix="%" />
                    <DriverInput label="Snittintäkt/kund/mån" value={drivers.averageRevenuePerCustomer} onChange={v => setDriver("averageRevenuePerCustomer", v)} icon={DollarSign} suffix="kr" />
                    <DriverInput label="Prishöjning/år" value={drivers.priceGrowthRate} onChange={v => setDriver("priceGrowthRate", v)} slider min={0} max={20} step={0.5} suffix="%" />
                  </DriverGroup>
                  <DriverGroup title="Kostnadsdrivare" icon={Briefcase} defaultOpen={false}>
                    <DriverInput label="COGS (% av intäkt)" value={drivers.cogsPercent} onChange={v => setDriver("cogsPercent", v)} slider min={0} max={90} step={1} suffix="%" />
                    <DriverInput label="Löner + avg/mån" value={drivers.salaryMonthly} onChange={v => setDriver("salaryMonthly", v)} icon={Users} suffix="kr" />
                    <DriverInput label="Marknadsföring/mån" value={drivers.marketingBudget} onChange={v => setDriver("marketingBudget", v)} suffix="kr" />
                    <DriverInput label="Admin (hyra, IT)/mån" value={drivers.adminCosts} onChange={v => setDriver("adminCosts", v)} icon={Building2} suffix="kr" />
                    <DriverInput label="FoU/Utveckling/mån" value={drivers.rdCosts} onChange={v => setDriver("rdCosts", v)} suffix="kr" />
                  </DriverGroup>
                  <DriverGroup title="Rörelsekapital" icon={Wallet} defaultOpen={false}>
                    <DriverInput label="DSO (betalningstid kunder)" value={drivers.dso} onChange={v => setDriver("dso", v)} suffix="dagar" min={0} max={120} />
                    <DriverInput label="DPO (betalningstid lev.)" value={drivers.dpo} onChange={v => setDriver("dpo", v)} suffix="dagar" min={0} max={120} />
                    <DriverInput label="Lagerdagar" value={drivers.inventoryDays} onChange={v => setDriver("inventoryDays", v)} suffix="dagar" min={0} max={180} />
                  </DriverGroup>
                  <DriverGroup title="Startbalans & finansiering" icon={BarChart3} defaultOpen={false}>
                    <DriverInput label="Ingående kassa" value={drivers.openingCash} onChange={v => setDriver("openingCash", v)} suffix="kr" />
                    <DriverInput label="Ingående EK" value={drivers.openingEquity} onChange={v => setDriver("openingEquity", v)} suffix="kr" />
                    <DriverInput label="Lån" value={drivers.openingLoans} onChange={v => setDriver("openingLoans", v)} suffix="kr" />
                    <DriverInput label="Amortering/mån" value={drivers.loanRepaymentMonthly} onChange={v => setDriver("loanRepaymentMonthly", v)} suffix="kr" />
                    <DriverInput label="Ränta (årlig)" value={Math.round(drivers.interestRate * 100 * 100) / 100} onChange={v => setDriver("interestRate", v / 100)} slider min={0} max={15} step={0.25} suffix="%" />
                    <DriverInput label="Capex/mån" value={drivers.monthlyCapex} onChange={v => setDriver("monthlyCapex", v)} suffix="kr" />
                    <DriverInput label="Avskrivningstid" value={drivers.depreciationYears} onChange={v => setDriver("depreciationYears", v)} suffix="år" min={1} max={20} />
                    <DriverInput label="Bolagsskatt" value={Math.round(drivers.corporateTaxRate * 100 * 10) / 10} onChange={v => setDriver("corporateTaxRate", v / 100)} slider min={0} max={30} step={0.1} suffix="%" />
                  </DriverGroup>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* CHART */}
          <Card>
            <CardContent className="pt-5 pb-3">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                12-månaders projektion
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `${formatSEK(v)} kr`} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                    <Area type="monotone" dataKey="intäkter" fill="hsl(217, 91%, 60%)" stroke="hsl(217, 91%, 60%)" fillOpacity={0.15} strokeWidth={2} name="Intäkter" />
                    <Area type="monotone" dataKey="kassa" fill="hsl(258, 90%, 66%)" stroke="hsl(258, 90%, 66%)" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" name="Kassa" />
                    <Area type="monotone" dataKey="resultat" fill={metrics.annualNetIncome >= 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"}
                      stroke={metrics.annualNetIncome >= 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"} fillOpacity={0.2} strokeWidth={2} name="Nettoresultat" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* STATEMENT TABS */}
          <div className="flex gap-1 border-b">
            {([
              { key: "rr" as const, label: "Resultaträkning" },
              { key: "br" as const, label: "Balansräkning" },
              { key: "kf" as const, label: "Kassaflödesanalys" },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveStatement(tab.key)}
                className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200",
                  activeStatement === tab.key ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {tab.label}
              </button>
            ))}
          </div>

          <Card className="overflow-hidden">
            {activeStatement === "rr" && <RRTable rr={rr} />}
            {activeStatement === "br" && <BRTable br={br} />}
            {activeStatement === "kf" && <KFTable kf={kf} />}
          </Card>
        </>
      )}
    </div>
  );
};
