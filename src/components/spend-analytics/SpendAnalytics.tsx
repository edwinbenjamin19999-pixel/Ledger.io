import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, TrendingUp, CheckCircle2, Upload,
  DollarSign, PieChart, BarChart3, FileText, Clock, Sparkles,
  RefreshCw, ChevronDown, ChevronUp, Repeat, CreditCard, Building2,
  Target,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { sv } from "date-fns/locale";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, Line, Treemap,
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { SubscriptionRadar } from "./SubscriptionRadar";
import { VendorIntelligence } from "./VendorIntelligence";
import { SupplierDrawer } from "./SupplierDrawer";
import { CostForecast } from "./CostForecast";
import { BudgetDeviation } from "./BudgetDeviation";
import { useChartTheme } from "@/hooks/useChartTheme";

const CLASS_CONFIG: Record<string, { label: string; color: string }> = { "4": { label: "Varor & material", color: "hsl(var(--primary))" },
  "5": { label: "Lokalkostnader", color: "#10b981" },
  "6": { label: "Övriga rörelsekostnader", color: "#f59e0b" },
  "7": { label: "Personalkostnader", color: "#8b5cf6" },
};

const CATEGORY_MAP: Record<string, { label: string; benchmark: number; prefixes: string[] }> = { telecom: { label: "Telekommunikation", benchmark: 1200, prefixes: ["6210", "6211", "6212", "6214"] },
  office: { label: "Kontorsmaterial", benchmark: 400, prefixes: ["6010", "6110", "6150"] },
  insurance: { label: "Försäkringar", benchmark: 2000, prefixes: ["6310", "6320", "6340", "6350"] },
  rent: { label: "Lokalhyra", benchmark: 8000, prefixes: ["5010", "5011", "5012", "5013"] },
  travel: { label: "Resor & transport", benchmark: 2500, prefixes: ["6700", "6710", "6711", "6712", "6720", "6730", "6740"] },
  representation: { label: "Representation", benchmark: 1500, prefixes: ["6070", "6071", "6072"] },
  marketing: { label: "Marknadsföring", benchmark: 3500, prefixes: ["6930", "6940", "6941", "6942"] },
  it: { label: "IT & programvara", benchmark: 4000, prefixes: ["6510", "6911", "6250"] },
  consulting: { label: "Konsulttjänster", benchmark: 5000, prefixes: ["6440", "6450", "6460", "6550"] },
  salary: { label: "Löner", benchmark: 0, prefixes: ["7010", "7011", "7012", "7014", "7019"] },
  socialFees: { label: "Arbetsgivaravgifter", benchmark: 0, prefixes: ["7510", "7511", "7520"] },
  goods: { label: "Varor & material", benchmark: 0, prefixes: ["4010", "4000", "4100", "4300"] },
};

const COLORS = [
  "hsl(var(--primary))", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981",
  "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#84cc16", "#a855f7",
];

export interface ExpenseVendor { name: string;
  total: number;
  count: number;
  dates: string[];
  accounts: string[];
  monthlyBreakdown: Record<string, number>;
}

interface SpendCategory { key: string;
  label: string;
  amount: number;
  monthlyAvg: number;
  benchmark: number;
  vendors: ExpenseVendor[];
}

interface ClassGroup { name: string;
  size: number;
  color: string;
  children: { name: string; size: number }[];
}

export interface MonthlyExpense { month: string;
  label: string;
  varor: number;
  lokal: number;
  ovriga: number;
  personal: number;
  total: number;
}

interface SpendAnalyticsProps { companyId: string;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function SpendAnalytics({ companyId }: SpendAnalyticsProps) {
  const chartTheme = useChartTheme(); const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<SpendCategory[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [totalSpend, setTotalSpend] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [allVendors, setAllVendors] = useState<ExpenseVendor[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyExpense[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<ExpenseVendor | null>(null);

  const months = 6;
  const periodStart = startOfMonth(subMonths(new Date(), months - 1));
  const periodEnd = endOfMonth(new Date());
  const periodLabel = `${format(periodStart, "MMMM", { locale: sv })}–${format(periodEnd, "MMMM yyyy", { locale: sv })}`;

  useEffect(() => { if (companyId) loadData(); }, [companyId]);

  async function loadData() { setLoading(true);
    try { // Fetch company name
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle();
      setCompanyName(company?.name || "");

      // Fetch ALL expense lines with separate queries to avoid deep join issues
      const { data: lines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select("id, debit, credit, account_id, journal_entry_id, cost_center_id")
        .gt("debit", 0);

      if (linesError) { console.error("Lines error:", linesError);
        setLoading(false);
        return;
      }

      if (!lines || lines.length === 0) { setLoading(false);
        return;
      }

      // Fetch all accounts för this company
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_name")
        .eq("company_id", companyId);

      const accountMap = new Map<string, { number: string; name: string }>();
      for (const a of accounts || []) { accountMap.set(a.id, { number: a.account_number, name: a.account_name });
      }

      // Fetch all journal entries för this company in period
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("id, entry_date, description, status, company_id")
        .eq("company_id", companyId)
        .gte("entry_date", format(periodStart, "yyyy-MM-dd"))
        .lte("entry_date", format(periodEnd, "yyyy-MM-dd"));

      const entryMap = new Map<string, { date: string; description: string; status: string }>();
      for (const e of entries || []) { entryMap.set(e.id, { date: e.entry_date, description: e.description || "", status: e.status });
      }

      // Process lines - join in memory
      const catMap = new Map<string, { total: number; vendors: Map<string, ExpenseVendor> }>();
      const classMap = new Map<string, { total: number; accounts: Map<string, number> }>();
      const globalVendorMap = new Map<string, ExpenseVendor>();
      const monthlyMap = new Map<string, { varor: number; lokal: number; ovriga: number; personal: number; total: number }>();
      let total = 0;

      for (const line of lines) { const acc = accountMap.get(line.account_id);
        if (!acc) continue;
        const accNo = acc.number;
        const debitAmt = line.debit || 0;
        if (debitAmt <= 0) continue;
        if (accNo < "4000" || accNo > "7999") continue;

        const entry = entryMap.get(line.journal_entry_id);
        if (!entry) continue; // Not in this company/period

        total += debitAmt;
        const classKey = accNo.charAt(0);
        const entryDate = entry.date || "";
        const monthKey = entryDate.substring(0, 7);

        // Monthly tracking
        const md = monthlyMap.get(monthKey) || { varor: 0, lokal: 0, ovriga: 0, personal: 0, total: 0 };
        md.total += debitAmt;
        if (classKey === "4") md.varor += debitAmt;
        else if (classKey === "5") md.lokal += debitAmt;
        else if (classKey === "6") md.ovriga += debitAmt;
        else if (classKey === "7") md.personal += debitAmt;
        monthlyMap.set(monthKey, md);

        // Class grouping för Treemap
        const cg = classMap.get(classKey) || { total: 0, accounts: new Map() };
        cg.total += debitAmt;
        cg.accounts.set(acc.name, (cg.accounts.get(acc.name) || 0) + debitAmt);
        classMap.set(classKey, cg);

        // Category mapping
        let matchedKey: string | null = null;
        for (const [key, def] of Object.entries(CATEGORY_MAP)) { if (def.prefixes.some(p => accNo.startsWith(p))) { matchedKey = key; break; }
        }
        const catKey = matchedKey || "misc";
        const catEntry = catMap.get(catKey) || { total: 0, vendors: new Map() };
        catEntry.total += debitAmt;

        const vendorName = entry.description || acc.name;
        const v = catEntry.vendors.get(vendorName) || { name: vendorName, total: 0, count: 0, dates: [], accounts: [], monthlyBreakdown: {} };
        v.total += debitAmt;
        v.count++;
        v.dates.push(entryDate);
        if (!v.accounts.includes(accNo)) v.accounts.push(accNo);
        v.monthlyBreakdown[monthKey] = (v.monthlyBreakdown[monthKey] || 0) + debitAmt;
        catEntry.vendors.set(vendorName, v);
        catMap.set(catKey, catEntry);

        // Global vendor tracking
        const gv = globalVendorMap.get(vendorName) || { name: vendorName, total: 0, count: 0, dates: [], accounts: [], monthlyBreakdown: {} };
        gv.total += debitAmt;
        gv.count++;
        gv.dates.push(entryDate);
        if (!gv.accounts.includes(accNo)) gv.accounts.push(accNo);
        gv.monthlyBreakdown[monthKey] = (gv.monthlyBreakdown[monthKey] || 0) + debitAmt;
        globalVendorMap.set(vendorName, gv);
      }

      setTotalSpend(total);

      // Build monthly data
      const mData: MonthlyExpense[] = [];
      for (let i = months - 1; i >= 0; i--) { const d = subMonths(new Date(), i);
        const key = format(d, "yyyy-MM");
        const label = format(d, "MMM", { locale: sv });
        const md = monthlyMap.get(key) || { varor: 0, lokal: 0, ovriga: 0, personal: 0, total: 0 };
        mData.push({ month: key, label, ...md });
      }
      setMonthlyData(mData);

      // Build class groups för Treemap
      const groups: ClassGroup[] = [];
      for (const [key, data] of classMap) { const cfg = CLASS_CONFIG[key];
        if (!cfg) continue;
        groups.push({ name: cfg.label,
          size: Math.round(data.total),
          color: cfg.color,
          children: Array.from(data.accounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, amt]) => ({ name, size: Math.round(amt) })),
        });
      }
      groups.sort((a, b) => b.size - a.size);
      setClassGroups(groups);

      // Build categories
      const cats: SpendCategory[] = [];
      for (const [key, data] of catMap.entries()) { const def = CATEGORY_MAP[key] || { label: "Övriga kostnader", benchmark: 1000, prefixes: [] };
        cats.push({ key,
          label: def.label,
          amount: Math.round(data.total),
          monthlyAvg: Math.round(data.total / months),
          benchmark: def.benchmark,
          vendors: Array.from(data.vendors.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 10),
        });
      }
      cats.sort((a, b) => b.amount - a.amount);
      setCategories(cats);

      // Global vendors
      const vArr = Array.from(globalVendorMap.values())
        .sort((a, b) => b.total - a.total);
      setAllVendors(vArr);
    } catch (e) { console.error("SpendAnalytics error:", e);
    }
    setLoading(false);
  }

  const pieData = useMemo(() =>
    categories.slice(0, 8).map(c => ({ name: c.label, value: c.amount })),
    [categories]
  );

  const barData = useMemo(() =>
    categories.filter(c => c.benchmark > 0).slice(0, 6).map(c => ({ name: c.label.length > 12 ? c.label.substring(0, 12) + "…" : c.label,
      "Ditt snitt": c.monthlyAvg,
      "Branschsnitt": c.benchmark,
    })),
    [categories]
  );

  // Separate vendors into categories: actual suppliers (klass 4-6), payroll (klass 7), internal
  const PAYROLL_PREFIXES = ["7010", "7011", "7012", "7014", "7019", "7210", "7220", "7230", "7240", "7290", "7310", "7320", "7330", "7510", "7511", "7520", "7530", "7533", "7570", "7580", "7610"];
  const { supplierVendors, payrollVendors, internalVendors } = useMemo(() => { const suppliers: ExpenseVendor[] = [];
    const payroll: ExpenseVendor[] = [];
    const internal: ExpenseVendor[] = [];
    for (const v of allVendors) { const primaryAccount = v.accounts[0] || "";
      const isPayroll = primaryAccount.startsWith("7") && PAYROLL_PREFIXES.some(p => primaryAccount.startsWith(p));
      const isInternal = primaryAccount.startsWith("7") && !isPayroll;
      if (isPayroll) payroll.push(v);
      else if (isInternal) internal.push(v);
      else suppliers.push(v);
    }
    return { supplierVendors: suppliers, payrollVendors: payroll, internalVendors: internal };
  }, [allVendors]);

  const makeBars = (list: ExpenseVendor[], limit = 10) =>
    list.slice(0, limit).map(v => ({ name: v.name.length > 20 ? v.name.substring(0, 20) + "…" : v.name,
      fullName: v.name,
      amount: v.total,
      pct: totalSpend > 0 ? Math.round((v.total / totalSpend) * 100) : 0,
    }));

  const topSupplierBars = useMemo(() => makeBars(supplierVendors), [supplierVendors, totalSpend]);
  const topPayrollBars = useMemo(() => makeBars(payrollVendors), [payrollVendors, totalSpend]);
  const topInternalBars = useMemo(() => makeBars(internalVendors), [internalVendors, totalSpend]);

  if (loading) { return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (totalSpend === 0) { return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kostnadsanalys & Leverantörsintelligens</h1>
          <p className="text-muted-foreground">{companyName}</p>
        </div>
        <Card className="border-primary/20">
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Importera data för att se kostnadsanalys</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Importera en SIE4-fil eller koppla ditt bankkonto för att analysera dina kostnader, identifiera prenumerationer och hitta besparingspotential.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Analyserar kostnadsklass 4-7: Varor, Lokaler, Övriga rörelsekostnader och Personal
            </p>
            <Button className="mt-4" onClick={() => toast({ title: "SIE4-import (demo)" })}>
              <Upload className="h-4 w-4 mr-2" /> Importera SIE4-fil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kostnadsanalys & Leverantörsintelligens</h1>
          <p className="text-muted-foreground">{periodLabel} — {companyName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Uppdatera
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-[3px] border-l-primary">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium text-foreground/70">Total kostnad (klass 4-7)</p>
            <p className="text-2xl font-bold text-foreground mt-1">{fmt(totalSpend)} kr</p>
            <p className="text-xs font-medium text-foreground/50 mt-0.5">{months} månader</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-[#10b981]">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium text-foreground/70">Snitt/månad</p>
            <p className="text-2xl font-bold text-foreground mt-1">{fmt(Math.round(totalSpend / months))} kr</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-[#f59e0b]">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium text-foreground/70">Kostnadskategorier</p>
            <p className="text-2xl font-bold text-foreground mt-1">{categories.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-[#8b5cf6]">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium text-foreground/70">Unika leverantörer</p>
            <p className="text-2xl font-bold text-foreground mt-1">{allVendors.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="treemap" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="treemap">
            <BarChart3 className="mr-1 h-4 w-4" /> Kostnadskarta
          </TabsTrigger>
          <TabsTrigger value="categories">
            <PieChart className="mr-1 h-4 w-4" /> Kategorier
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Repeat className="mr-1 h-4 w-4" /> Prenumerationer
          </TabsTrigger>
          <TabsTrigger value="vendors">
            <Building2 className="mr-1 h-4 w-4" /> Leverantörer
          </TabsTrigger>
          <TabsTrigger value="forecast">
            <TrendingUp className="mr-1 h-4 w-4" /> Prognos
          </TabsTrigger>
          <TabsTrigger value="budget">
            <Target className="mr-1 h-4 w-4" /> Budget
          </TabsTrigger>
          <TabsTrigger value="benchmark">
            <BarChart3 className="mr-1 h-4 w-4" /> Benchmarking
          </TabsTrigger>
          <TabsTrigger value="optimization">
            <DollarSign className="mr-1 h-4 w-4" /> Optimering
          </TabsTrigger>
          <TabsTrigger value="contracts">
            <FileText className="mr-1 h-4 w-4" /> Avtal
          </TabsTrigger>
        </TabsList>

        {/* TREEMAP TAB */}
        <TabsContent value="treemap" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Visuell kostnadskarta</CardTitle>
              <CardDescription>Varje ruta = en kostnad — ju större, desto högre andel av totalen</CardDescription>
            </CardHeader>
            <CardContent>
              {classGroups.length > 0 ? (
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 space-y-4`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <Treemap
                      data={classGroups}
                      dataKey="size"
                      aspectRatio={16 / 5}
                      stroke="hsl(var(--background))"
                      content={<TreemapContent totalSpend={totalSpend} />}
                    />
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-4">
                    {classGroups.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="h-3.5 w-3.5 rounded" style={{ backgroundColor: g.color }} />
                        <span className="font-medium text-foreground">{g.name}:</span>
                        <span className="text-foreground/70">{fmt(g.size)} kr ({totalSpend > 0 ? Math.round((g.size / totalSpend) * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Inga kostnadsposter hittades</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly trend */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kostnadstrend per månad</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
                    <Legend content={<CustomLegend />} />
                    <Area type="monotone" dataKey="varor" name="Varor" stackId="1" fill="#3b82f6" fillOpacity={0.6} stroke="#3b82f6" />
                    <Area type="monotone" dataKey="lokal" name="Lokaler" stackId="1" fill="#10b981" fillOpacity={0.6} stroke="#10b981" />
                    <Area type="monotone" dataKey="ovriga" name="Övriga" stackId="1" fill="#f59e0b" fillOpacity={0.6} stroke="#f59e0b" />
                    <Area type="monotone" dataKey="personal" name="Personal" stackId="1" fill="#8b5cf6" fillOpacity={0.6} stroke="#8b5cf6" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top suppliers */}
          {topSupplierBars.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Topp 10 leverantörer</CardTitle>
                <CardDescription>Varor, material och tjänster (klass 4–6)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {topSupplierBars.map((v, i) => (
                  <button key={i} className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors" onClick={() => { const vendor = allVendors.find(av => av.name === v.fullName); if (vendor) setSelectedVendor(vendor); }}>
                    <span className="text-xs font-semibold text-foreground w-[180px] truncate text-left">{v.name}</span>
                    <div className="flex-1 relative">
                      <div className="h-5 bg-muted/40 rounded overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded transition-all" style={{ width: `${Math.max(12, (v.amount / (topSupplierBars[0]?.amount || 1)) * 100)}%` }} />
                      </div>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold font-mono text-foreground whitespace-nowrap">{fmt(v.amount)} kr</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground/70 w-10 text-right">{v.pct}%</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payroll costs */}
          {topPayrollBars.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Personalkostnader</CardTitle>
                <CardDescription>Löner, arbetsgivaravgifter och pensioner (klass 7)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {topPayrollBars.map((v, i) => (
                  <button key={i} className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors" onClick={() => { const vendor = allVendors.find(av => av.name === v.fullName); if (vendor) setSelectedVendor(vendor); }}>
                    <span className="text-xs font-semibold text-foreground w-[180px] truncate text-left">{v.name}</span>
                    <div className="flex-1 relative">
                      <div className="h-5 bg-muted/40 rounded overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#8b5cf6]/70 rounded transition-all" style={{ width: `${Math.max(12, (v.amount / (topPayrollBars[0]?.amount || 1)) * 100)}%` }} />
                      </div>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold font-mono text-foreground whitespace-nowrap">{fmt(v.amount)} kr</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground/70 w-10 text-right">{v.pct}%</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Other internal costs */}
          {topInternalBars.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Övriga interna kostnader</CardTitle>
                <CardDescription>Avskrivningar, finansiella kostnader m.m.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {topInternalBars.map((v, i) => (
                  <button key={i} className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors" onClick={() => { const vendor = allVendors.find(av => av.name === v.fullName); if (vendor) setSelectedVendor(vendor); }}>
                    <span className="text-xs font-semibold text-foreground w-[180px] truncate text-left">{v.name}</span>
                    <div className="flex-1 relative">
                      <div className="h-5 bg-muted/40 rounded overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#f59e0b] to-[#f59e0b]/70 rounded transition-all" style={{ width: `${Math.max(12, (v.amount / (topInternalBars[0]?.amount || 1)) * 100)}%` }} />
                      </div>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold font-mono text-foreground whitespace-nowrap">{fmt(v.amount)} kr</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground/70 w-10 text-right">{v.pct}%</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Kostnadsfördelning</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsPie>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Inga kostnader</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Kategoriöversikt</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[320px] overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat.key} className="border rounded-lg">
                    <button className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors" onClick={() => setExpandedCat(expandedCat === cat.key ? null : cat.key)}>
                      <div className="flex items-center gap-2">
                        {cat.benchmark > 0 && cat.monthlyAvg > cat.benchmark * 1.3 ? (
                          <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : cat.benchmark > 0 && cat.monthlyAvg < cat.benchmark ? (
                          <TrendingDown className="h-4 w-4 text-primary" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-foreground/40" />
                        )}
                        <span className="font-semibold text-sm text-foreground">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold font-mono text-foreground">{fmt(cat.amount)} kr</span>
                        {expandedCat === cat.key ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {expandedCat === cat.key && (
                      <div className="px-3 pb-3 space-y-2 border-t">
                        <div className="flex justify-between text-xs font-medium text-foreground/60 pt-2">
                          <span>Snitt/mån: {fmt(cat.monthlyAvg)} kr</span>
                          {cat.benchmark > 0 && <span>Branschsnitt: {fmt(cat.benchmark)} kr/mån</span>}
                        </div>
                        {cat.benchmark > 0 && (
                          <div className="text-xs">
                            {cat.monthlyAvg > cat.benchmark * 1.3 ? (
                              <span className="text-destructive">{(cat.monthlyAvg / cat.benchmark).toFixed(1)}x branschsnittet</span>
                            ) : cat.monthlyAvg < cat.benchmark ? (
                              <span className="text-primary">Under snittet</span>
                            ) : (
                              <span className="text-muted-foreground">Nära snittet</span>
                            )}
                          </div>
                        )}
                        <div className="text-xs font-medium pt-1">Topp leverantörer:</div>
                        {cat.vendors.slice(0, 5).map((v, i) => (
                          <button
                            key={i}
                            className="w-full flex justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setSelectedVendor(v)}
                          >
                            <span>{v.name}</span>
                            <span>{fmt(v.total)} kr ({v.count} st)</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions">
          <SubscriptionRadar vendors={allVendors} months={months} />
        </TabsContent>

        {/* VENDORS TAB */}
        <TabsContent value="vendors">
          <VendorIntelligence
            vendors={allVendors}
            totalSpend={totalSpend}
          />
        </TabsContent>

        {/* FORECAST TAB */}
        <TabsContent value="forecast">
          <CostForecast monthlyData={monthlyData} />
        </TabsContent>

        {/* BUDGET TAB */}
        <TabsContent value="budget">
          <BudgetDeviation companyId={companyId} monthlyData={monthlyData} />
        </TabsContent>

        {/* BENCHMARK TAB */}
        <TabsContent value="benchmark">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ditt snitt vs Branschsnitt (kr/mån)</CardTitle>
              <CardDescription>Jämför dina kostnader mot bolag i din storlek</CardDescription>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={barData}>
              <ChartGradients />
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
                    <Legend content={<CustomLegend />} />
                    <Bar dataKey="Ditt snitt" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Branschsnitt" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">Inga jämförbara kategorier</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPTIMIZATION TAB */}
        <TabsContent value="optimization">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-5 w-5" /> Betalningsoptimering</CardTitle>
              </CardHeader>
              <CardContent>
                {allVendors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leverantör</TableHead>
                        <TableHead className="text-right">Totalbelopp</TableHead>
                        <TableHead>Rekommendation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allVendors.slice(0, 10).map((v, i) => (
                        <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedVendor(v)}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(v.total)} kr</TableCell>
                          <TableCell>
                            {v.total > 10000 ? (
                              <span className="text-xs text-primary">Kassarabatt 2/10 net 30 — besparing ~{fmt(Math.round(v.total * 0.02))} kr</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Betala på förfallodagen</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">Inga leverantörer</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-4 flex items-center gap-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Beräknad besparingspotential</p>
                  <p className="text-sm text-muted-foreground">
                    Genom kassarabatter och konsolidering:{" "}
                    <span className="font-bold text-primary">
                      {fmt(Math.round(allVendors.filter(v => v.total > 10000).reduce((s, v) => s + v.total * 0.02, 0)))} kr/år
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CONTRACTS TAB */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5" /> Avtalsintelligens</CardTitle>
              <CardDescription>Ladda upp leverantörsavtal (PDF) för AI-analys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Dra och släpp avtalsfiler här</p>
                <p className="text-xs text-muted-foreground mt-1">PDF-format, max 20 MB</p>
                <Input type="file" accept=".pdf" className="mt-3 max-w-xs mx-auto" onChange={(e) => { const file = e.target.files?.[0];
                  if (file) toast({ title: "Fil vald", description: `${file.name} — AI-analys kommer snart` });
                }} />
              </div>
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Inga avtal uppladdade ännu</p>
                <p className="text-xs mt-1">AI extraherar betalningsvillkor, förnyelsedatum och uppsägningstider</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supplier Drawer */}
      <SupplierDrawer
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
        totalSpend={totalSpend}
        months={months}
      />
    </div>
  );
}

function TreemapContent({ x, y, width, height, name, size, depth, totalSpend, root }: any) { // Only render leaf nodes (depth 2) — skip parent group rectangles
  if (depth === 1) return null;
  if (width < 20 || height < 20) return null;

  // Find parent color
  const classColors: Record<string, string> = { "Varor & material": "#1e40af",
    "Lokalkostnader": "#065f46",
    "Övriga rörelsekostnader": "#92400e",
    "Personalkostnader": "#5b21b6",
  };
  // Use root.name för parent group color
  const parentName = root?.name;
  const bg = classColors[parentName] || "#374151";
  const pct = totalSpend > 0 && size ? Math.round((size / totalSpend) * 100) : 0;
  const maxChars = Math.max(3, Math.floor(width / 8));
  const displayName = name && name.length > maxChars ? name.substring(0, maxChars - 1) + "…" : name;

  const titleSize = width > 120 ? 13 : 10;
  const valueSize = width > 120 ? 12 : 9;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={bg} stroke="hsl(var(--background))" strokeWidth={2} rx={6} />
      {width > 40 && height > 28 && (
        <>
          <text x={x + 8} y={y + titleSize + 6} fontSize={titleSize} fontWeight="800" fill="#ffffff">
            {displayName}
          </text>
          {height > 44 && (
            <text x={x + 8} y={y + titleSize + 6 + valueSize + 4} fontSize={valueSize} fontWeight="700" fill="rgba(255,255,255,0.9)">
              {(size || 0).toLocaleString("sv-SE")} kr ({pct}%)
            </text>
          )}
        </>
      )}
    </g>
  );
}
