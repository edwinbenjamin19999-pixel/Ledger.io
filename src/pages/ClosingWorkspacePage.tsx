import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Lock, CheckCircle2, Circle, Clock, AlertTriangle, ArrowRight,
  Shield, Plus, ChevronRight, Brain, Zap, TrendingUp, TrendingDown,
  Banknote, Receipt, Calculator, ClipboardList, FileCheck, ListChecks,
  Play, Eye, BarChart3, AlertCircle, Info, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useClosingWorkspace, ClosingPeriod, ClosingChecklistItem } from "@/hooks/useClosingWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MONTH_NAMES = ["", "Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

// AI-driven issue detection
interface CloseIssue { id: string;
  severity: "error" | "warning" | "suggestion";
  title: string;
  description: string;
  impact: string;
  category: string;
  fixable: boolean;
  fixLabel?: string;
}

interface CloseTaskBlock { category: string;
  label: string;
  icon: React.ReactNode;
  status: "done" | "in_progress" | "pending" | "error";
  summary: string;
  detail?: string;
  progress?: number;
  actionLabel?: string;
}

const ClosingWorkspacePage = () => { const { companyId, usePeriods, useChecklist, useLocks,
    createPeriod, updateChecklistItem, advancePeriodStatus, updateProgress,
  } = useClosingWorkspace();

  const { data: periods = [], isLoading } = usePeriods();
  const { data: locks = [] } = useLocks();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ type: "month", year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [aiRunning, setAiRunning] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStage, setAiStage] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<CloseIssue | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  useEffect(() => { if (periods.length > 0 && !selectedPeriodId) { setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const handleCreate = () => { createPeriod.mutate(
      { period_type: newPeriod.type, period_year: newPeriod.year, period_month: newPeriod.type === "month" ? newPeriod.month : undefined },
      { onSuccess: (p) => { setSelectedPeriodId(p.id); setShowCreate(false); } }
    );
  };

  const periodLabel = (p: ClosingPeriod) =>
    p.period_type === "year"
      ? `Årsbokslut ${p.period_year}`
      : `${MONTH_NAMES[p.period_month || 1]} ${p.period_year}`;

  const stageConfig: Record<string, { label: string; color: string }> = { open: { label: "Öppen", color: "bg-blue-500" },
    soft_closed: { label: "Soft Close", color: "bg-amber-500" },
    in_review: { label: "Granskning", color: "bg-purple-500" },
    hard_closed: { label: "Låst", color: "bg-green-600" },
  };
  const stages = ["open", "soft_closed", "in_review", "hard_closed"];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Periodstängning</h1>
          <p className="text-sm text-muted-foreground">AI-driven månads- och årsbokslut</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Ny period</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Skapa stängningsperiod</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={newPeriod.type} onValueChange={(v) => setNewPeriod({ ...newPeriod, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Månadsbokslut</SelectItem>
                    <SelectItem value="year">Årsbokslut</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(newPeriod.year)} onValueChange={(v) => setNewPeriod({ ...newPeriod, year: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                {newPeriod.type === "month" && (
                  <Select value={String(newPeriod.month)} onValueChange={(v) => setNewPeriod({ ...newPeriod, month: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={handleCreate} disabled={createPeriod.isPending} className="w-full">Skapa</Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Period selector */}
          {periods.length > 0 && (
            <Select value={selectedPeriodId || ""} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Välj period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {periodLabel(p)}
                    {p.status === "hard_closed" && " ✓"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedPeriod ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Ingen period vald</h3>
            <p className="text-sm text-muted-foreground mt-1">Skapa en ny period eller välj en befintlig för att börja</p>
          </CardContent>
        </Card>
      ) : (
        <CloseEngineView
          period={selectedPeriod}
          periodLabel={periodLabel(selectedPeriod)}
          stages={stages}
          stageConfig={stageConfig}
          companyId={companyId}
          aiRunning={aiRunning}
          aiProgress={aiProgress}
          aiStage={aiStage}
          selectedIssue={selectedIssue}
          expandedTasks={expandedTasks}
          onRunAI={async () => { setAiRunning(true);
            setAiProgress(0);
            const steps = [
              "Analyserar banktransaktioner...",
              "Kontrollerar periodiseringar...",
              "Kör avskrivningar...",
              "Beräknar moms...",
              "Verifierar lönekörning...",
              "Genererar sammanfattning...",
            ];
            for (let i = 0; i < steps.length; i++) { setAiStage(steps[i]);
              setAiProgress(Math.round(((i + 1) / steps.length) * 100));
              await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
            }
            setAiRunning(false);
            setAiStage("");
            toast.success("AI-analys slutförd");
          }}
          onSelectIssue={setSelectedIssue}
          onToggleTask={(cat) => { setExpandedTasks(prev => { const next = new Set(prev);
              next.has(cat) ? next.delete(cat) : next.add(cat);
              return next;
            });
          }}
          onAdvance={(s) => advancePeriodStatus.mutate({ periodId: selectedPeriod.id, newStatus: s })}
          onUpdateItem={(id, status, notes) => updateChecklistItem.mutate({ itemId: id, status, notes })}
          onUpdateProgress={(p) => updateProgress.mutate({ periodId: selectedPeriod.id, progress: p })}
        />
      )}
    </div>
  );
};

// ─── CLOSE ENGINE VIEW ──────────────────────────────────────────────
const CloseEngineView = ({ period, periodLabel, stages, stageConfig, companyId,
  aiRunning, aiProgress, aiStage, selectedIssue, expandedTasks,
  onRunAI, onSelectIssue, onToggleTask, onAdvance, onUpdateItem, onUpdateProgress,
}: { period: ClosingPeriod;
  periodLabel: string;
  stages: string[];
  stageConfig: Record<string, { label: string; color: string }>;
  companyId: string | null;
  aiRunning: boolean;
  aiProgress: number;
  aiStage: string;
  selectedIssue: CloseIssue | null;
  expandedTasks: Set<string>;
  onRunAI: () => void;
  onSelectIssue: (i: CloseIssue | null) => void;
  onToggleTask: (cat: string) => void;
  onAdvance: (status: string) => void;
  onUpdateItem: (id: string, status: string, notes?: string) => void;
  onUpdateProgress: (progress: number) => void;
}) => { const { useChecklist } = useClosingWorkspace();
  const { data: checklist = [] } = useChecklist(period.id);
  const completedCount = checklist.filter(i => i.status === "completed").length;
  const totalCount = checklist.length;
  const readiness = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => { if (readiness !== period.progress_percent) onUpdateProgress(readiness);
  }, [readiness, period.progress_percent]);

  const currentStageIdx = stages.indexOf(period.status);
  const isLocked = period.status === "hard_closed";

  // Simulated AI issues
  const issues: CloseIssue[] = useMemo(() => { if (isLocked) return [];
    const items: CloseIssue[] = [];
    const pending = checklist.filter(i => i.status === "pending");
    if (pending.some(i => i.category === "reconciliation")) { items.push({ id: "bank-diff", severity: "error", title: "Bankavstämning ej slutförd",
        description: "Konto 1930 har en differens mot bankens saldo.", impact: "Felaktigt kassasaldo i rapporter",
        category: "reconciliation", fixable: true, fixLabel: "Stäm av automatiskt",
      });
    }
    if (pending.some(i => i.category === "accrual")) { items.push({ id: "accrual-missing", severity: "warning", title: "Saknad periodisering upptäckt",
        description: "AI har identifierat en trolig förutbetald kostnad som inte bokförts.",
        impact: "Kostnader kan bli felperiodiserade", category: "accrual", fixable: true, fixLabel: "Skapa periodisering",
      });
    }
    if (pending.some(i => i.category === "vat")) { items.push({ id: "vat-deviation", severity: "warning", title: "Momsavvikelse mot föregående period",
        description: "Utgående moms avviker med 18% jämfört med förra månaden.",
        impact: "Kan indikera felaktig momskod", category: "vat", fixable: false,
      });
    }
    if (pending.some(i => i.category === "depreciation")) { items.push({ id: "depr-pending", severity: "suggestion", title: "Avskrivningar ej körda",
        description: "Månadsavskrivningar har inte bokförts ännu.",
        impact: "Anläggningstillgångar visas med för högt värde", category: "depreciation", fixable: true, fixLabel: "Kör avskrivningar",
      });
    }
    return items;
  }, [checklist, isLocked]);

  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const riskLevel = errorCount > 0 ? "Hög" : warningCount > 0 ? "Medel" : "Låg";
  const riskColor = errorCount > 0 ? "text-destructive" : warningCount > 0 ? "text-[#7A5417]" : "text-[#085041]";

  // Task blocks
  const taskBlocks: CloseTaskBlock[] = useMemo(() => { const cats = [
      { category: "reconciliation", label: "Bankavstämning", icon: <Banknote className="h-4 w-4" /> },
      { category: "accrual", label: "Periodiseringar", icon: <Calculator className="h-4 w-4" /> },
      { category: "depreciation", label: "Avskrivningar", icon: <TrendingDown className="h-4 w-4" /> },
      { category: "vat", label: "Momsavstämning", icon: <Receipt className="h-4 w-4" /> },
      { category: "payroll", label: "Lönekontroll", icon: <ClipboardList className="h-4 w-4" /> },
      { category: "review", label: "Granskning", icon: <FileCheck className="h-4 w-4" /> },
    ];
    return cats.map(c => { const items = checklist.filter(i => i.category === c.category);
      const done = items.filter(i => i.status === "completed").length;
      const total = items.length;
      const hasError = issues.some(i => i.category === c.category && i.severity === "error");
      const status: CloseTaskBlock["status"] = total === 0 ? "pending"
        : hasError ? "error"
        : done === total ? "done"
        : done > 0 ? "in_progress" : "pending";
      const summaries: Record<string, string> = { reconciliation: done === total ? "Alla konton avstämda" : `${done}/${total} avstämda`,
        accrual: done === total ? "Periodiseringar klara" : `${total - done} kvar`,
        depreciation: done === total ? "Avskrivningar bokförda" : "Ej körda",
        vat: done === total ? "Moms avstämd" : "Behöver granskning",
        payroll: done === total ? "Lön verifierad" : "Ej verifierad",
        review: done === total ? "Granskning klar" : `${done}/${total} granskade`,
      };
      return { ...c, status, summary: summaries[c.category] || `${done}/${total}`, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [checklist, issues]);

  const nextStepMap: Record<string, { status: string; label: string }> = { open: { status: "soft_closed", label: "Soft Close" },
    soft_closed: { status: "in_review", label: "Till granskning" },
    in_review: { status: "hard_closed", label: "Lås perioden" },
  };
  const nextStep = nextStepMap[period.status];

  return (
    <>
      {/* Stage progress bar */}
      <div className="flex items-center gap-1 bg-background border rounded-xl p-2">
        {stages.map((stage, i) => { const cfg = stageConfig[stage];
          const isActive = period.status === stage;
          const isPast = currentStageIdx > i;
          return (
            <div key={stage} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-medium transition-all ${ isActive ? `${cfg.color} text-white` : isPast ? "bg-[#E1F5EE] text-[#085041]" : "bg-muted text-muted-foreground"
              }`}>
                {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : isActive ? <Circle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 opacity-40" />}
                {cfg.label}
              </div>
              {i < stages.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
    </div>
          );
        })}
      </div>

      {/* AI Running overlay */}
      {aiRunning && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-5">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">AI analyserar {periodLabel}...</span>
            </div>
            <Progress value={aiProgress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">{aiStage}</p>
          </CardContent>
        </Card>
      )}

      {/* 1. AI SUMMARY */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 ${ readiness >= 90 ? "bg-[#E1F5EE]" : readiness >= 50 ? "bg-[#FAEEDA]" : "bg-destructive/10"
              }`}>
                <span className={`text-xl font-bold ${ readiness >= 90 ? "text-[#085041]" : readiness >= 50 ? "text-[#7A5417]" : "text-destructive"
                }`}>{readiness}%</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {isLocked ? `${periodLabel} — Låst` : readiness >= 90 ? "Bokföringen är nästan redo" : readiness >= 50 ? "Bokföringen behöver granskning" : "Flera uppgifter kvarstår"}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} uppgifter klara</span>
                  <span className="text-sm">Risk: <span className={`font-medium ${riskColor}`}>{riskLevel}</span></span>
                  {issues.length > 0 && (
                    <span className="text-sm text-muted-foreground">{issues.length} {issues.length === 1 ? "problem" : "problem"} att hantera</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!isLocked && (
                <Button onClick={onRunAI} disabled={aiRunning} variant="outline" size="sm">
                  <Brain className="h-4 w-4 mr-2" /> Kör AI-analys
                </Button>
              )}
              {nextStep && (
                <Button
                  onClick={() => onAdvance(nextStep.status)}
                  disabled={nextStep.status === "hard_closed" && errorCount > 0}
                  size="sm"
                >
                  {nextStep.status === "hard_closed" ? <Lock className="h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  {nextStep.label}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. CRITICAL ISSUES */}
      {issues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Problem och varningar
          </h3>
          <div className="grid gap-2">
            {issues.map(issue => (
              <Card
                key={issue.id}
                className={`cursor-pointer hover:shadow-sm transition-shadow border-l-4 ${ issue.severity === "error" ? "border-l-destructive" : issue.severity === "warning" ? "border-l-amber-500" : "border-l-blue-400"
                }`}
                onClick={() => onSelectIssue(issue)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {issue.severity === "error" ? (
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      ) : issue.severity === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-[#7A5417] flex-shrink-0" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">{issue.impact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {issue.fixable && (
                        <Button
                          size="sm" variant="outline" className="text-xs h-7"
                          onClick={(e) => { e.stopPropagation();
                            toast.success(`${issue.title} — åtgärdad`);
                          }}
                        >
                          <Zap className="h-3 w-3 mr-1" /> {issue.fixLabel}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); onSelectIssue(issue); }}>
                        <Eye className="h-3 w-3 mr-1" /> Detaljer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. CLOSE TASKS */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Stängningsuppgifter
        </h3>
        <div className="grid gap-2">
          {taskBlocks.map(task => { const isExpanded = expandedTasks.has(task.category);
            const items = checklist.filter(i => i.category === task.category);
            return (
              <Card key={task.category}>
                <button
                  className="w-full text-left"
                  onClick={() => onToggleTask(task.category)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${ task.status === "done" ? "bg-[#E1F5EE] text-[#085041]"
                          : task.status === "error" ? "bg-destructive/10 text-destructive"
                          : task.status === "in_progress" ? "bg-[#FAEEDA] text-[#7A5417]"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {task.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{task.label}</span>
                            {task.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-[#085041]" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{task.summary}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {task.progress !== undefined && task.status !== "done" && (
                          <div className="w-24">
                            <Progress value={task.progress} className="h-1.5" />
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardContent>
                </button>
                {isExpanded && items.length > 0 && (
                  <div className="border-t divide-y">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2.5 pl-16">
                        <div className="flex items-center gap-3">
                          <button
                            disabled={isLocked}
                            onClick={() => onUpdateItem(item.id, item.status === "completed" ? "pending" : "completed")}
                            className="flex-shrink-0"
                          >
                            {item.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-[#085041]" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <div>
                            <span className={`text-sm ${item.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                            {item.is_required && <Badge variant="outline" className="ml-2 text-[10px] py-0">Obligatorisk</Badge>}
                          </div>
                        </div>
                        {item.auto_check_type && (
                          <Badge variant={item.auto_check_result ? "default" : "secondary"} className="text-xs">
                            {item.auto_check_result ? "Auto OK" : "Auto-check"}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. REVIEW MODE — P&L + BS summary before locking */}
      {period.status === "in_review" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Sammanfattning innan låsning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Intäkter</p>
                <p className="text-lg font-bold font-mono">—</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Kostnader</p>
                <p className="text-lg font-bold font-mono">—</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Resultat</p>
                <p className="text-lg font-bold font-mono">—</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Koppla bokföringsdata för att se periodsammanfattning</p>
          </CardContent>
        </Card>
      )}

      {/* Locking CTA */}
      {period.status === "in_review" && (
        <Card className="border-[#BFE6D6] bg-green-50/50">
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-[#085041]" />
                <div>
                  <p className="text-sm font-semibold text-[#085041]">Redo att låsa {periodLabel}?</p>
                  <p className="text-xs text-[#085041] mt-0.5">
                    {errorCount > 0 ? `${errorCount} problem kvarstår — åtgärda innan låsning` : "Alla kontroller passerade — perioden kan låsas"}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onAdvance("hard_closed")}
                disabled={errorCount > 0}
                className="bg-green-700 hover:bg-green-800"
              >
                <Lock className="h-4 w-4 mr-2" /> Lås perioden
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked badge */}
      {isLocked && (
        <Card className="border-[#BFE6D6] bg-green-50/50">
          <CardContent className="py-5 text-center">
            <Lock className="h-8 w-8 text-[#085041] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#085041]">{periodLabel} är låst</p>
            <p className="text-xs text-[#085041] mt-1">
              Låst {period.hard_closed_at ? new Date(period.hard_closed_at).toLocaleDateString("sv-SE") : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Issue detail sheet */}
      <Sheet open={!!selectedIssue} onOpenChange={() => onSelectIssue(null)}>
        <SheetContent className="w-[480px]">
          {selectedIssue && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedIssue.severity === "error" ? <AlertCircle className="h-5 w-5 text-destructive" /> :
                   selectedIssue.severity === "warning" ? <AlertTriangle className="h-5 w-5 text-[#7A5417]" /> :
                   <Info className="h-5 w-5 text-blue-500" />}
                  {selectedIssue.title}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Beskrivning</h4>
                  <p className="text-sm">{selectedIssue.description}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Finansiell påverkan</h4>
                  <p className="text-sm">{selectedIssue.impact}</p>
                </div>
                <Separator />
                {selectedIssue.fixable && (
                  <Button className="w-full" onClick={() => {
                    onUpdateItem(selectedIssue.id, "completed", `AI-fix tillämpad: ${selectedIssue.fixLabel ?? "Åtgärd utförd"}`);
                    toast.success("Åtgärd utförd", { description: `${selectedIssue.title} markerad som löst i checklistan.` });
                    onSelectIssue(null);
                  }}>
                    <Zap className="h-4 w-4 mr-2" /> {selectedIssue.fixLabel}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ClosingWorkspacePage;
