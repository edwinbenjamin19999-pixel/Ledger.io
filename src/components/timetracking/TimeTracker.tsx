import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Play, Square, Plus, Focus, Coffee, Timer } from "lucide-react";
import { useTimer, useTimeEntries, useTimeRates, formatHours } from "@/hooks/useTimeTracking";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ManualEntryDialog } from "./ManualEntryDialog";
import { SmartSuggestions } from "./SmartSuggestions";
import { IdleDetector } from "./IdleDetector";
import { AICategorizeDialog } from "./AICategorizeDialog";

export function TimeTracker() { const timer = useTimer();
  const { user } = useAuth();
  const { createEntry } = useTimeEntries();
  const { rates } = useTimeRates();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

  const [selectedProject, setSelectedProject] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);

  // Pomodoro / Focus mode
  const [focusMode, setFocusMode] = useState(false);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const pomodoroRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const POMODORO_WORK = 25 * 60;
  const POMODORO_BREAK = 5 * 60;

  // AI categorize dialog
  const [showCategorize, setShowCategorize] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<{ durationMinutes: number;
    description: string;
    clientName: string;
    projectId: string;
  } | null>(null);

  // Fetch active projects
  const { data: projects } = useQuery({ queryKey: ["projects_for_time", companyId],
    queryFn: async () => { if (!companyId) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name, client_name")
        .eq("company_id", companyId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const handleProjectChange = (val: string) => { setSelectedProject(val);
    const proj = projects?.find((p) => p.id === val);
    if (proj) setClientName(proj.client_name || "");
  };

  const handleSmartSelect = (client: string, projectId?: string) => { setClientName(client);
    if (projectId) setSelectedProject(projectId);
    timer.start();
  };

  // Pomodoro check
  useEffect(() => { if (!pomodoroActive || !timer.isRunning) return;
    const threshold = onBreak ? POMODORO_BREAK : POMODORO_WORK;
    if (timer.seconds >= threshold) { if (!onBreak) { setPomodoroCount((c) => c + 1);
        setOnBreak(true);
        // Auto-reset timer för break
      } else { setOnBreak(false);
      }
    }
  }, [timer.seconds, pomodoroActive, timer.isRunning, onBreak]);

  const pomodoroTotalMinutes = pomodoroCount * 25 + (onBreak ? 0 : Math.floor(timer.seconds / 60));

  const saveEntry = (durationMinutes: number, finalClient?: string, finalProject?: string, finalDesc?: string, finalBillable?: boolean) => { if (!companyId || !user) return;

    const client = finalClient ?? clientName;
    const proj = finalProject ?? selectedProject;
    const desc = finalDesc ?? description;
    const billable = finalBillable ?? isBillable;

    const clientRate = rates.find((r) => r.client_name === client);
    const defaultRate = rates.find((r) => r.is_default);
    const rate = clientRate?.hourly_rate || defaultRate?.hourly_rate || 0;

    createEntry.mutate({ company_id: companyId,
      user_id: user.id,
      project_id: proj || null,
      client_name: client || null,
      description: desc || null,
      entry_date: new Date().toISOString().slice(0, 10),
      start_time: timer.startedAt?.toISOString() || null,
      end_time: new Date().toISOString(),
      duration_minutes: durationMinutes,
      is_billable: billable,
      hourly_rate: rate,
      rate_id: (clientRate || defaultRate)?.id || null,
    });

    timer.reset();
    setDescription("");
    setPomodoroActive(false);
    setPomodoroCount(0);
    setOnBreak(false);
  };

  const handleStop = () => { const result = timer.stop();
    // Show AI categorize dialog if description exists
    if (description.trim().length > 3) { setPendingEntry({ durationMinutes: result.durationMinutes,
        description,
        clientName,
        projectId: selectedProject,
      });
      setShowCategorize(true);
    } else { saveEntry(result.durationMinutes);
    }
  };

  const handleCategorizeConfirm = (data: { client: string; projectId: string; description: string; billable: boolean }) => { if (pendingEntry) { saveEntry(pendingEntry.durationMinutes, data.client, data.projectId, data.description, data.billable);
    }
    setShowCategorize(false);
    setPendingEntry(null);
  };

  const handleCategorizeSkip = () => { if (pendingEntry) { saveEntry(pendingEntry.durationMinutes);
    }
    setShowCategorize(false);
    setPendingEntry(null);
  };

  const handleIdleStop = (adjustedMinutes?: number) => { timer.stop();
    saveEntry(adjustedMinutes || 1);
  };

  const toggleFocusMode = () => { setFocusMode(!focusMode);
    if (!focusMode) { setPomodoroActive(true);
    } else { setPomodoroActive(false);
      setPomodoroCount(0);
      setOnBreak(false);
    }
  };

  // Focus mode: minimal UI
  if (focusMode && timer.isRunning) { return (
      <div className="space-y-4 mt-4">
        <IdleDetector
          isRunning={timer.isRunning}
          seconds={timer.seconds}
          onStop={handleIdleStop}
          onContinue={() => {}}
        />
        <Card className="overflow-hidden">
          <CardContent className="py-16 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Focus className="h-3.5 w-3.5" />
              <span>Fokusläge{pomodoroActive && !onBreak ? " — Pomodoro" : ""}{onBreak ? " — Paus" : ""}</span>
            </div>
            <p className={cn(
              "font-mono text-7xl md:text-8xl font-bold tracking-wider tabular-nums",
              onBreak ? "text-[#085041]" : "text-[#7A1A1A]"
            )}>
              {timer.formatted}
            </p>
            {clientName && (
              <p className="text-sm text-muted-foreground">{clientName}</p>
            )}
            {pomodoroCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pomodoroCount} Pomodoro{pomodoroCount > 1 ? "s" : ""} klara = {pomodoroTotalMinutes} min fokustid
              </p>
            )}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="h-14 w-40 text-lg font-semibold bg-red-500 hover:bg-red-600 text-white"
                onClick={handleStop}
              >
                <Square className="h-5 w-5 mr-2 fill-current" />
                Stoppa
              </Button>
              <Button variant="outline" onClick={toggleFocusMode} size="lg" className="h-14">
                Avsluta fokus
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <IdleDetector
        isRunning={timer.isRunning}
        seconds={timer.seconds}
        onStop={handleIdleStop}
        onContinue={() => {}}
      />

      {/* Main Timer */}
      <Card className="overflow-hidden">
        <CardContent className="py-12 flex flex-col items-center gap-8">
          {/* Timer display */}
          <div className="text-center">
            <p className={cn(
              "font-mono text-6xl md:text-7xl font-bold tracking-wider tabular-nums",
              timer.isRunning ? "text-[#7A1A1A]" : "text-foreground"
            )}>
              {timer.formatted}
            </p>
            {timer.isRunning && clientName && (
              <p className="text-xs text-muted-foreground mt-2">{clientName}</p>
            )}
            {timer.isRunning && !clientName && (
              <p className="text-xs text-muted-foreground mt-2 animate-pulse">Pågår...</p>
            )}
            {timer.isRunning && pomodoroActive && (
              <p className="text-xs text-muted-foreground mt-1">
                {onBreak ? (
                  <span className="flex items-center justify-center gap-1"><Coffee className="h-3 w-3" /> Paus — vila dig</span>
                ) : (
                  <span className="flex items-center justify-center gap-1"><Timer className="h-3 w-3" /> Pomodoro {pomodoroCount + 1}</span>
                )}
              </p>
            )}
          </div>

          {/* Smart suggestions — shown before start */}
          {!timer.isRunning && !showProjectSelect && (
            <>
              <SmartSuggestions onSelect={handleSmartSelect} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProjectSelect(true)}
                className="text-xs text-muted-foreground"
              >
                + Annat
              </Button>
            </>
          )}

          {/* Manual project selector — fallback */}
          {!timer.isRunning && showProjectSelect && (
            <div className="w-full max-w-sm space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Välj projekt / kund</Label>
                <Select value={selectedProject} onValueChange={handleProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj projekt / kund" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.client_name ? `— ${p.client_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!selectedProject && (
                <div>
                  <Label className="text-xs text-muted-foreground">Eller ange kund direkt</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Kundnamn"
                  />
                </div>
              )}
            </div>
          )}

          {/* Description — shown when running */}
          {timer.isRunning && (
            <div className="w-full max-w-sm">
              <Label className="text-xs text-muted-foreground">Vad gör du just nu? (valfritt)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="T.ex. Möte med kund, utveckling..."
              />
            </div>
          )}

          {/* Controls row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isBillable} onCheckedChange={setIsBillable} id="billable" />
              <Label htmlFor="billable" className="text-sm cursor-pointer">
                Fakturerbar
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={focusMode} onCheckedChange={toggleFocusMode} id="focus" />
              <Label htmlFor="focus" className="text-sm cursor-pointer flex items-center gap-1">
                <Focus className="h-3.5 w-3.5" /> Fokusläge
              </Label>
            </div>
          </div>

          {/* Start / Stop button */}
          <Button
            size="lg"
            className={cn(
              "h-14 w-48 text-lg font-semibold text-white",
              timer.isRunning
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
            )}
            onClick={timer.isRunning ? handleStop : timer.start}
          >
            {timer.isRunning ? (
              <>
                <Square className="h-5 w-5 mr-2 fill-current" />
                Stoppa
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2 fill-current" />
                Starta
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual entry button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setShowManual(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Lägg till tid manuellt
        </Button>
      </div>

      <ManualEntryDialog open={showManual} onOpenChange={setShowManual} />
      <AICategorizeDialog
        open={showCategorize}
        onOpenChange={setShowCategorize}
        description={pendingEntry?.description || ""}
        currentClient={pendingEntry?.clientName || ""}
        currentProject={pendingEntry?.projectId || ""}
        durationMinutes={pendingEntry?.durationMinutes || 0}
        onConfirm={handleCategorizeConfirm}
        onSkip={handleCategorizeSkip}
      />
    </div>
  );
}
