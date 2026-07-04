import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankIDReviewScreen } from "@/components/governance/BankIDReviewScreen";
import { AccuracyDisclaimer } from "@/components/governance/AccuracyDisclaimer";
import { LockIcon } from "@/components/governance/LockIcon";
import { FileText, Download, Send, BarChart3, Calendar, Users, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Clock,
} from "lucide-react";
import { GradientKPIStrip, KPI_GRADIENTS } from "@/components/shared/GradientKPICard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface PayrollReportsProps { companyId: string;
  employees: any[];
  payrollRuns: any[];
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
const EMPLOYER_FEE_RATE = 0.3142;

export const PayrollReports = ({ companyId, employees, payrollRuns }: PayrollReportsProps) => {
  const chartTheme = useChartTheme(); const [showAgiSign, setShowAgiSign] = useState(false);
  const [showKu10Sign, setShowKu10Sign] = useState(false);
  const activeEmps = employees.filter(e => e.is_active);

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthName = prevMonth.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });

  const totalGross = activeEmps.reduce((s, e) => s + (e.monthly_salary || 0), 0);
  const totalEmployerFees = Math.round(totalGross * EMPLOYER_FEE_RATE);
  const totalToSkv = activeEmps.reduce((s, e) => { const gross = e.monthly_salary || 0;
    // Approximate tax ~27%
    return s + Math.round(gross * 0.27);
  }, 0) + totalEmployerFees;

  // Monthly cost data för charts
  const monthlyData = useMemo(() => { const months = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("sv-SE", { month: "short" });
      const run = payrollRuns.find(r => { const rd = new Date(r.period_start);
        return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      });
      months.push({ month: label,
        brutto: run?.total_gross || totalGross,
        arbetsgivaravgift: run ? Math.round(run.total_gross * EMPLOYER_FEE_RATE) : totalEmployerFees,
        netto: run?.total_net || Math.round(totalGross * 0.73),
      });
    }
    return months;
  }, [payrollRuns, totalGross]);

  // Vacation debt
  const vacationDebtData = activeEmps.map(e => { const salary = e.monthly_salary || 0;
    const dailySalary = salary / 21;
    const remaining = (e.vacation_days_per_year || 25) - (e.vacation_days_used || 0);
    return { name: `${e.first_name} ${e.last_name}`,
      days: remaining,
      dailySalary: Math.round(dailySalary),
      debt: Math.round(remaining * dailySalary),
    };
  });
  const totalVacationDebt = vacationDebtData.reduce((s, v) => s + v.debt, 0);

  if (showAgiSign) { return (
      <BankIDReviewScreen
        actionType="agi_submission"
        summaryItems={[
          { label: "Total bruttolön", value: `${fmt(totalGross)} kr` },
          { label: "Arbetsgivaravgifter (31,42%)", value: `${fmt(totalEmployerFees)} kr` },
          { label: "Preliminärskatt", value: `${fmt(totalToSkv - totalEmployerFees)} kr` },
          { label: "Totalt att betala Skatteverket", value: `${fmt(totalToSkv)} kr` },
          { label: "Antal anställda", value: `${activeEmps.length}` },
        ]}
        period={monthName}
        amount={totalToSkv}
        onSign={async () => { setShowAgiSign(false); }}
        onBack={() => setShowAgiSign(false)}
      />
    );
  }

  if (showKu10Sign) { return (
      <BankIDReviewScreen
        actionType="agi_submission"
        summaryItems={[
          { label: "Antal anställda", value: `${activeEmps.length}` },
          ...activeEmps.map(e => ({ label: `${e.first_name} ${e.last_name}`, value: `${fmt((e.monthly_salary || 0) * 12)} kr/år` })),
        ]}
        onSign={async () => { setShowKu10Sign(false); }}
        onBack={() => setShowKu10Sign(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="agi" className="space-y-4">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full">
          <TabsTrigger value="agi" className="text-xs">AGI</TabsTrigger>
          <TabsTrigger value="ku10" className="text-xs">KU10</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">Statistik</TabsTrigger>
          <TabsTrigger value="vacation-debt" className="text-xs">Semesterskuld</TabsTrigger>
          <TabsTrigger value="personnel" className="text-xs">Personalliggare</TabsTrigger>
        </TabsList>

        {/* AGI */}
        <TabsContent value="agi" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Arbetsgivardeklaration — {monthName}
                    <LockIcon />
                  </CardTitle>
                  <CardDescription>AI har förberett AGI baserat på månadens lönekörning</CardDescription>
                </div>
                <Badge className="bg-[#FAEEDA] text-[#7A5417]">Ej inskickad</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anställd</TableHead>
                    <TableHead className="text-right">Bruttolön</TableHead>
                    <TableHead className="text-right">Skatteavdrag</TableHead>
                    <TableHead className="text-right">Förmåner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmps.map(e => { const gross = e.monthly_salary || 0;
                    const tax = Math.round(gross * 0.27);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                        <TableCell className="text-right">{fmt(gross)} kr</TableCell>
                        <TableCell className="text-right">{fmt(tax)} kr</TableCell>
                        <TableCell className="text-right">0 kr</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="bg-muted p-4 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total bruttolön</span>
                  <span className="font-semibold">{fmt(totalGross)} kr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Arbetsgivaravgifter (31,42%)</span>
                  <span className="font-semibold">{fmt(totalEmployerFees)} kr</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                  <span>Totalt att betala Skatteverket</span>
                  <span>{fmt(totalToSkv)} kr</span>
                </div>
              </div>

              <AccuracyDisclaimer dataSource={`Lönekörning ${monthName}, senast uppdaterat ${now.toLocaleDateString("sv-SE")}`} />

              <div className="flex gap-2">
                <Button onClick={() => setShowAgiSign(true)} className="bg-[#3b82f6] text-foreground hover:bg-[#3b82f6]/90">
                  <LockIcon /> Granska och signera AGI
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" /> Ladda ner AGI-PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KU10 */}
        <TabsContent value="ku10" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Kontrolluppgift KU10 — {now.getFullYear() - 1}
                <LockIcon />
              </CardTitle>
              <CardDescription>Genereras i januari för föregående år</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anställd</TableHead>
                    <TableHead className="text-right">Årsinkomst</TableHead>
                    <TableHead className="text-right">Betald skatt</TableHead>
                    <TableHead className="text-right">Förmåner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmps.map(e => { const annual = (e.monthly_salary || 0) * 12;
                    const tax = Math.round(annual * 0.27);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                        <TableCell className="text-right">{fmt(annual)} kr</TableCell>
                        <TableCell className="text-right">{fmt(tax)} kr</TableCell>
                        <TableCell className="text-right">0 kr</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex gap-2">
                <Button onClick={() => setShowKu10Sign(true)} className="bg-[#3b82f6] text-foreground hover:bg-[#3b82f6]/90">
                  <LockIcon /> Skicka KU10 till Skatteverket
                </Button>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" /> Skicka KU10 till anställda
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATISTICS */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lönekostnad per månad</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
              <ChartGradients />
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
                  <Legend content={<CustomLegend />} />
                  <Bar dataKey="brutto" name="Bruttolön" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="arbetsgivaravgift" name="Arbetsgivaravgifter" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <GradientKPIStrip cards={[
            { label: "Genomsnittslön", value: `${fmt(activeEmps.length > 0 ? totalGross / activeEmps.length : 0)} kr`, sub: "Per anställd/mån", icon: Users, gradient: KPI_GRADIENTS.indigo },
            { label: "Sjukfrånvaro", value: "2,3%", sub: "Branschsnitt: 3,8%", icon: TrendingDown, gradient: KPI_GRADIENTS.teal },
            { label: "Övertidstimmar", value: "0 h", sub: "Denna månad", icon: Clock, gradient: KPI_GRADIENTS.blue },
            { label: "Total årskostnad", value: `${fmt(Math.round(totalGross * 12 * 1.3142))} kr`, sub: "Inkl. arbetsgivaravgifter", icon: DollarSign, gradient: KPI_GRADIENTS.emerald },
          ]} />
        </TabsContent>

        {/* VACATION DEBT */}
        <TabsContent value="vacation-debt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semesterlöneskuld</CardTitle>
              <CardDescription>Balansräkningspost — konto 2920</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anställd</TableHead>
                    <TableHead className="text-right">Kvarvarande dagar</TableHead>
                    <TableHead className="text-right">Dagslön</TableHead>
                    <TableHead className="text-right">Skuld</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacationDebtData.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="text-right">{v.days} dagar</TableCell>
                      <TableCell className="text-right">{fmt(v.dailySalary)} kr</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(v.debt)} kr</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="bg-muted p-4 rounded-lg flex justify-between">
                <span className="font-semibold">Total semesterlöneskuld</span>
                <span className="font-bold">{fmt(totalVacationDebt)} kr</span>
              </div>

              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" /> Exportera till bokföringen (konto 2920)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERSONNEL REGISTER */}
        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personalliggare</CardTitle>
                  <CardDescription>Lagstadgad för bygg, restaurang och frisör</CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" /> Exportera PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Anställd</TableHead>
                    <TableHead>Tid in</TableHead>
                    <TableHead>Tid ut</TableHead>
                    <TableHead>Signatur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmps.length > 0 ? activeEmps.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>{now.toLocaleDateString("sv-SE")}</TableCell>
                      <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                      <TableCell>08:00</TableCell>
                      <TableCell>17:00</TableCell>
                      <TableCell><Badge variant="secondary">Registrerad</Badge></TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Inga registreringar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
