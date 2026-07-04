import { Project, useProjects } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

interface Props { project: Project;
  totalRevenue: number;
  totalCost: number;
}

export function ProjectAvslutTab({ project, totalRevenue, totalCost }: Props) { const { updateProject } = useProjects();
  const result = totalRevenue - totalCost;
  const budgetRev = project.budget_revenue || 0;
  const budgetCost = project.budget_cost || 0;
  const budgetResult = budgetRev - budgetCost;
  const isCompleted = project.status === "completed";

  const revDiff = budgetRev > 0 ? ((totalRevenue - budgetRev) / budgetRev * 100).toFixed(0) : "—";
  const costDiff = budgetCost > 0 ? ((totalCost - budgetCost) / budgetCost * 100).toFixed(0) : "—";

  const getLearnings = () => { const items: string[] = [];
    if (budgetRev > 0) { const rd = ((totalRevenue - budgetRev) / budgetRev * 100);
      items.push(rd >= 0
        ? `Intäkterna översteg budget med ${rd.toFixed(0)}%`
        : `Intäkterna understeg budget med ${Math.abs(rd).toFixed(0)}%`);
    }
    if (budgetCost > 0) { const cd = ((totalCost - budgetCost) / budgetCost * 100);
      items.push(cd >= 0
        ? `Kostnaderna översteg budget med ${cd.toFixed(0)}%`
        : `Kostnaderna var ${Math.abs(cd).toFixed(0)}% under budget`);
    }
    if (items.length === 0) items.push("Lägg till budgetvärden för att se jämförelse");
    return items;
  };

  return (
    <div className="space-y-6 mt-4">
      {!isCompleted && (
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="py-4 px-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-[#7A5417]" />
              <p className="text-sm font-medium">Projektet är fortfarande aktivt</p>
            </div>
            <Button
              size="sm"
              onClick={() => updateProject.mutate({ id: project.id, status: "completed", is_active: false, closed_at: new Date().toISOString() })}
              className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white"
            >
              Markera som avslutat
            </Button>
          </CardContent>
        </Card>
      )}

      {isCompleted && (
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-[#085041]" />
            <p className="text-sm font-medium">Projektet är avslutat</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Slutrapport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Intäkter</p>
              <p className="text-lg font-bold">{fmt(totalRevenue)}</p>
              <p className="text-[10px] text-muted-foreground">Budget: {fmt(budgetRev)} ({revDiff}%)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Kostnader</p>
              <p className="text-lg font-bold">{fmt(totalCost)}</p>
              <p className="text-[10px] text-muted-foreground">Budget: {fmt(budgetCost)} ({costDiff}%)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Resultat</p>
              <p className={cn("text-lg font-bold", result >= 0 ? "text-[#085041]" : "text-destructive")}>{fmt(result)}</p>
              <p className="text-[10px] text-muted-foreground">Budget: {fmt(budgetResult)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Viktiga lärdomar</p>
            <ul className="space-y-1">
              {getLearnings().map((l, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-[#3b82f6] mt-1">—</span>
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <ComingSoonButton tooltipText="PDF-export för projektrapporter">
              <FileText className="h-4 w-4" />
              Exportera projektrapport PDF
            </ComingSoonButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
