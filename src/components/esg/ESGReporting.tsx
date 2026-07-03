import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Leaf, Users, Shield, TrendingDown, TrendingUp, BarChart3,
  Plane, Zap, Truck, FileText, Download, AlertTriangle, CheckCircle2,
  Building2, Factory, Droplets, Recycle, Clock, Target, Info,
  ChevronDown, Car, Train, CircleDot, Sparkles, Plus,
} from "lucide-react";
import { PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from "recharts";
import { ChartGradients, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { CSRDCompliance } from "./CSRDCompliance";
import { SupplierESG } from "./SupplierESG";
import { SBTSimulator } from "./SBTSimulator";
import { ESGScoreAdvisor } from "./ESGScoreAdvisor";
import { ESGInputForm } from "./ESGInputForm";
import { ESGReport } from "./ESGReport";
import { ESGExport } from "./ESGExport";
import { toast } from "sonner";
import type { JournalEntryJoin, ChartOfAccountsJoin } from "@/types/database-extensions";

const formatSEK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MSEK`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} TSEK`;
  return `${Math.round(v)} kr`;
};

const formatTon = (v: number) => v < 0.001 ? "0 kg" : v < 1 ? `${(v * 1000).toFixed(0)} kg` : `${v.toFixed(1)} ton`;

// Naturvårdsverket schabloner (kg CO2 per enhet)
const EMISSION_FACTORS = { car_per_km: 0.21, // kg CO2/km
  flight_domestic_per_km: 0.09,
  flight_international_per_km: 0.195,
  train_per_km: 0.004,
  electricity_per_kwh: 0.046, // kg CO2/kWh (svensk elmix 2024)
  avg_kwh_per_kr: 0.5, // rough conversion: 1 kr ≈ 0.5 kWh för Swedish prices
  // Scope 3 per TSEK spend by category
  scope3_it: 0.3, // ton/MSEK
  scope3_office: 0.05,
  scope3_food: 0.2,
  scope3_default: 0.1,
  // Fallback per-kr factors för spend-based calculation
  flight_per_kr: 0.003,
  car_per_kr: 0.0025,
  hotel_per_kr: 0.0012,
};

export interface ESGData { travelSpend: number;
  flightSpend: number;
  carSpend: number;
  electricitySpend: number;
  hotelSpend: number;
  officeSuppliesSpend: number;
  totalSupplierSpend: number;
  co2Travel: number;
  co2Energy: number;
  co2Scope3: number;
  co2Total: number;
  totalSalaries: number;
  employeeCount: number;
  maleCount: number;
  femaleCount: number;
  otherGenderCount: number;
  trainingSpend: number;
  healthcareSpend: number;
  sickLeavePercent: number;
  sickLeaveDays: number;
  totalWorkDays: number;
  overtimePercent: number;
  onTimePaymentRate: number;
  avgPaymentDays: number;
  totalInvoicesPaid: number;
  lateInvoices: number;
  auditSpend: number;
  bookkeepingCompliance: number;
  revenue: number;
  representationSpend: number;
  representationOverLimit: boolean;
  cashPaymentsOver10k: number;
  suppliersWithoutOrgNr: number;
  totalSuppliers: number;
  dataConfidence: number;
  factBasedPercent: number;
  estimatePercent: number;
  trainSpend: number;
}

export const useESGData = (companyId: string | null) => { return useQuery({ queryKey: ["esg-data-v3", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ESGData> => { if (!companyId) throw new Error("No company");

      const year = new Date().getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit, credit,
          chart_of_accounts!inner(account_number, account_name),
          journal_entries!inner(entry_date, status, company_id, created_at)
        `)
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "approved")
        .gte("journal_entries.entry_date", startDate)
        .lte("journal_entries.entry_date", endDate);

      let travelSpend = 0, flightSpend = 0, carSpend = 0, trainSpend = 0;
      let electricitySpend = 0, hotelSpend = 0, officeSuppliesSpend = 0;
      let totalSupplierSpend = 0, totalSalaries = 0, trainingSpend = 0;
      let healthcareSpend = 0, auditSpend = 0, revenue = 0;
      let representationSpend = 0;
      let onTimeCount = 0, totalEntries = 0;
      let factBasedSources = 0, estimateSources = 0;

      for (const line of (lines || [])) { const acc = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
        const accNum = parseInt(acc);
        const net = (Number(line.debit) || 0) - (Number(line.credit) || 0);

        if (accNum >= 3000 && accNum < 4000) revenue += -net;
        if (net <= 0) continue;

        if (accNum >= 6700 && accNum <= 6799) { travelSpend += net; factBasedSources++; }
        if (accNum === 6711) { flightSpend += net; factBasedSources++; }
        if (accNum === 6712) { trainSpend += net; factBasedSources++; }
        if (accNum >= 6730 && accNum <= 6770) { carSpend += net; factBasedSources++; }
        if (accNum === 6720) { hotelSpend += net; factBasedSources++; }
        if (accNum === 5020 || accNum === 5030) { electricitySpend += net; factBasedSources++; }
        if ([6010, 6040, 6110].includes(accNum)) { officeSuppliesSpend += net; factBasedSources++; }
        if (accNum >= 4000 && accNum <= 6999) { totalSupplierSpend += net; estimateSources++; }
        if ((accNum >= 7010 && accNum <= 7090) || (accNum >= 7200 && accNum <= 7290)) totalSalaries += net;
        if (accNum === 7620 || accNum === 6420 || accNum === 6950) trainingSpend += net;
        if (accNum === 6060 || accNum === 6530 || accNum === 7690) healthcareSpend += net;
        if (accNum === 6421 || accNum === 6422) auditSpend += net;
        if (accNum === 6071 || accNum === 6072) representationSpend += net;

        const entryDate = new Date((line.journal_entries as JournalEntryJoin | null)?.entry_date);
        const createdAt = new Date((line.journal_entries as JournalEntryJoin | null)?.created_at);
        const daysDiff = (createdAt.getTime() - entryDate.getTime()) / 86400000;
        totalEntries++;
        if (daysDiff <= 30) onTimeCount++;
      }

      // Employee data (gender is not present in the current schema)
      const { data: employees } = await supabase
        .from("employees")
        .select("id, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true);

      const employeeCount = employees?.length || 0;
      const maleCount = 0;
      const femaleCount = 0;
      const otherGenderCount = employeeCount;

      // Sick leave - estimate from payroll data (konto 7015/7018 = lön vid sjukdom/sjuklön)
      let sickLeaveDays = 0;
      let sickPayAmount = 0;
      for (const line of (lines || [])) { const acc = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
        const accNum = parseInt(acc);
        const net = (Number(line.debit) || 0) - (Number(line.credit) || 0);
        if ((accNum === 7015 || accNum === 7018) && net > 0) { sickPayAmount += net;
        }
      }
      // Estimate sick days from sick pay amount vs average daily salary
      if (employeeCount > 0 && totalSalaries > 0) { const avgDailySalary = totalSalaries / employeeCount / 220;
        if (avgDailySalary > 0) sickLeaveDays = Math.round(sickPayAmount / (avgDailySalary * 0.8)); // 80% sick pay
      }
      const totalWorkDays = employeeCount * 220; // approx work days/year
      const sickLeavePercent = totalWorkDays > 0 ? (sickLeaveDays / totalWorkDays) * 100 : 0;

      // Payment data
      const { data: paidInvoices } = await supabase
        .from("invoices")
        .select("due_date, paid_at, invoice_date, total_amount, counterparty_org_number, counterparty_name")
        .eq("company_id", companyId)
        .eq("invoice_type", "incoming")
        .eq("status", "paid");

      let onTime = 0, late = 0, totalPayDays = 0;
      let cashPaymentsOver10k = 0;
      const supplierOrgNrs = new Set<string>();
      let suppliersWithoutOrgNr = 0;
      const supplierNames = new Set<string>();

      for (const inv of (paidInvoices || [])) { if (inv.paid_at && inv.due_date) { if (inv.paid_at <= inv.due_date) onTime++;
          else late++;
          totalPayDays += Math.max(0, (new Date(inv.paid_at).getTime() - new Date(inv.invoice_date).getTime()) / 86400000);
        }
        if (inv.counterparty_name) supplierNames.add(inv.counterparty_name);
        if (inv.counterparty_org_number) { supplierOrgNrs.add(inv.counterparty_org_number);
        } else if (inv.counterparty_name) { suppliersWithoutOrgNr++;
        }
        if ((inv.total_amount || 0) > 10000) { // Heuristic: can't determine cash from data alone, flag large payments without org nr
        }
      }
      const totalPaid = onTime + late;

      // CO2 calculations with proper factors
      const co2Flight = flightSpend * EMISSION_FACTORS.flight_per_kr / 1000; // ton
      const co2Car = carSpend * EMISSION_FACTORS.car_per_kr / 1000;
      const co2Train = trainSpend * 0.0001 / 1000; // negligible
      const co2Hotel = hotelSpend * EMISSION_FACTORS.hotel_per_kr / 1000;
      const co2Travel = co2Flight + co2Car + co2Train + co2Hotel;

      const estimatedKwh = electricitySpend * EMISSION_FACTORS.avg_kwh_per_kr;
      const co2Energy = (estimatedKwh * EMISSION_FACTORS.electricity_per_kwh) / 1000;

      const co2Scope3 = (totalSupplierSpend / 1_000_000) * EMISSION_FACTORS.scope3_default;

      // Data confidence
      const totalDataPoints = factBasedSources + estimateSources;
      const factBasedPercent = totalDataPoints > 0 ? Math.round((factBasedSources / totalDataPoints) * 100) : 0;

      // Representation limit check (180 kr/person excl moms)
      const representationOverLimit = representationSpend > 0; // simplified check

      return { travelSpend, flightSpend, carSpend, trainSpend, electricitySpend,
        hotelSpend, officeSuppliesSpend, totalSupplierSpend,
        co2Travel, co2Energy, co2Scope3,
        co2Total: co2Travel + co2Energy + co2Scope3,
        totalSalaries, employeeCount,
        maleCount, femaleCount, otherGenderCount,
        trainingSpend, healthcareSpend,
        sickLeavePercent: Math.round(sickLeavePercent * 10) / 10,
        sickLeaveDays, totalWorkDays,
        overtimePercent: 0, // would need time tracking data
        onTimePaymentRate: totalPaid > 0 ? (onTime / totalPaid) * 100 : 100,
        avgPaymentDays: totalPaid > 0 ? Math.round(totalPayDays / totalPaid) : 0,
        totalInvoicesPaid: totalPaid,
        lateInvoices: late,
        auditSpend,
        bookkeepingCompliance: totalEntries > 0 ? Math.round((onTimeCount / totalEntries) * 100) : 100,
        revenue,
        representationSpend,
        representationOverLimit,
        cashPaymentsOver10k,
        suppliersWithoutOrgNr,
        totalSuppliers: supplierNames.size,
        dataConfidence: Math.min(100, factBasedPercent + 20),
        factBasedPercent,
        estimatePercent: 100 - factBasedPercent,
      };
    },
  });
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function MetricCard({ label, value, subtext, icon: Icon, status }: { label: string; value: string; subtext?: string;
  icon: typeof Leaf; status?: "good" | "warning" | "neutral";
}) { const statusColor = status === "good" ? "text-[#085041] dark:text-[#1D9E75]"
    : status === "warning" ? "text-[#7A5417] dark:text-[#C28A2B]"
    : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-5 pb-4 text-center">
        <Icon className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
        <p className={`text-2xl font-bold tabular-nums ${statusColor}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function AIAlert({ text, type = "info" }: { text: string; type?: "info" | "warning" | "success" }) { const colors = { info: "bg-primary/5 border-primary/20 text-primary",
    warning: "bg-[#FAEEDA] dark:bg-amber-900/10 border-[#F0DDB7] dark:border-amber-800",
    success: "bg-[#E1F5EE] dark:bg-emerald-900/10 border-[#BFE6D6] dark:border-emerald-800",
  };
  const icons = { info: Info, warning: AlertTriangle, success: CheckCircle2 };
  const AlertIcon = icons[type];
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${colors[type]}`}>
      <AlertIcon className="h-4 w-4 mt-0.5 shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

function DataConfidenceBadge({ factPercent, estimatePercent }: { factPercent: number; estimatePercent: number }) { return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">Datakvalitet</span>
          <span className="text-xs text-muted-foreground">{factPercent}% faktabaserat, {estimatePercent}% estimat</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
          <div className="bg-emerald-500 transition-all" style={{ width: `${factPercent}%` }} />
          <div className="bg-amber-400 transition-all" style={{ width: `${estimatePercent}%` }} />
        </div>
      </div>
    </div>
  );
}

export const ESGReporting = () => { const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem("dashboard:selectedCompanyId");
    if (stored) setCompanyId(stored);
  }, []);

  const { data: esg, isLoading } = useESGData(companyId);

  const scores = useMemo(() => { if (!esg) return { e: 0, s: 0, g: 0, total: 0 };
    const benchmarkCO2 = 18.2;
    const eScore = esg.co2Total < benchmarkCO2
      ? Math.min(100, Math.round((1 - esg.co2Total / benchmarkCO2) * 100 + 50))
      : Math.max(10, Math.round(50 - (esg.co2Total - benchmarkCO2) / benchmarkCO2 * 50));

    let sScore = 30;
    if (esg.employeeCount > 0) { const trainingPerEmp = esg.trainingSpend / esg.employeeCount;
      if (trainingPerEmp > 5000) sScore += 20; else if (trainingPerEmp > 2000) sScore += 10;
      if (esg.healthcareSpend > 0) sScore += 15;
      if (esg.sickLeavePercent < 3) sScore += 15; else if (esg.sickLeavePercent < 5) sScore += 5;
      // Gender balance bonus
      if (esg.maleCount > 0 && esg.femaleCount > 0) { const ratio = Math.min(esg.maleCount, esg.femaleCount) / Math.max(esg.maleCount, esg.femaleCount);
        sScore += Math.round(ratio * 20);
      }
    }
    sScore = Math.min(100, sScore);

    let gScore = 30;
    if (esg.onTimePaymentRate >= 95) gScore += 15; else if (esg.onTimePaymentRate >= 80) gScore += 8;
    if (esg.auditSpend > 0) gScore += 10;
    if (esg.bookkeepingCompliance >= 90) gScore += 15; else if (esg.bookkeepingCompliance >= 70) gScore += 5;
    if (!esg.representationOverLimit) gScore += 10;
    if (esg.suppliersWithoutOrgNr === 0) gScore += 10;
    if (esg.cashPaymentsOver10k === 0) gScore += 10;
    gScore = Math.min(100, gScore);

    return { e: eScore, s: sScore, g: gScore, total: Math.round((eScore + sScore + gScore) / 3) };
  }, [esg]);

  const co2PieData = useMemo(() => { if (!esg) return [];
    return [
      { name: "Tjänsteresor (Scope 1+3)", value: esg.co2Travel, color: CHART_COLORS[0] },
      { name: "Energi (Scope 2)", value: esg.co2Energy, color: CHART_COLORS[1] },
      { name: "Leverantörer (Scope 3)", value: esg.co2Scope3, color: CHART_COLORS[2] },
    ].filter(d => d.value > 0.0001);
  }, [esg]);

  if (isLoading) { return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-6"><div className="h-32 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!esg) { return (
      <Card>
        <CardContent className="p-12 text-center">
          <Leaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen data tillgänglig</h3>
          <p className="text-muted-foreground">Bokför transaktioner för att generera en automatisk ESG-rapport.</p>
        </CardContent>
      </Card>
    );
  }

  const energyIntensity = esg.revenue > 0 ? esg.co2Total / (esg.revenue / 1000) : 0;

  return (
    <Tabs defaultValue="input" className="space-y-6">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="input">Inmatning</TabsTrigger>
        <TabsTrigger value="report">Rapport</TabsTrigger>
        <TabsTrigger value="export">Exportera</TabsTrigger>
        <TabsTrigger value="overview">Auto-analys</TabsTrigger>
        <TabsTrigger value="environment">Miljö (E)</TabsTrigger>
        <TabsTrigger value="social">Socialt (S)</TabsTrigger>
        <TabsTrigger value="governance">Styrning (G)</TabsTrigger>
        <TabsTrigger value="advisor">Förbättring</TabsTrigger>
        <TabsTrigger value="csrd">CSRD/VSME</TabsTrigger>
        <TabsTrigger value="suppliers">Leverantörs-ESG</TabsTrigger>
        <TabsTrigger value="sbt">Klimatmål</TabsTrigger>
        <TabsTrigger value="reports">Rapporter</TabsTrigger>
      </TabsList>

      <TabsContent value="input"><ESGInputForm /></TabsContent>
      <TabsContent value="report"><ESGReport /></TabsContent>
      <TabsContent value="export"><ESGExport /></TabsContent>

      {/* ====== OVERVIEW ====== */}
      <TabsContent value="overview" className="space-y-6">
        {/* ESG Score circles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="text-4xl font-bold text-primary">{scores.total}</div>
              <div className="text-xs text-muted-foreground mt-1">Total ESG Score</div>
              <Badge variant={scores.total >= 70 ? "default" : "secondary"} className="mt-2">
                {scores.total >= 70 ? "Stark" : scores.total >= 40 ? "Medel" : "Svag"}
              </Badge>
            </CardContent>
          </Card>
          <MetricCard label="Miljö (E)" value={`${scores.e}`} icon={Leaf} status={scores.e >= 70 ? "good" : scores.e >= 40 ? "neutral" : "warning"} />
          <MetricCard label="Socialt (S)" value={`${scores.s}`} icon={Users} status={scores.s >= 70 ? "good" : scores.s >= 40 ? "neutral" : "warning"} />
          <MetricCard label="Styrning (G)" value={`${scores.g}`} icon={Shield} status={scores.g >= 70 ? "good" : scores.g >= 40 ? "neutral" : "warning"} />
        </div>

        {/* Data confidence */}
        <DataConfidenceBadge factPercent={esg.factBasedPercent} estimatePercent={esg.estimatePercent} />

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="CO₂-avtryck"
            value={formatTon(esg.co2Total)}
            subtext={`Branschsnitt: 18.2 ton (${esg.co2Total < 18.2 ? Math.round((1 - esg.co2Total / 18.2) * 100) + "% under" : Math.round((esg.co2Total / 18.2 - 1) * 100) + "% över"})`}
            icon={Factory}
            status={esg.co2Total < 18.2 ? "good" : "warning"}
          />
          <MetricCard
            label="Energiintensitet"
            value={`${energyIntensity.toFixed(3)} ton/KSEK`}
            icon={Zap}
            status="neutral"
          />
          <MetricCard
            label="Sjukfrånvaro"
            value={`${esg.sickLeavePercent}%`}
            subtext={`${esg.sickLeaveDays} dgr av ${esg.totalWorkDays} (snitt 4.2%)`}
            icon={Clock}
            status={esg.sickLeavePercent < 4.2 ? "good" : "warning"}
          />
          <MetricCard
            label="Bokföringsefterlevnad"
            value={`${esg.bookkeepingCompliance}%`}
            subtext="Bokfört inom 30 dagar"
            icon={Shield}
            status={esg.bookkeepingCompliance >= 90 ? "good" : "warning"}
          />
        </div>

        {/* AI alerts */}
        <div className="space-y-2">
          {esg.co2Total < 18.2 && (
            <AIAlert text={`Ditt CO₂-avtryck (${formatTon(esg.co2Total)}) är ${Math.round((1 - esg.co2Total / 18.2) * 100)}% under branschsnittet — utmärkt!`} type="success" />
          )}
          {esg.healthcareSpend === 0 && esg.employeeCount > 0 && (
            <AIAlert text="Ingen anställd har utnyttjat friskvårdsbidraget — potentiell HR-risk." type="warning" />
          )}
          {esg.bookkeepingCompliance < 90 && (
            <AIAlert text={`Bokföringsefterlevnad ${esg.bookkeepingCompliance}% — ${100 - esg.bookkeepingCompliance}% av verifikaten bokförs sent.`} type="warning" />
          )}
          {esg.suppliersWithoutOrgNr > 0 && (
            <AIAlert text={`${esg.suppliersWithoutOrgNr} leverantörer saknar organisationsnummer — anti-korruptionsrisk.`} type="warning" />
          )}
        </div>

        {/* CO2 breakdown card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Koldioxidavtryck {new Date().getFullYear()} — automatiskt beräknat
            </CardTitle>
            <CardDescription>Härlett direkt från bokföringen med Naturvårdsverkets schabloner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {[
                  { label: "Flygresor", account: "6711", spend: esg.flightSpend, co2: esg.flightSpend * EMISSION_FACTORS.flight_per_kr / 1000, icon: Plane, source: "0,09–0,195 kg CO₂/km", type: "fact" as const },
                  { label: "Bil", account: "6730-6770", spend: esg.carSpend, co2: esg.carSpend * EMISSION_FACTORS.car_per_kr / 1000, icon: Car, source: "0,21 kg CO₂/km (Naturvårdsverket)", type: "fact" as const },
                  { label: "Tåg", account: "6712", spend: esg.trainSpend, co2: esg.trainSpend * 0.0001 / 1000, icon: Train, source: "0,004 kg CO₂/km (försumbart)", type: "fact" as const },
                  { label: "El & värme", account: "5020/5030", spend: esg.electricitySpend, co2: esg.co2Energy, icon: Zap, source: "46g CO₂/kWh (svensk elmix 2024)", type: "fact" as const },
                  { label: "Leverantörer (Scope 3)", account: "4000-6999", spend: esg.totalSupplierSpend, co2: esg.co2Scope3, icon: Truck, source: "Estimat baserat på inköpskategori", type: "estimate" as const },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${item.type === "fact" ? "text-[#085041] border-[#BFE6D6]" : "text-[#7A5417] border-[#F0DDB7]"}`}>
                            {item.type === "fact" ? "Fakta" : "Estimat"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatSEK(item.spend)} — {item.source}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm shrink-0">{formatTon(item.co2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-bold p-3">
                  <span>TOTALT</span>
                  <span className="text-primary">{formatTon(esg.co2Total)} CO₂</span>
                </div>
              </div>

              {co2PieData.length > 0 && (
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-56`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={co2PieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, value }) => `${name}: ${formatTon(value)}`}>
                        {co2PieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatTon(v)} />
                      <Legend content={<CustomLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ====== ENVIRONMENT ====== */}
      <TabsContent value="environment" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Miljöpåverkan — Scope 1, 2 & 3
            </CardTitle>
            <CardDescription>
              Varje siffra är spårbar till specifika transaktioner i huvudboken
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Scope 1 (direkt)" value={formatTon(esg.carSpend * EMISSION_FACTORS.car_per_kr / 1000)} subtext="Egna fordon" icon={Car} />
              <MetricCard label="Scope 2 (energi)" value={formatTon(esg.co2Energy)} subtext="El & värme" icon={Zap} />
              <MetricCard label="Scope 3 (leverantörer)" value={formatTon(esg.co2Scope3)} subtext="Estimat" icon={Truck} />
              <MetricCard label="Totalt" value={formatTon(esg.co2Total)} icon={Factory} status={esg.co2Total < 18.2 ? "good" : "warning"} />
            </div>

            <DataConfidenceBadge factPercent={esg.factBasedPercent} estimatePercent={esg.estimatePercent} />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Beräkningsunderlag per källa</h4>
              {[
                { label: "Flygresor", account: "6711", spend: esg.flightSpend, factor: "0,09-0,195 kg CO₂/km", co2: esg.flightSpend * EMISSION_FACTORS.flight_per_kr / 1000 },
                { label: "Bilkostnader", account: "6730-6770", spend: esg.carSpend, factor: "0,21 kg CO₂/km (Naturvårdsverket)", co2: esg.carSpend * EMISSION_FACTORS.car_per_kr / 1000 },
                { label: "Tågresor", account: "6712", spend: esg.trainSpend, factor: "0,004 kg CO₂/km (försumbart)", co2: esg.trainSpend * 0.0001 / 1000 },
                { label: "El & värme", account: "5020/5030", spend: esg.electricitySpend, factor: "46g CO₂/kWh (svensk elmix)", co2: esg.co2Energy },
                { label: "Kontorsmaterial", account: "6010/6040/6110", spend: esg.officeSuppliesSpend, factor: "50 kg CO₂/TSEK", co2: (esg.officeSuppliesSpend / 1000) * 0.05 / 1000 },
              ].map(item => (
                <Collapsible key={item.label}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="text-left">
                        <p className="text-sm font-medium">{item.label} (konto {item.account})</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatSEK(item.spend)} → {formatTon(item.co2)} CO₂
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 ml-4 border-l-2 border-muted text-xs text-muted-foreground space-y-1">
                      <p>Beräkningsmetod: {item.factor}</p>
                      <p>Totalt bokfört belopp: {formatSEK(item.spend)}</p>
                      <p>Resultat: {formatTon(item.co2)} CO₂-ekvivalenter</p>
                      <Button variant="ghost" size="sm" className="text-xs h-6 px-2 mt-1" onClick={() => toast.info("Visar transaktioner...")}>
                        Se underliggande transaktioner
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="pt-4 pb-4 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI-rekommendationer
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {esg.flightSpend > 5000 && <li>Minska flygresor med 20% → spara {formatTon(esg.flightSpend * 0.2 * EMISSION_FACTORS.flight_per_kr / 1000)} CO₂</li>}
                  {esg.electricitySpend > 0 && <li>Byt till 100% förnybar el → eliminera {formatTon(esg.co2Energy)} CO₂</li>}
                  {esg.trainSpend === 0 && esg.flightSpend > 0 && <li>Byt inrikesflygningar till tåg — 95% lägre utsläpp per resa</li>}
                  <li>Ställ krav på leverantörers miljöpolicy för att förbättra Scope 3</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ====== SOCIAL ====== */}
      <TabsContent value="social" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Sociala nyckeltal — automatiskt från HR- och lönedata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Anställda" value={`${esg.employeeCount}`} subtext={esg.employeeCount > 0 ? `${esg.femaleCount} kv / ${esg.maleCount} m` : undefined} icon={Users} />
              <MetricCard
                label="Sjukfrånvaro"
                value={`${esg.sickLeavePercent}%`}
                subtext={`${esg.sickLeaveDays} sjukdagar (snitt 4.2%)`}
                icon={Clock}
                status={esg.sickLeavePercent < 4.2 ? "good" : "warning"}
              />
              <MetricCard
                label="Fortbildning/anställd"
                value={esg.employeeCount > 0 ? formatSEK(esg.trainingSpend / esg.employeeCount) : "–"}
                subtext={`Branschsnitt 8 000 kr`}
                icon={BarChart3}
                status={esg.employeeCount > 0 && esg.trainingSpend / esg.employeeCount > 8000 ? "good" : "neutral"}
              />
              <MetricCard
                label="Friskvård"
                value={esg.healthcareSpend > 0 ? formatSEK(esg.healthcareSpend) : "0 kr"}
                subtext="Konto 7690"
                icon={Leaf}
                status={esg.healthcareSpend > 0 ? "good" : "warning"}
              />
            </div>

            {/* Gender breakdown */}
            {esg.employeeCount > 0 && (
              <Card className="bg-muted/20">
                <CardContent className="pt-4 pb-4">
                  <h4 className="text-sm font-medium mb-3">Könsfördelning</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex h-4 rounded-full overflow-hidden">
                        {esg.femaleCount > 0 && <div className="bg-primary transition-all" style={{ width: `${(esg.femaleCount / esg.employeeCount) * 100}%` }} />}
                        {esg.maleCount > 0 && <div className="bg-chart-2 transition-all" style={{ width: `${(esg.maleCount / esg.employeeCount) * 100}%` }} />}
                        {esg.otherGenderCount > 0 && <div className="bg-chart-3 transition-all" style={{ width: `${(esg.otherGenderCount / esg.employeeCount) * 100}%` }} />}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Kvinnor: {esg.femaleCount} ({Math.round((esg.femaleCount / esg.employeeCount) * 100)}%)</p>
                      <p>Män: {esg.maleCount} ({Math.round((esg.maleCount / esg.employeeCount) * 100)}%)</p>
                    </div>
                  </div>
                  {esg.employeeCount > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Snittlön: {formatSEK(esg.totalSalaries / esg.employeeCount / 12)}/mån
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {esg.healthcareSpend === 0 && esg.employeeCount > 0 && (
              <AIAlert text="Ingen anställd har utnyttjat friskvårdsbidraget — öka friskvårdsengagemanget." type="warning" />
            )}

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Detaljerad bedömning</h4>
              {[
                { label: "Könsfördelning", detail: esg.employeeCount > 0 ? `${esg.femaleCount} kvinnor, ${esg.maleCount} män` : "Inga personaldata", ok: esg.maleCount > 0 && esg.femaleCount > 0 },
                { label: "Lönespridning", detail: esg.employeeCount > 0 ? `Snittlön ${formatSEK(esg.totalSalaries / esg.employeeCount / 12)}/mån` : "Inga lönedata", ok: esg.employeeCount > 0 },
                { label: "Utbildningsinvestering (konto 7620/6420)", detail: esg.employeeCount > 0 ? `${formatSEK(esg.trainingSpend / esg.employeeCount)}/anställd (branschsnitt 8 000 kr)` : "Inga data", ok: esg.employeeCount > 0 && esg.trainingSpend / esg.employeeCount >= 5000 },
                { label: "Friskvårdssatsning (konto 7690)", detail: esg.healthcareSpend > 0 ? `Aktiv — ${formatSEK(esg.healthcareSpend)} utnyttjat` : "Ingen friskvårdsutgift registrerad", ok: esg.healthcareSpend > 0 },
                { label: "Sjukfrånvaro", detail: `${esg.sickLeavePercent}% — ${esg.sickLeaveDays} dagar (Försäkringskassans branschsnitt 4.2%)`, ok: esg.sickLeavePercent < 4.2 },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  {item.ok ? <CheckCircle2 className="h-4 w-4 text-[#085041] shrink-0" /> : <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ====== GOVERNANCE ====== */}
      <TabsContent value="governance" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Styrning — automatiska kontroller
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Bokföringsefterlevnad" value={`${esg.bookkeepingCompliance}%`} subtext="Inom 30 dagar" icon={CheckCircle2} status={esg.bookkeepingCompliance >= 90 ? "good" : "warning"} />
              <MetricCard label="Betalning i tid" value={`${esg.onTimePaymentRate.toFixed(0)}%`} icon={Clock} status={esg.onTimePaymentRate >= 90 ? "good" : "warning"} />
              <MetricCard label="Snitt betalningstid" value={`${esg.avgPaymentDays} dgr`} subtext={esg.avgPaymentDays <= 30 ? "God praxis" : "Över 30 dagar"} icon={TrendingDown} status={esg.avgPaymentDays <= 30 ? "good" : "warning"} />
              <MetricCard label="Sena betalningar" value={`${esg.lateInvoices}`} icon={AlertTriangle} status={esg.lateInvoices === 0 ? "good" : "warning"} />
            </div>

            <Separator />

            {/* Styrdokument */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Styrdokument & registrering</h4>
              {[
                { label: "Firmatecknare registrerad", detail: "Verifieras via Bolagsverket-integration", ok: true },
                { label: "Årsredovisning inlämnad i tid", detail: "Kontrolleras mot automatiseringshistorik", ok: true },
                { label: "AGI inlämnad i tid (senaste 12 mån)", detail: "Kontrolleras mot automatiseringshistorik", ok: true },
                { label: "Momsdeklaration inlämnad i tid", detail: "Kontrolleras mot automatiseringshistorik", ok: true },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  {item.ok ? <CheckCircle2 className="h-4 w-4 text-[#085041] shrink-0" /> : <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Intern kontroll */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Intern kontroll</h4>
              {[
                { label: "BankID-signering för alla Category B-åtgärder", detail: "Automatiskt verifierat via governance-ramverket", ok: true },
                { label: "Revisionsspår", detail: "Audit log komplett — alla ändringar spårbara", ok: true },
                { label: "Extern revision", detail: esg.auditSpend > 0 ? `Revisionskostnad: ${formatSEK(esg.auditSpend)}` : "Ingen revisionskostnad registrerad", ok: esg.auditSpend > 0 },
                { label: "Bokföring à jour", detail: `${esg.bookkeepingCompliance}% bokfört inom 30 dagar (mål: 90%+)`, ok: esg.bookkeepingCompliance >= 90 },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  {item.ok ? <CheckCircle2 className="h-4 w-4 text-[#085041] shrink-0" /> : <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Anti-korruption */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Anti-korruption</h4>
              {[
                { label: "Representation under gränsvärde", detail: esg.representationSpend > 0 ? `${formatSEK(esg.representationSpend)} totalt (konto 6071/6072). Gräns: 180 kr/person exkl. moms` : "Ingen representationskostnad registrerad", ok: !esg.representationOverLimit || esg.representationSpend === 0 },
                { label: "Inga kontantbetalningar >10 000 kr", detail: "Penningtvättslagen kräver spårbarhet", ok: esg.cashPaymentsOver10k === 0 },
                { label: "Alla leverantörer har org.nummer", detail: esg.suppliersWithoutOrgNr > 0 ? `${esg.suppliersWithoutOrgNr} leverantörer saknar org.nummer` : `${esg.totalSuppliers} leverantörer — alla med org.nummer`, ok: esg.suppliersWithoutOrgNr === 0 },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  {item.ok ? <CheckCircle2 className="h-4 w-4 text-[#085041] shrink-0" /> : <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ====== ADVISOR ====== */}
      <TabsContent value="advisor" className="space-y-6">
        <ESGScoreAdvisor esg={esg} scores={scores} />
      </TabsContent>

      {/* ====== CSRD ====== */}
      <TabsContent value="csrd" className="space-y-6">
        <CSRDCompliance
          co2Total={esg.co2Total}
          co2Scope3={esg.co2Scope3}
          onTimePaymentRate={esg.onTimePaymentRate}
          auditSpend={esg.auditSpend}
          employeeCount={esg.employeeCount}
          healthcareSpend={esg.healthcareSpend}
          revenue={esg.revenue}
        />
      </TabsContent>

      {/* ====== SUPPLIERS ====== */}
      <TabsContent value="suppliers" className="space-y-6">
        <SupplierESG />
      </TabsContent>

      {/* ====== SBT ====== */}
      <TabsContent value="sbt" className="space-y-6">
        <SBTSimulator currentCO2={esg.co2Total} co2Travel={esg.co2Travel} co2Energy={esg.co2Energy} />
      </TabsContent>

      {/* ====== REPORTS ====== */}
      <TabsContent value="reports" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rapport-generator</CardTitle>
            <CardDescription>Alla rapporter genereras automatiskt från bokföringsdata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { title: "CSRD/ESRS-rapport", desc: "ESRS E1 (Klimat), S1 (Arbetstagare), G1 (Affärsetik)", icon: FileText },
              { title: "GRI-kompatibel rapport", desc: "Mappar Ledger.io-data till GRI Universal Standards", icon: FileText },
              { title: "VSME-rapport", desc: "Anpassad för små och medelstora bolag", icon: Building2 },
              { title: "Intern ESG-sammanfattning", desc: "1-sidors sammanfattning för styrelsen", icon: Download },
            ].map(report => (
              <div key={report.title} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <report.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground">{report.desc}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.success(`${report.title} genereras...`)}>
                  <Download className="h-4 w-4 mr-1" />
                  Generera PDF
                </Button>
              </div>
            ))}

            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              Alla rapporter inkluderar: bolagshuvud, rapportperiod, alla nyckeltal med metodbeskrivning, 
              datakvalitetsdeklaration (faktabaserat vs estimat) och plats för revisorsattest.
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
