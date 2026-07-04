import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Project, useProjectTransactions } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, FolderKanban, Sparkles, TrendingUp, TrendingDown, Clock, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

function calcHealthScore(
  totalRevenue: number,
  totalCost: number,
  project: Project
): number { let score = 50;
  const margin = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;
  if (margin > 0.7) score += 25;
  else if (margin > 0.5) score += 15;
  else if (margin > 0.3) score += 5;
  else if (margin < 0) score -= 20;

  if (project.budget_revenue && project.budget_revenue > 0) { const revPct = totalRevenue / project.budget_revenue;
    if (revPct > 0.8) score += 10;
    else if (revPct > 0.5) score += 5;
  }

  if (project.budget_cost && project.budget_cost > 0) { const costPct = totalCost / project.budget_cost;
    if (costPct > 1) score -= 15;
    else if (costPct < 0.8) score += 10;
  }

  if (project.estimated_hours && project.logged_hours) { const hourPct = project.logged_hours / project.estimated_hours;
    if (hourPct > 1.2) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

const healthColor = (score: number) => { if (score >= 80) return "border-l-emerald-500";
  if (score >= 60) return "border-l-amber-400";
  if (score >= 40) return "border-l-orange-500";
  return "border-l-destructive";
};

const healthBg = (score: number) => { if (score >= 80) return "text-[#085041]";
  if (score >= 60) return "text-[#7A5417]";
  if (score >= 40) return "text-orange-600";
  return "text-destructive";
};

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) { const { totalRevenue, totalCost } = useProjectTransactions(project.id);
  const result = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (result / totalRevenue) * 100 : 0;
  const health = calcHealthScore(totalRevenue, totalCost, project);

  const hoursProgress =
    project.estimated_hours && project.estimated_hours > 0
      ? Math.min(((project.logged_hours || 0) / project.estimated_hours) * 100, 100)
      : 0;

  // AI insight för this card
  const getCardInsight = () => { if (totalRevenue === 0 && totalCost === 0) return null;
    if (project.budget_cost && project.budget_cost > 0 && totalCost > project.budget_cost) { return "Kostnadsbudgeten overskriden";
    }
    if (margin > 70) return "Stark marginal — projektet gar bra";
    if (margin < 20 && totalRevenue > 0) return "Lag marginal — overväg prishöjning";
    return null;
  };
  const insight = getCardInsight();

  return (
    <Card
      className={cn("border-l-4 hover:shadow-md transition-shadow cursor-pointer", healthColor(health))}
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{project.name}</p>
            {project.client_name && (
              <p className="text-xs text-muted-foreground truncate">{project.client_name}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn("text-lg font-bold", healthBg(health))}>{health}</span>
            <span className="text-[9px] text-muted-foreground">Halsa</span>
          </div>
        </div>

        {project.estimated_hours && project.estimated_hours > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Tid</span>
              <span>{project.logged_hours || 0} / {project.estimated_hours} h</span>
            </div>
            <Progress value={hoursProgress} className="h-1.5" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <p className="text-muted-foreground">Intakter</p>
            <p className="font-medium">{fmt(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kostnader</p>
            <p className="font-medium">{fmt(totalCost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Marginal</p>
            <p className={cn("font-semibold", margin >= 0 ? "text-[#085041]" : "text-destructive")}>
              {margin.toFixed(0)}%
            </p>
          </div>
        </div>

        {insight && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
            <Sparkles className="h-3 w-3 text-[#3b82f6] flex-shrink-0" />
            {insight}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AIDiscoveryItem { name: string;
  invoiceCount: number;
  totalAmount: number;
  hours: number;
}

function AIDiscoveryBanner({ onCreateFromCustomers, onCreateManual }: { onCreateFromCustomers: (customers: AIDiscoveryItem[]) => void;
  onCreateManual: () => void;
}) { const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

  const { data: discoveries = [] } = useQuery({ queryKey: ["project_ai_discovery", companyId],
    queryFn: async () => { if (!companyId) return [];

      // Fetch from invoices
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("customer_name, total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "outgoing")
        .not("customer_name", "is", null);

      // Fetch from time entries
      const { data: timeData } = await supabase
        .from("time_entries")
        .select("client_name, duration_minutes, hourly_rate")
        .eq("company_id", companyId)
        .not("client_name", "is", null);

      const grouped: Record<string, { invoiceCount: number; total: number; hours: number; timeValue: number }> = {};

      (invoiceData || []).forEach((inv: any) => { const name = inv.customer_name?.trim();
        if (!name) return;
        if (!grouped[name]) grouped[name] = { invoiceCount: 0, total: 0, hours: 0, timeValue: 0 };
        grouped[name].invoiceCount += 1;
        grouped[name].total += inv.total_amount || 0;
      });

      (timeData || []).forEach((te: any) => { const name = te.client_name?.trim();
        if (!name) return;
        if (!grouped[name]) grouped[name] = { invoiceCount: 0, total: 0, hours: 0, timeValue: 0 };
        grouped[name].hours += (te.duration_minutes || 0) / 60;
        grouped[name].timeValue += ((te.duration_minutes || 0) / 60) * (te.hourly_rate || 0);
      });

      return Object.entries(grouped)
        .filter(([, v]) => v.invoiceCount >= 1 || v.hours >= 1)
        .sort(([, a], [, b]) => (b.total + b.timeValue) - (a.total + a.timeValue))
        .slice(0, 5)
        .map(([name, v]) => ({ name,
          invoiceCount: v.invoiceCount,
          totalAmount: v.total + v.timeValue,
          hours: v.hours,
        }));
    },
    enabled: !!companyId,
  });

  if (discoveries.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-[#3b82f6] bg-[#3b82f6]/5">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-[#3b82f6] flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-semibold">AI har analyserat din bokföring och hittat {discoveries.length} möjliga projekt att spåra:</p>
            </div>
            <div className="space-y-1.5">
              {discoveries.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{d.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {d.invoiceCount > 0 && `${d.invoiceCount} fakturor`}
                    {d.invoiceCount > 0 && d.hours > 0 && ", "}
                    {d.hours > 0 && `${d.hours.toFixed(0)}h loggat`}
                    {" — totalt "}
                    {fmt(d.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
                onClick={() => onCreateFromCustomers(discoveries)}
              >
                Skapa projekt från dessa kunder automatiskt
              </Button>
              <Button size="sm" variant="outline" onClick={onCreateManual}>
                Skapa manuellt
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props { projects: Project[];
  isLoading: boolean;
  onSelect: (p: Project) => void;
  onNew: () => void;
  onCreateFromDiscovery?: (customers: AIDiscoveryItem[]) => void;
}

export function ProjectListView({ projects, isLoading, onSelect, onNew, onCreateFromDiscovery }: Props) { // KPI summary
  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-[#3b82f6]" />
            Projektredovisning
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-driven projektintelligens — intakter, kostnader och marginaler i realtid
          </p>
        </div>
        <Button onClick={onNew} className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
          <Plus className="h-4 w-4 mr-1" />
          Nytt projekt
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Aktiva projekt</p>
            <p className="text-2xl font-bold">{activeProjects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Totalt antal</p>
            <p className="text-2xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Avslutade</p>
            <p className="text-2xl font-bold">{projects.filter((p) => p.status === "completed").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Pausade</p>
            <p className="text-2xl font-bold">{projects.filter((p) => p.status === "paused").length}</p>
          </CardContent>
        </Card>
      </div>

      {projects.length === 0 && !isLoading && (
        <AIDiscoveryBanner
          onCreateFromCustomers={(customers) => onCreateFromDiscovery?.(customers)}
          onCreateManual={onNew}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted animate-pulse">
              <CardContent className="p-5 h-48" />
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">Inga projekt ännu</p>
            <p className="text-sm text-muted-foreground mt-1">
              Skapa ditt första projekt eller lat AI föreslå projekt baserat på din bokföring.
            </p>
            <Button onClick={onNew} className="mt-4 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
              <Plus className="h-4 w-4 mr-1" />
              Skapa projekt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {projects.length > 0 && (
            <AIDiscoveryBanner
              onCreateFromCustomers={(customers) => onCreateFromDiscovery?.(customers)}
              onCreateManual={onNew}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onClick={() => onSelect(p)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export type { AIDiscoveryItem };
