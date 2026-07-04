import { useState } from "react";
import { Project, useProjectTransactions, useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectEkonomiTab } from "./tabs/ProjectEkonomiTab";
import { ProjectTransaktionerTab } from "./tabs/ProjectTransaktionerTab";
import { ProjectFakturorTab } from "./tabs/ProjectFakturorTab";
import { ProjectAvslutTab } from "./tabs/ProjectAvslutTab";
import { ProjectMilestonesTab } from "./tabs/ProjectMilestonesTab";
import { ProjectPrognosTab } from "./tabs/ProjectPrognosTab";
import { ProjectCoachPanel } from "./ProjectCoachPanel";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

function calcHealthScore(totalRevenue: number, totalCost: number, project: Project): number { let score = 50;
  const margin = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;
  if (margin > 0.7) score += 25;
  else if (margin > 0.5) score += 15;
  else if (margin > 0.3) score += 5;
  else if (margin < 0) score -= 20;
  if (project.budget_revenue && project.budget_revenue > 0) { if (totalRevenue / project.budget_revenue > 0.8) score += 10;
  }
  if (project.budget_cost && project.budget_cost > 0) { if (totalCost > project.budget_cost) score -= 15;
    else if (totalCost / project.budget_cost < 0.8) score += 10;
  }
  return Math.max(0, Math.min(100, score));
}

const healthBg = (score: number) => { if (score >= 80) return "text-[#085041] bg-[#E1F5EE] dark:bg-emerald-900/30";
  if (score >= 60) return "text-[#7A5417] bg-[#FAEEDA] dark:bg-amber-900/30";
  if (score >= 40) return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
  return "text-destructive bg-[#FCE8E8] dark:bg-red-900/30";
};

interface Props { project: Project;
  onBack: () => void;
}

export function ProjectDetailView({ project, onBack }: Props) { const { totalRevenue, totalCost } = useProjectTransactions(project.id);
  const { updateProject } = useProjects();
  const result = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((result / totalRevenue) * 100) : 0;
  const health = calcHealthScore(totalRevenue, totalCost, project);
  const budgetRev = project.budget_revenue || 0;
  const budgetCost = project.budget_cost || 0;
  const budgetUsedPct = budgetCost > 0 ? (totalCost / budgetCost) * 100 : 0;
  const progressPct = project.estimated_hours && project.estimated_hours > 0
    ? ((project.logged_hours || 0) / project.estimated_hours) * 100
    : 0;
  const costOverpacing = budgetCost > 0 && progressPct > 0 && budgetUsedPct > progressPct;

  const getInsight = () => { if (budgetCost > 0 && budgetRev > 0 && costOverpacing) { const overRate = Math.round(budgetUsedPct - progressPct);
      return `OBS: Kostnaderna vaxer ${overRate}% snabbare an budgeterat`;
    }
    if (totalRevenue > 0 && totalCost > 0) { return `Aktuell marginal: ${margin.toFixed(0)}% — ${result >= 0 ? "projektet gar med vinst" : "projektet gar med forlust"}`;
    }
    return "Lägg till transaktioner för att se AI-analys av projektet";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{project.name}</h1>
            <span className="text-xs font-mono text-muted-foreground">{project.code}</span>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", healthBg(health))}>
              Halsa: {health}/100
            </span>
          </div>
          {project.client_name && <p className="text-sm text-muted-foreground">{project.client_name}</p>}
        </div>
        {project.status === "active" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateProject.mutate({ id: project.id, status: "completed", is_active: false, closed_at: new Date().toISOString() })}
          >
            Markera som avslutat
          </Button>
        )}
      </div>

      {/* AI Insight Banner */}
      <Card className={cn("border-l-4", costOverpacing ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : "border-l-[#3b82f6] bg-[#3b82f6]/5")}>
        <CardContent className="py-3 px-4 flex items-center gap-3">
          {costOverpacing ? (
            <AlertTriangle className="h-5 w-5 text-[#7A5417] flex-shrink-0" />
          ) : (
            <Sparkles className="h-5 w-5 text-[#3b82f6] flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{getInsight()}</p>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Intakter</p>
            <p className="text-lg font-bold">{fmt(totalRevenue)}</p>
            {budgetRev > 0 && <p className="text-[10px] text-muted-foreground">Budget: {fmt(budgetRev)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Kostnader</p>
            <p className="text-lg font-bold">{fmt(totalCost)}</p>
            {budgetCost > 0 && <p className="text-[10px] text-muted-foreground">Budget: {fmt(budgetCost)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Resultat</p>
            <p className={cn("text-lg font-bold", result >= 0 ? "text-[#085041]" : "text-destructive")}>{fmt(result)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Marginal</p>
            <p className={cn("text-lg font-bold", result >= 0 ? "text-[#085041]" : "text-destructive")}>
              {margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Halsopoang</p>
            <p className={cn("text-lg font-bold", health >= 60 ? "text-[#085041]" : "text-[#7A5417]")}>{health}/100</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="ekonomi">
            <TabsList>
              <TabsTrigger value="ekonomi">Ekonomi</TabsTrigger>
              <TabsTrigger value="transaktioner">Transaktioner</TabsTrigger>
              <TabsTrigger value="fakturor">Fakturor</TabsTrigger>
              <TabsTrigger value="milstolpar">Milstolpar</TabsTrigger>
              <TabsTrigger value="prognos">Prognos</TabsTrigger>
              <TabsTrigger value="avslut">Avslut</TabsTrigger>
            </TabsList>
            <TabsContent value="ekonomi">
              <ProjectEkonomiTab project={project} totalRevenue={totalRevenue} totalCost={totalCost} />
            </TabsContent>
            <TabsContent value="transaktioner">
              <ProjectTransaktionerTab project={project} />
            </TabsContent>
            <TabsContent value="fakturor">
              <ProjectFakturorTab project={project} />
            </TabsContent>
            <TabsContent value="milstolpar">
              <ProjectMilestonesTab project={project} totalRevenue={totalRevenue} />
            </TabsContent>
            <TabsContent value="prognos">
              <ProjectPrognosTab project={project} totalRevenue={totalRevenue} totalCost={totalCost} />
            </TabsContent>
            <TabsContent value="avslut">
              <ProjectAvslutTab project={project} totalRevenue={totalRevenue} totalCost={totalCost} />
            </TabsContent>
          </Tabs>
        </div>

        {/* AI Coach Panel - sidebar */}
        <div>
          <ProjectCoachPanel
            project={project}
            totalRevenue={totalRevenue}
            totalCost={totalCost}
          />
        </div>
      </div>
    </div>
  );
}
