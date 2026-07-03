import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, Clock, AlertTriangle, Users, ClipboardList } from "lucide-react";
import { GradientKPIStrip, KPI_GRADIENTS } from "@/components/shared/GradientKPICard";

interface FirmOverviewProps { firmId: string;
}

export const FirmOverview = ({ firmId }: FirmOverviewProps) => { const [stats, setStats] = useState({ totalClients: 0,
    activeClients: 0,
    pendingMandates: 0,
    totalTasks: 0,
    todoTasks: 0,
    overdueTasks: 0,
    teamMembers: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => { loadStats();
  }, [firmId]);

  const loadStats = async () => { const [clientsRes, tasksRes, membersRes] = await Promise.all([
      supabase.from("firm_clients").select("id, mandate_status, is_active").eq("firm_id", firmId),
      supabase.from("firm_tasks").select("id, status, due_date, title, task_type, company_id").eq("firm_id", firmId),
      supabase.from("firm_members").select("id").eq("firm_id", firmId).eq("is_active", true),
    ]);

    const clients = clientsRes.data || [];
    const tasks = tasksRes.data || [];
    const today = new Date().toISOString().split("T")[0];

    setStats({ totalClients: clients.length,
      activeClients: clients.filter(c => c.mandate_status === "active" && c.is_active).length,
      pendingMandates: clients.filter(c => c.mandate_status === "pending").length,
      totalTasks: tasks.length,
      todoTasks: tasks.filter(t => t.status === "todo" || t.status === "in_progress").length,
      overdueTasks: tasks.filter(t => t.due_date && t.due_date < today && t.status !== "done").length,
      teamMembers: membersRes.data?.length || 0,
    });

    setRecentTasks(tasks.filter(t => t.status !== "done").slice(0, 5));
  };

  const taskTypeLabels: Record<string, string> = { bookkeeping: "Bokföring",
    vat: "Moms",
    agi: "AGI",
    payroll: "Lön",
    annual_report: "Bokslut",
    tax_return: "Deklaration",
    reconciliation: "Avstämning",
    other: "Övrigt",
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <GradientKPIStrip cards={[
        { label: "Aktiva klienter", value: `${stats.activeClients}`, sub: `${stats.totalClients} totalt`, icon: Building2, gradient: KPI_GRADIENTS.indigo },
        { label: "Väntande fullmakter", value: `${stats.pendingMandates}`, icon: Clock, gradient: KPI_GRADIENTS.amber },
        { label: "Aktiva uppgifter", value: `${stats.todoTasks}`, sub: `${stats.totalTasks} totalt`, icon: ClipboardList, gradient: KPI_GRADIENTS.blue },
        { label: "Försenade", value: `${stats.overdueTasks}`, icon: AlertTriangle, gradient: stats.overdueTasks > 0 ? KPI_GRADIENTS.red : KPI_GRADIENTS.emerald },
      ]} />

      {/* Recent tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktuella uppgifter</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Inga aktiva uppgifter</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.task_type && (
                        <Badge variant="outline" className="text-xs">
                          {taskTypeLabels[task.task_type] || task.task_type}
                        </Badge>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          Deadline: {new Date(task.due_date).toLocaleDateString("sv-SE")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={task.status === "in_progress" ? "default" : "secondary"}>
                    {task.status === "todo" ? "Att göra" : task.status === "in_progress" ? "Pågår" : task.status === "review" ? "Granskning" : task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
