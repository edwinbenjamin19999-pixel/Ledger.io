import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Target, AlertTriangle } from "lucide-react";
import type { MonthlyExpense } from "./SpendAnalytics";

interface Props { companyId: string;
  monthlyData: MonthlyExpense[];
}

interface BudgetRow { category: string;
  budget: number;
  actual: number;
  deviationKr: number;
  deviationPct: number;
  status: "green" | "yellow" | "red";
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function BudgetDeviation({ companyId, monthlyData }: Props) { const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [hasBudget, setHasBudget] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBudgets();
  }, [companyId, monthlyData]);

  async function loadBudgets() { setLoading(true);
    const currentYear = new Date().getFullYear();

    const { data: budgets } = await supabase
      .from("budgets")
      .select("amount, account_id, month, year, chart_of_accounts(account_number, account_name)")
      .eq("company_id", companyId)
      .eq("year", currentYear);

    if (!budgets || budgets.length === 0) { setHasBudget(false);
      setLoading(false);
      return;
    }

    setHasBudget(true);

    // Group budgets by class
    const classBudgets: Record<string, { label: string; budget: number }> = { "4": { label: "Varor & material", budget: 0 },
      "5": { label: "Lokalkostnader", budget: 0 },
      "6": { label: "Övriga rörelsekostnader", budget: 0 },
      "7": { label: "Personalkostnader", budget: 0 },
    };

    for (const b of budgets ) { const accNo = b.chart_of_accounts?.account_number || "";
      const classKey = accNo.charAt(0);
      if (classBudgets[classKey]) { classBudgets[classKey].budget += b.amount || 0;
      }
    }

    // Calculate actuals from monthlyData
    const totalActuals: Record<string, number> = { "4": monthlyData.reduce((s, m) => s + m.varor, 0),
      "5": monthlyData.reduce((s, m) => s + m.lokal, 0),
      "6": monthlyData.reduce((s, m) => s + m.ovriga, 0),
      "7": monthlyData.reduce((s, m) => s + m.personal, 0),
    };

    const rows: BudgetRow[] = [];
    for (const [key, data] of Object.entries(classBudgets)) { if (data.budget === 0) continue;
      const actual = totalActuals[key] || 0;
      const devKr = actual - data.budget;
      const devPct = data.budget > 0 ? (devKr / data.budget) * 100 : 0;
      let status: "green" | "yellow" | "red" = "green";
      if (devPct > 15) status = "red";
      else if (devPct > 5) status = "yellow";

      rows.push({ category: data.label,
        budget: Math.round(data.budget),
        actual: Math.round(actual),
        deviationKr: Math.round(devKr),
        deviationPct: Math.round(devPct),
        status,
      });
    }

    setBudgetRows(rows);
    setLoading(false);
  }

  if (loading) { return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  }

  if (!hasBudget) { return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">Ingen budget inlagd</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Skapa en budget under Redovisning för att se avvikelser mot utfall per kostnadskategori.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasOverBudget = budgetRows.some(r => r.status === "red");

  return (
    <div className="space-y-4">
      {hasOverBudget && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Budgetöverskridande</p>
              <p className="text-xs text-muted-foreground">
                {budgetRows.filter(r => r.status === "red").length} kategorier överskrider budget med mer än 15%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5" /> Budgetavvikelse per kategori
          </CardTitle>
          <CardDescription>{new Date().getFullYear()} — ackumulerat</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Utfall</TableHead>
                <TableHead className="text-right">Avvikelse kr</TableHead>
                <TableHead className="text-right">Avvikelse %</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.category}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(row.budget)} kr</TableCell>
                  <TableCell className="text-right font-mono">{fmt(row.actual)} kr</TableCell>
                  <TableCell className={`text-right font-mono ${row.deviationKr > 0 ? "text-destructive" : "text-primary"}`}>
                    {row.deviationKr > 0 ? "+" : ""}{fmt(row.deviationKr)} kr
                  </TableCell>
                  <TableCell className={`text-right font-mono ${row.deviationPct > 15 ? "text-destructive" : row.deviationPct > 5 ? "text-[#7A5417]" : "text-primary"}`}>
                    {row.deviationPct > 0 ? "+" : ""}{row.deviationPct}%
                  </TableCell>
                  <TableCell className="text-center">
                    {row.status === "green" && <Badge className="bg-[#E1F5EE] text-[#085041] text-[10px]">OK</Badge>}
                    {row.status === "yellow" && <Badge className="bg-[#FAEEDA] text-[#7A5417] text-[10px]">Varning</Badge>}
                    {row.status === "red" && <Badge variant="destructive" className="text-[10px]">Kritisk</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
