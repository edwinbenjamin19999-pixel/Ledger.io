import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { formatSEK } from "@/lib/formatNumber";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { OptInputs } from "../AgaruttagDashboard";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Props {
  inputs: OptInputs;
  onUpdate: <K extends keyof OptInputs>(key: K, val: OptInputs[K]) => void;
  calc: {
    forestagenLon: number;
    totalLonSkatt: number;
    gransbelopp: number;
    lagbeskattadUtdelning: number;
    lagbeskattadSkatt: number;
    overskjutande: number;
    overskjutandeSkatt: number;
    kvarIBolaget: number;
    bolagsskattBelopp: number;
    totalSkatt: number;
    effektivSkattesats: number;
  };
}

const COLORS = { lon: "#1E3A5F", utdelning: "#1D9E75", kvar: "#0F1F3D", skatt: "#C73838" };

export function OptimeringSection({ inputs, onUpdate, calc }: Props) {
  const chartTheme = useChartTheme();
  const chartData = [
    { name: "Lön", value: calc.forestagenLon, fill: COLORS.lon },
    { name: "Lågbeskattad utdelning", value: calc.lagbeskattadUtdelning, fill: COLORS.utdelning },
    { name: "Kvar i bolaget", value: calc.kvarIBolaget, fill: COLORS.kvar },
    { name: "Skatt totalt", value: calc.totalSkatt, fill: COLORS.skatt },
  ];

  const rows = [
    { label: "Föreslagen lön", value: calc.forestagenLon, tax: `AG-avgifter 31,42% + inkomstskatt ~30%`, taxAmt: calc.totalLonSkatt },
    { label: "Gränsbelopp (förenklingsregeln)", value: calc.gransbelopp, tax: "20% kapitalskatt", taxAmt: calc.lagbeskattadSkatt },
    { label: "Överskjutande utdelning", value: calc.overskjutande, tax: "~57% (tjänstebeskattning)", taxAmt: calc.overskjutandeSkatt },
    { label: "Kvar i bolaget", value: calc.kvarIBolaget, tax: "Bolagsskatt 20,6%", taxAmt: calc.bolagsskattBelopp },
  ];

  return (
    <Card className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white">
      <CardHeader>
        <CardTitle className="text-lg text-[#0F1F3D]">Lön vs Utdelning — Optimering</CardTitle>
        <CardDescription className="text-[#64748B]">Räkna ut den skattemässigt optimala kombinationen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Årets resultat (kr)</label>
            <Input
              type="number"
              value={inputs.aretsResultat}
              onChange={e => onUpdate("aretsResultat", Number(e.target.value) || 0)}
              className="h-9 tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Aktiekapital (kr)</label>
            <Input
              type="number"
              value={inputs.aktiekapital}
              onChange={e => onUpdate("aktiekapital", Number(e.target.value) || 0)}
              className="h-9 tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Tjänsteår som ägare: <span className="font-medium text-foreground">{inputs.tjanstear}</span>
            </label>
            <Slider
              value={[inputs.tjanstear]}
              onValueChange={([v]) => onUpdate("tjanstear", v)}
              min={1} max={30} step={1}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Ägarandel: <span className="font-medium text-foreground">{inputs.agarandel}%</span>
            </label>
            <Slider
              value={[inputs.agarandel]}
              onValueChange={([v]) => onUpdate("agarandel", v)}
              min={1} max={100} step={1}
            />
          </div>
        </div>

        {/* Breakdown table */}
        <div className="rounded-[8px] border-[0.5px] border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC]">
                <th className="text-left p-3 text-xs font-medium text-[#64748B]">Komponent</th>
                <th className="text-right p-3 text-xs font-medium text-[#64748B]">Belopp</th>
                <th className="text-right p-3 text-xs font-medium text-[#64748B]">Skatt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-[#E2E8F0]">
                  <td className="p-3">
                    <p className="font-medium text-[#0F1F3D] text-xs">{r.label}</p>
                    <p className="text-[10px] text-[#64748B]">{r.tax}</p>
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums text-[#0F1F3D]">{formatSEK(r.value)}</td>
                  <td className="p-3 text-right tabular-nums text-[#C73838]">{formatSEK(r.taxAmt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stacked bar chart */}
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{ name: "Fördelning", ...Object.fromEntries(chartData.map(d => [d.name, d.value])) }]} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                formatter={(value: number) => formatSEK(value)}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              {chartData.map(d => (
                <Bar key={d.name} dataKey={d.name} stackId="a" radius={0} barSize={32}>
                  <Cell fill={d.fill} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Effective tax badge */}
        <div className="flex justify-center">
          <Badge className="bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] px-4 py-1.5 text-sm font-semibold">
            Effektiv skattesats: {calc.effektivSkattesats}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
