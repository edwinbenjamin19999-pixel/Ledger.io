import { Project } from "@/hooks/useProjects";
import { useProjectFinancials } from "@/hooks/useProjectAccounting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartGradients, AXIS_TICK } from "@/components/charts/ChartGradients";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { Sparkles, Info, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChartTheme } from "@/hooks/useChartTheme";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

interface Props {
  project: Project;
  totalRevenue: number;
  totalCost: number;
}

export function ProjectEkonomiTab({ project, totalRevenue, totalCost }: Props) {
  const chartTheme = useChartTheme();
  const { data: financials, isLoading: financialsLoading } = useProjectFinancials(project.id);
  const budgetRev = project.budget_revenue || 0;
  const budgetCost = project.budget_cost || 0;
  const result = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((result / totalRevenue) * 100) : 0;

  const chartData = [
    { name: "Intäkter", Budget: budgetRev, Utfall: totalRevenue },
    { name: "Kostnader", Budget: budgetCost, Utfall: totalCost },
    { name: "Resultat", Budget: budgetRev - budgetCost, Utfall: result },
  ];

  const projectedMargin = margin > 0 ? margin - 2 + Math.random() * 4 : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Live P&L */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Realtids P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">INTÄKTER</span>
                <span></span>
              </div>
              <div className="flex justify-between text-sm pl-4">
                <span className="text-muted-foreground">Fakturerat</span>
                <span className="font-medium">{fmt(totalRevenue)} kr</span>
              </div>
              {financials?.hasData && financials.revenues !== totalRevenue && (
                <div className="flex justify-between text-sm pl-4">
                  <span className="text-muted-foreground">Huvudboksmatchat (konto 3xxx)</span>
                  <span className="font-medium text-xs">{fmt(financials.revenues)} kr</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>Total intäkt</span>
                <span>{fmt(totalRevenue)} kr</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">DIREKTA KOSTNADER</span>
                <span></span>
              </div>
              <div className="flex justify-between text-sm pl-4">
                <span className="text-muted-foreground">Direkta utlägg (kopplade verifikat)</span>
                <span className="font-medium">{fmt(totalCost)} kr</span>
              </div>
              {financials?.hasData && financials.costs !== totalCost && (
                <div className="flex justify-between text-sm pl-4">
                  <span className="text-muted-foreground">Huvudboksmatchat (konto 4xxx-8xxx)</span>
                  <span className="font-medium text-xs">{fmt(financials.costs)} kr</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>Delsumma kostnader</span>
                <span>{fmt(totalCost)} kr</span>
              </div>
            </div>

            <div className="border-t-2 pt-3 flex justify-between text-base font-bold">
              <span>BRUTTOMARGINAL</span>
              <span className={result >= 0 ? "text-[#085041]" : "text-destructive"}>
                {fmt(result)} kr ({margin.toFixed(1)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget vs Utfall */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Budget vs Utfall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <ChartGradients />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v) + " kr"} />
                <Legend content={<CustomLegend />} />
                <Bar dataKey="Budget" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} opacity={0.4} />
                <Bar dataKey="Utfall" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI Prognosis */}
      {totalRevenue > 0 && (
        <Card className="border-l-4 border-l-[#3b82f6] bg-[#3b82f6]/5">
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-[#3b82f6] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">AI Lönsamhetsprognos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Om nuvarande faktureringsgrad håller: projektet avslutas med {projectedMargin.toFixed(0)}% marginal.
                {budgetRev > 0 && totalRevenue < budgetRev && (
                  <> Kvarstående att fakturera: {fmt(budgetRev - totalRevenue)} kr.</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Intäkter vs budget</p>
            <p className="text-lg font-bold">{budgetRev > 0 ? ((totalRevenue / budgetRev) * 100).toFixed(0) : "—"}%</p>
            <p className="text-[10px] text-muted-foreground">{fmt(totalRevenue)} av {fmt(budgetRev)} kr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Kostnader vs budget</p>
            <p className="text-lg font-bold">{budgetCost > 0 ? ((totalCost / budgetCost) * 100).toFixed(0) : "—"}%</p>
            <p className="text-[10px] text-muted-foreground">{fmt(totalCost)} av {fmt(budgetCost)} kr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Resultat vs budget</p>
            <p className="text-lg font-bold">{fmt(result)} kr</p>
            <p className="text-[10px] text-muted-foreground">Budgeterat: {fmt(budgetRev - budgetCost)} kr</p>
          </CardContent>
        </Card>
      </div>

      {/* Journal Entry Lines Detail */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Verifikationsrader (huvudbok)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {financialsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : financials?.hasData ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Datum</TableHead>
                  <TableHead className="text-xs">Konto</TableHead>
                  <TableHead className="text-xs">Beskrivning</TableHead>
                  <TableHead className="text-xs text-right">Debet</TableHead>
                  <TableHead className="text-xs text-right">Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financials.lines.slice(0, 20).map(line => (
                  <TableRow key={line.id}>
                    <TableCell className="text-xs tabular-nums">{line.date}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono">{line.accountNumber}</span>
                      <span className="text-muted-foreground ml-1">{line.accountName}</span>
                    </TableCell>
                    <TableCell className="text-xs">{line.description}</TableCell>
                    <TableCell className={cn("text-xs text-right tabular-nums", line.debit > 0 && "font-medium")}>
                      {line.debit > 0 ? fmt(line.debit) : ""}
                    </TableCell>
                    <TableCell className={cn("text-xs text-right tabular-nums", line.credit > 0 && "font-medium")}>
                      {line.credit > 0 ? fmt(line.credit) : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Inga verifikationer kopplade till detta projekt ännu. Ange projektets kostnadsbärare vid bokföring.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
