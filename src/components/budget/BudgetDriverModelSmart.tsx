import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Users, DollarSign, TrendingUp, ShoppingCart, Code, Briefcase, Sparkles } from "lucide-react";
import { formatSEK, MONTH_LABELS } from "@/lib/budget/budgetEngine";
const BudgetAIInsight = ({ title, insight }: { title: string; insight: string }) => (
  <div className="rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-4">
    <div className="flex items-center gap-2 mb-2">
      <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
    </div>
    <p className="text-xs text-slate-700">{insight}</p>
  </div>
);
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

type IndustryType = "saas" | "ecommerce" | "service" | "hybrid";

interface Props { className?: string;
  companyId?: string;
}

const INDUSTRY_CONFIG: Record<IndustryType, { label: string; icon: any; drivers: string[] }> = { saas: { label: "SaaS / Prenumeration",
    icon: Code,
    drivers: ["MRR", "Churn %", "ARPU", "Tillvaxt %", "CAC", "Fasta kostnader"],
  },
  ecommerce: { label: "E-handel",
    icon: ShoppingCart,
    drivers: ["Ordrar/dag", "Snittorder (AOV)", "Returgrad %", "CAC", "Lageromsattning", "Fasta kostnader"],
  },
  service: { label: "Tjanstebolag",
    icon: Briefcase,
    drivers: ["Antal anstallda", "Debiteringsgrad %", "Timpris", "Lonekostr/anst.", "Ovriga kostn/man", "Tillvaxt %"],
  },
  hybrid: { label: "Allman / Hybrid",
    icon: TrendingUp,
    drivers: ["Startkunder", "Snittpris/man", "Tillvaxt %", "Churn %", "Bruttomarginal %", "Fasta kostnader"],
  },
};

export const BudgetDriverModelSmart = ({ className, companyId }: Props) => {
  const chartTheme = useChartTheme(); const [industry, setIndustry] = useState<IndustryType>("hybrid");

  // SaaS drivers
  const [mrr, setMrr] = useState(50000);
  const [churn, setChurn] = useState([3]);
  const [arpu, setArpu] = useState(500);
  const [saasGrowth, setSaasGrowth] = useState([8]);
  const [cac, setCac] = useState(1500);
  const [fixedCosts, setFixedCosts] = useState(150000);

  // E-commerce drivers
  const [ordersPerDay, setOrdersPerDay] = useState(25);
  const [aov, setAov] = useState(850);
  const [returnRate, setReturnRate] = useState([8]);
  const [ecomCac, setEcomCac] = useState(120);
  const [inventoryTurnover, setInventoryTurnover] = useState([6]);
  const [ecomFixed, setEcomFixed] = useState(80000);

  // Service drivers
  const [employees, setEmployees] = useState(8);
  const [utilization, setUtilization] = useState([75]);
  const [hourlyRate, setHourlyRate] = useState(1200);
  const [salaryPerEmp, setSalaryPerEmp] = useState(45000);
  const [overheadPerMonth, setOverheadPerMonth] = useState(60000);
  const [serviceGrowth, setServiceGrowth] = useState([5]);

  // Hybrid drivers (same as original)
  const [customers, setCustomers] = useState(100);
  const [avgPrice, setAvgPrice] = useState(2500);
  const [hybridChurn, setHybridChurn] = useState([3]);
  const [hybridGrowth, setHybridGrowth] = useState([5]);
  const [grossMargin, setGrossMargin] = useState([65]);
  const [hybridFixed, setHybridFixed] = useState(150000);

  const projection = useMemo(() => { return MONTH_LABELS.map((label, i) => { let revenue = 0, cogs = 0, opex = 0;

      if (industry === "saas") { const monthlyMrr = mrr * Math.pow(1 + saasGrowth[0] / 100, i) * (1 - churn[0] / 100);
        revenue = monthlyMrr;
        cogs = monthlyMrr * 0.15;
        opex = fixedCosts;
      } else if (industry === "ecommerce") { const daysInMonth = 30;
        const grossSales = ordersPerDay * daysInMonth * aov;
        const returns = grossSales * returnRate[0] / 100;
        revenue = grossSales - returns;
        cogs = revenue * 0.45;
        opex = ecomFixed + (ordersPerDay * daysInMonth * ecomCac * 0.1);
      } else if (industry === "service") { const currentEmps = employees + Math.floor(i * serviceGrowth[0] / 100 * employees / 12);
        const hoursPerMonth = 168;
        revenue = currentEmps * hoursPerMonth * (utilization[0] / 100) * hourlyRate;
        cogs = currentEmps * salaryPerEmp * 1.3142; // + arb.avg
        opex = overheadPerMonth;
      } else { let currentCustomers = customers;
        for (let j = 0; j <= i; j++) { const newC = Math.round(currentCustomers * hybridGrowth[0] / 100);
          const churnedC = Math.round(currentCustomers * hybridChurn[0] / 100);
          if (j < i) currentCustomers = currentCustomers + newC - churnedC;
        }
        revenue = currentCustomers * avgPrice;
        cogs = revenue * (1 - grossMargin[0] / 100);
        opex = hybridFixed;
      }

      const grossProfit = revenue - cogs;
      const netResult = grossProfit - opex;
      return { name: label, revenue: Math.round(revenue), cogs: Math.round(cogs), grossProfit: Math.round(grossProfit), opex: Math.round(opex), netResult: Math.round(netResult) };
    });
  }, [industry, mrr, churn, saasGrowth, fixedCosts, ordersPerDay, aov, returnRate, ecomCac, ecomFixed, employees, utilization, hourlyRate, salaryPerEmp, overheadPerMonth, serviceGrowth, customers, avgPrice, hybridChurn, hybridGrowth, grossMargin, hybridFixed, arpu, inventoryTurnover]);

  const annualRevenue = projection.reduce((s, p) => s + p.revenue, 0);
  const annualResult = projection.reduce((s, p) => s + p.netResult, 0);
  const annualGrossMargin = annualRevenue > 0 ? ((annualRevenue - projection.reduce((s, p) => s + p.cogs, 0)) / annualRevenue * 100) : 0;
  const breakEvenMonth = projection.findIndex(p => p.netResult > 0);

  const insight = useMemo(() => { const parts: string[] = [];
    parts.push(`Arsomsattning: ${formatSEK(annualRevenue)} kr. Arsresultat: ${formatSEK(annualResult)} kr.`);
    parts.push(`Bruttomarginal: ${annualGrossMargin.toFixed(1)}%.`);
    if (breakEvenMonth >= 0) parts.push(`Break-even: ${MONTH_LABELS[breakEvenMonth]}.`);
    else parts.push("Inget av manaderna visar positivt resultat — justera antaganden.");
    return parts.join(" ");
  }, [annualRevenue, annualResult, annualGrossMargin, breakEvenMonth]);

  const renderDriverInputs = () => { if (industry === "saas") return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">MRR (start)</Label>
          <Input type="number" value={mrr} onChange={e => setMrr(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">ARPU</Label>
          <Input type="number" value={arpu} onChange={e => setArpu(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fasta kostnader/man</Label>
          <Input type="number" value={fixedCosts} onChange={e => setFixedCosts(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Manadstillvaxt</span><span className="font-medium text-[#085041]">+{saasGrowth[0]}%</span></div>
          <Slider value={saasGrowth} onValueChange={setSaasGrowth} min={0} max={30} step={0.5} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Manadschurn</span><span className="font-medium text-[#7A1A1A]">{churn[0]}%</span></div>
          <Slider value={churn} onValueChange={setChurn} min={0} max={15} step={0.5} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">CAC</Label>
          <Input type="number" value={cac} onChange={e => setCac(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
      </div>
    );

    if (industry === "ecommerce") return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Ordrar/dag</Label>
          <Input type="number" value={ordersPerDay} onChange={e => setOrdersPerDay(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Snittorder (AOV)</Label>
          <Input type="number" value={aov} onChange={e => setAov(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fasta kostnader/man</Label>
          <Input type="number" value={ecomFixed} onChange={e => setEcomFixed(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Returgrad</span><span className="font-medium text-[#7A1A1A]">{returnRate[0]}%</span></div>
          <Slider value={returnRate} onValueChange={setReturnRate} min={0} max={30} step={1} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">CAC</Label>
          <Input type="number" value={ecomCac} onChange={e => setEcomCac(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Lageromsattning</span><span className="font-medium">{inventoryTurnover[0]}x/ar</span></div>
          <Slider value={inventoryTurnover} onValueChange={setInventoryTurnover} min={1} max={20} step={1} />
        </div>
      </div>
    );

    if (industry === "service") return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Antal anstallda</Label>
          <Input type="number" value={employees} onChange={e => setEmployees(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Timpris (kr)</Label>
          <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Lonekostr/anst.</Label>
          <Input type="number" value={salaryPerEmp} onChange={e => setSalaryPerEmp(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Debiteringsgrad</span><span className="font-medium text-[#085041]">{utilization[0]}%</span></div>
          <Slider value={utilization} onValueChange={setUtilization} min={30} max={100} step={1} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Tillvaxt (anstallda)</span><span className="font-medium">+{serviceGrowth[0]}%</span></div>
          <Slider value={serviceGrowth} onValueChange={setServiceGrowth} min={0} max={50} step={1} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Overhead/man</Label>
          <Input type="number" value={overheadPerMonth} onChange={e => setOverheadPerMonth(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
      </div>
    );

    // Hybrid
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Startkunder</Label>
          <Input type="number" value={customers} onChange={e => setCustomers(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Snittpris/man (kr)</Label>
          <Input type="number" value={avgPrice} onChange={e => setAvgPrice(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fasta kostnader/man</Label>
          <Input type="number" value={hybridFixed} onChange={e => setHybridFixed(+e.target.value || 0)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Tillvaxt</span><span className="font-medium text-[#085041]">+{hybridGrowth[0]}%</span></div>
          <Slider value={hybridGrowth} onValueChange={setHybridGrowth} min={0} max={30} step={0.5} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Churn</span><span className="font-medium text-[#7A1A1A]">{hybridChurn[0]}%</span></div>
          <Slider value={hybridChurn} onValueChange={setHybridChurn} min={0} max={20} step={0.5} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span>Bruttomarginal</span><span className="font-medium">{grossMargin[0]}%</span></div>
          <Slider value={grossMargin} onValueChange={setGrossMargin} min={10} max={95} step={1} />
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="border border-border/50 backdrop-blur-sm" style={{ background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.95) 100%)" }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0F1F3D]">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm">Driver-baserad modell</CardTitle>
              <CardDescription className="text-xs">Valj branschtyp — AI anpassar drivarna automatiskt</CardDescription>
            </div>
          </div>
          {/* Industry selector */}
          <Tabs value={industry} onValueChange={v => setIndustry(v as IndustryType)} className="mt-3">
            <TabsList className="h-8 w-full">
              {(Object.entries(INDUSTRY_CONFIG) as [IndustryType, typeof INDUSTRY_CONFIG["saas"]][]).map(([key, cfg]) => (
                <TabsTrigger key={key} value={key} className="text-xs h-7 gap-1 flex-1">
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-5">
          {renderDriverInputs()}

          {/* KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Arsomsattning", value: formatSEK(annualRevenue) + " kr", color: "text-foreground" },
              { label: "Arsresultat", value: formatSEK(annualResult) + " kr", color: annualResult >= 0 ? "text-[#085041]" : "text-[#7A1A1A]" },
              { label: "Bruttomarginal", value: annualGrossMargin.toFixed(1) + "%", color: annualGrossMargin > 50 ? "text-[#085041]" : "text-[#7A5417]" },
              { label: "Break-even", value: breakEvenMonth >= 0 ? MONTH_LABELS[breakEvenMonth] : "Ej uppnadd", color: breakEvenMonth >= 0 ? "text-[#085041]" : "text-[#7A1A1A]" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-muted/50 rounded-lg p-2.5 text-center transition-all hover:bg-muted/70">
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                <p className={cn("text-sm font-bold tabular-nums", kpi.color)}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={projection}>
              <ChartGradients />
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} opacity={0.2} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `${formatSEK(v)} kr`} />
              <Legend content={<CustomLegend />} />
              <Area type="monotone" dataKey="revenue" fill="#c7d2fe" stroke="#6366f1" fillOpacity={0.3} strokeWidth={2} name="Intakter" />
              <Area type="monotone" dataKey="grossProfit" fill="#a7f3d0" stroke="#059669" fillOpacity={0.2} strokeWidth={1.5} name="Bruttovinst" />
              <Area type="monotone" dataKey="netResult" fill={annualResult >= 0 ? "#bbf7d0" : "#fecaca"} stroke={annualResult >= 0 ? "#16a34a" : "#dc2626"} fillOpacity={0.3} strokeWidth={2} name="Nettoresultat" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <BudgetAIInsight title="AI CFO — Driveranalys" insight={insight} />
    </div>
  );
};
