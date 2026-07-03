import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { AgaruttagData } from "@/hooks/useAgaruttag";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

interface Props { data: AgaruttagData;
  companyType: "ab" | "ef";
}

export function EgetKapitalTab({ data, companyType }: Props) { const c = data.capital;

  const rows = companyType === "ab" ? [
    { label: "Aktiekapital", account: "2081-2082", value: c.aktiekapital },
    { label: "Överkursfond", account: "2084", value: c.overkursfond },
    { label: "Uppskrivningsfond", account: "2085", value: c.uppskrivningsfond },
    { label: "Reservfond", account: "2086", value: c.reservfond },
    { label: "Fond för verkligt värde", account: "2087", value: c.fondVerkligtVarde },
    { label: "Balanserat resultat", account: "2091+2098", value: c.balanserat },
    { label: "Årets resultat", account: "Klass 3-8", value: c.aretsResultat },
  ] : [
    { label: "Eget kapital", account: "2010-2019", value: c.totalEK },
    { label: "Årets resultat", account: "Klass 3-8", value: c.aretsResultat },
  ];

  // Simple projection data (mock monthly progression)
  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  const chartData = months.slice(0, currentMonth + 1).map((m, i) => ({ month: m,
    ek: Math.round(c.totalEK * (0.7 + 0.3 * (i / Math.max(currentMonth, 1)))),
    fria: Math.round(c.friaReserver * (0.6 + 0.4 * (i / Math.max(currentMonth, 1)))),
  }));

  return (
    <div className="space-y-6">
      {/* Capital structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kapitalstruktur</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead className="text-right">Konto</TableHead>
                <TableHead className="text-right">Belopp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.label}>
                  <TableCell className="text-sm">{r.label}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-mono">{r.account}</TableCell>
                  <TableCell className={`text-right font-medium ${r.value < 0 ? "text-destructive" : ""}`}>
                    {fmt(r.value)} kr
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2">
                <TableCell>SUMMA EGET KAPITAL</TableCell>
                <TableCell />
                <TableCell className={`text-right ${c.totalEK < 0 ? "text-destructive" : ""}`}>
                  {fmt(c.totalEK)} kr
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Free reserves highlight */}
          <div className={`mt-4 rounded-[12px] p-4 text-center border-[0.5px] ${c.friaReserver >= 0 ? "bg-[#E1F5EE] border-[#BFE6D6]" : "bg-[#FCE8E8] border-[#F4C8C8]"}`}>
            <p className="text-xs text-[#64748B]">
              {companyType === "ab" ? "Fria reserver (tillgängliga för utdelning)" : "Disponibelt kapital"}
            </p>
            <p className={`text-2xl font-semibold tabular-nums ${c.friaReserver >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
              {fmt(c.friaReserver)} kr
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Capital development chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Kapitalutveckling</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[#E2E8F0] p-6 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
              <ChartGradients />
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => [fmt(v) + " kr"]} />
                <Area type="monotone" dataKey="ek" name="Totalt EK" stackId="1" fill="#0F1F3D" fillOpacity={0.18} stroke="#0F1F3D" />
                <Area type="monotone" dataKey="fria" name="Fria reserver" stackId="2" fill="#1D9E75" fillOpacity={0.25} stroke="#1D9E75" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {companyType === "ab" && c.aktiekapital > 0 && c.aktiekapital < 25000 && (
        <Card className="border-[0.5px] border-[#F0DDB7] bg-[#FAEEDA] shadow-none">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#C28A2B] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Aktiekapital under minimikrav</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aktiekapitalet är {fmt(c.aktiekapital)} kr. Minimikravet är 25 000 kr.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {c.totalEK < 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Negativt eget kapital</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bolaget har negativt eget kapital. Kontakta revisor.
                  Åtgärdsplikt kan föreligga enligt ABL 25 kap.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
