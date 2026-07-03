import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, BarChart3, Leaf } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useESGFormData } from "@/hooks/useESGFormData";
import { usePayrollContext } from "@/hooks/usePayrollAgent";
import { useChartTheme } from "@/hooks/useChartTheme";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export function ESGReport() {
  const chartTheme = useChartTheme();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: esg, isLoading } = useESGFormData(year);
  const { data: payroll } = usePayrollContext();

  if (isLoading) return <Skeleton className="h-96" />;

  if (!esg) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Leaf className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">Ingen ESG-data för {year}</p>
          <p className="text-sm text-muted-foreground mt-1">Fyll i formuläret under fliken "Inmatning" först.</p>
        </CardContent>
      </Card>
    );
  }

  const s1 = Number(esg.scope1_co2_tonnes) || 0;
  const s2 = Number(esg.scope2_co2_tonnes) || 0;
  const s3 = Number(esg.scope3_co2_tonnes) || 0;
  const total = s1 + s2 + s3;
  const empCount = payroll?.employeeCount ?? 1;
  const perEmployee = empCount > 0 ? total / empCount : 0;

  const scopeData = [
    { name: "Scope 1", value: s1 },
    { name: "Scope 2", value: s2 },
    { name: "Scope 3", value: s3 },
  ];

  const checks = [
    { label: "Scope 1 rapporterat", ok: s1 > 0 },
    { label: "Scope 2 rapporterat", ok: s2 > 0 },
    { label: "Andel förnybar energi angiven", ok: Number(esg.renewable_energy_percent) > 0 },
    { label: "Personalomsättning angiven", ok: Number(esg.employee_turnover_percent) > 0 },
    { label: "Könsfördelning i styrelse angiven", ok: Number(esg.female_board_percent) > 0 },
    { label: "Uppförandekod", ok: esg.has_code_of_conduct === true },
    { label: "Visselblåsarfunktion", ok: esg.has_whistleblower === true },
    { label: "Anti-korruptionsutbildning angiven", ok: Number(esg.anti_corruption_training_percent) > 0 },
  ];
  const passCount = checks.filter(c => c.ok).length;

  return (
    <div className="space-y-6">
      <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[2023, 2024, 2025, 2026].map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* CO₂ Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total CO₂" value={`${total.toFixed(1)} ton`} />
        <MetricCard label="CO₂ per anställd" value={`${perEmployee.toFixed(2)} ton`} />
        <MetricCard label="GRI 305-1 (Scope 1)" value={`${s1.toFixed(1)} ton`} />
        <MetricCard label="GRI 305-2 (Scope 2)" value={`${s2.toFixed(1)} ton`} />
      </div>

      {/* Scope distribution chart */}
      {total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Scope-fördelning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scopeData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)} ton CO₂`} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {scopeData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSRD Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">CSRD-minimikrav ({passCount}/{checks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-[#085041] shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 text-center">
        <p className="text-lg font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
