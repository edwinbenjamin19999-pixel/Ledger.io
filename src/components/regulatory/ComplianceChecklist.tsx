import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Clock, Users } from "lucide-react";

interface ComplianceTask { id: string;
  ruleChange: string;
  action: string;
  responsible: string;
  deadline: string;
  status: "pending" | "in_progress" | "done";
  category: string;
}

interface Props { alerts: { id: string; title: string; autoActions: { label: string; description: string; done: boolean }[]; effectiveDate: string; category: string }[];
}

export function ComplianceChecklist({ alerts }: Props) { const [tasks, setTasks] = useState<ComplianceTask[]>(() => { const result: ComplianceTask[] = [];
    for (const alert of alerts) { for (const action of alert.autoActions) { result.push({ id: `${alert.id}-${action.label}`,
          ruleChange: alert.title,
          action: action.label,
          responsible: "Ej tilldelad",
          deadline: alert.effectiveDate,
          status: action.done ? "done" : "pending",
          category: alert.category,
        });
      }
    }
    return result;
  });

  const completedCount = tasks.filter(t => t.status === "done").length;
  const totalCount = tasks.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function toggleStatus(id: string) { setTasks(prev => prev.map(t => { if (t.id !== id) return t;
      const next = t.status === "done" ? "pending" : t.status === "pending" ? "in_progress" : "done";
      return { ...t, status: next };
    }));
  }

  function setResponsible(id: string, value: string) { setTasks(prev => prev.map(t => t.id === id ? { ...t, responsible: value } : t));
  }

  const statusIcon = (s: string) => { if (s === "done") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (s === "in_progress") return <Clock className="h-4 w-4 text-[#7A5417]" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  if (totalCount === 0) { return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-primary" />
          <p className="font-medium text-foreground">Inga åtgärder att vidta</p>
          <p className="text-xs text-muted-foreground mt-1">Alla regeländringar är antingen auto-hanterade eller ignorerade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress card */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">
              {completedCount} av {totalCount} åtgärder klara ({completionPct}%)
            </p>
            <Badge variant={completionPct >= 90 ? "default" : completionPct >= 50 ? "secondary" : "destructive"} className="text-[10px]">
              {completionPct >= 90 ? "Pa god vag" : completionPct >= 50 ? "Pagaende" : "Behover uppmarksamhet"}
            </Badge>
          </div>
          <Progress value={completionPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Task list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Åtgärdslista
          </CardTitle>
          <CardDescription>Automatiskt genererade uppgifter från aktiva regeländringar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${ task.status === "done" ? "bg-primary/5 border-primary/20" : "hover:bg-muted/30"
              }`}
            >
              <button onClick={() => toggleStatus(task.id)} className="mt-0.5 shrink-0">
                {statusIcon(task.status)}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.action}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.ruleChange}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[9px]">{task.category}</Badge>
                  <span className="text-[10px] text-muted-foreground">Deadline: {task.deadline}</span>
                </div>
              </div>

              <div className="shrink-0">
                <Select value={task.responsible} onValueChange={v => setResponsible(task.id, v)}>
                  <SelectTrigger className="h-7 w-[130px] text-[10px]">
                    <Users className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ej tilldelad">Ej tilldelad</SelectItem>
                    <SelectItem value="VD">VD</SelectItem>
                    <SelectItem value="CFO">CFO</SelectItem>
                    <SelectItem value="Ekonomichef">Ekonomichef</SelectItem>
                    <SelectItem value="Redovisare">Redovisare</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
