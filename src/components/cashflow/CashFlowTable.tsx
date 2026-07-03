import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { CashFlowPeriod } from "@/hooks/useCashFlow";

const fmt = (n: number) => { if (n === 0) return "0";
  const rounded = Math.round(n);
  const str = Math.abs(rounded).toLocaleString("sv-SE");
  return rounded < 0 ? `−${str}` : str;
};

const colorClass = (n: number) =>
  n > 0 ? "text-[#085041]" : n < 0 ? "text-[#7A1A1A]" : "text-muted-foreground";

interface Props { periods: CashFlowPeriod[];
  onPeriodClick?: (period: string, category?: string) => void;
}

export function CashFlowTable({ periods, onPeriodClick }: Props) { const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (period: string) => { setExpanded(prev => { const next = new Set(prev);
      next.has(period) ? next.delete(period) : next.add(period);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Kassaflöde per period</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 sticky top-0">
                <th className="p-2 pl-4 text-left font-medium text-muted-foreground w-[90px]">Period</th>
                <th className="p-2 text-right font-medium text-muted-foreground w-[120px]">Ing. saldo</th>
                <th className="p-2 text-right font-medium text-muted-foreground">Operativt</th>
                <th className="p-2 text-right font-medium text-muted-foreground">Investering</th>
                <th className="p-2 text-right font-medium text-muted-foreground">Finansiering</th>
                <th className="p-2 text-right font-medium text-muted-foreground">Netto</th>
                <th className="p-2 text-right font-medium text-muted-foreground w-[120px]">Utg. saldo</th>
                <th className="p-2 text-right font-medium text-muted-foreground pr-4">Viktigaste post</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => { const isExpanded = expanded.has(p.period);
                const opNet = p.operatingIn - p.operatingOut;
                const invNet = p.investingIn - p.investingOut;
                const finNet = p.financingIn - p.financingOut;

                return (
                  <>
                    <tr
                      key={p.period}
                      className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "bg-muted/10" : ""}`}
                      onClick={() => toggle(p.period)}
                    >
                      <td className="p-2 pl-4 font-medium flex items-center gap-1">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {p.label}
                      </td>
                      <td className="p-2 text-right font-mono tabular-nums">{fmt(p.openingBalance)}</td>
                      <td className={`p-2 text-right font-mono tabular-nums ${colorClass(opNet)}`}>{fmt(opNet)}</td>
                      <td className={`p-2 text-right font-mono tabular-nums ${colorClass(invNet)}`}>{invNet !== 0 ? fmt(invNet) : "—"}</td>
                      <td className={`p-2 text-right font-mono tabular-nums ${colorClass(finNet)}`}>{finNet !== 0 ? fmt(finNet) : "—"}</td>
                      <td className={`p-2 text-right font-mono tabular-nums font-semibold ${colorClass(p.net)}`}>{fmt(p.net)}</td>
                      <td className="p-2 text-right font-mono tabular-nums font-semibold">{fmt(p.closingBalance)}</td>
                      <td className="p-2 text-right text-xs text-muted-foreground truncate max-w-[160px] pr-4">{p.largestItem || "—"}</td>
                    </tr>
                    {isExpanded && (
                      <>
                        <tr className="bg-muted/20 border-b">
                          <td className="p-1.5 pl-10 text-xs text-muted-foreground" colSpan={2}>▸ Operativt</td>
                          <td className="p-1.5 text-right text-xs font-mono text-[#085041]">+{fmt(p.operatingIn)}</td>
                          <td className="p-1.5 text-right text-xs font-mono text-[#7A1A1A]">−{fmt(p.operatingOut)}</td>
                          <td colSpan={4}></td>
                        </tr>
                        {(p.investingIn > 0 || p.investingOut > 0) && (
                          <tr className="bg-muted/20 border-b">
                            <td className="p-1.5 pl-10 text-xs text-muted-foreground" colSpan={2}>▸ Investering</td>
                            <td className="p-1.5 text-right text-xs font-mono text-[#085041]">{p.investingIn > 0 ? `+${fmt(p.investingIn)}` : ""}</td>
                            <td className="p-1.5 text-right text-xs font-mono text-[#7A1A1A]">{p.investingOut > 0 ? `−${fmt(p.investingOut)}` : ""}</td>
                            <td colSpan={4}></td>
                          </tr>
                        )}
                        {(p.financingIn > 0 || p.financingOut > 0) && (
                          <tr className="bg-muted/20 border-b">
                            <td className="p-1.5 pl-10 text-xs text-muted-foreground" colSpan={2}>▸ Finansiering</td>
                            <td className="p-1.5 text-right text-xs font-mono text-[#085041]">{p.financingIn > 0 ? `+${fmt(p.financingIn)}` : ""}</td>
                            <td className="p-1.5 text-right text-xs font-mono text-[#7A1A1A]">{p.financingOut > 0 ? `−${fmt(p.financingOut)}` : ""}</td>
                            <td colSpan={4}></td>
                          </tr>
                        )}
                      </>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold bg-muted/20">
                <td className="p-2 pl-4">Totalt</td>
                <td className="p-2 text-right font-mono tabular-nums">{periods.length > 0 ? fmt(periods[0].openingBalance) : "0"}</td>
                <td className={`p-2 text-right font-mono tabular-nums ${colorClass(periods.reduce((s, p) => s + p.operatingIn - p.operatingOut, 0))}`}>
                  {fmt(periods.reduce((s, p) => s + p.operatingIn - p.operatingOut, 0))}
                </td>
                <td className={`p-2 text-right font-mono tabular-nums ${colorClass(periods.reduce((s, p) => s + p.investingIn - p.investingOut, 0))}`}>
                  {fmt(periods.reduce((s, p) => s + p.investingIn - p.investingOut, 0))}
                </td>
                <td className={`p-2 text-right font-mono tabular-nums ${colorClass(periods.reduce((s, p) => s + p.financingIn - p.financingOut, 0))}`}>
                  {fmt(periods.reduce((s, p) => s + p.financingIn - p.financingOut, 0))}
                </td>
                <td className={`p-2 text-right font-mono tabular-nums font-bold ${colorClass(periods.reduce((s, p) => s + p.net, 0))}`}>
                  {fmt(periods.reduce((s, p) => s + p.net, 0))}
                </td>
                <td className="p-2 text-right font-mono tabular-nums font-bold">
                  {periods.length > 0 ? fmt(periods[periods.length - 1].closingBalance) : "0"}
                </td>
                <td className="p-2 pr-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
