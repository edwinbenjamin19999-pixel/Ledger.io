import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Lock,
  Loader2,
  ArrowRight,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { usePeriodCloseChecklist, ChecklistItem } from "@/hooks/usePeriodCloseChecklist";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const StatusIcon = ({ checked, status }: { checked: boolean; status: ChecklistItem["status"] }) => {
  if (checked) return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  if (status === "loading") return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
};

const PeriodClose = () => {
  const navigate = useNavigate();
  const {
    loading,
    items,
    isLocked,
    year,
    month,
    manualChecks,
    toggleManual,
    lockPeriod,
    locking,
    refresh,
  } = usePeriodCloseChecklist();

  const periodLabel = `${MONTHS[month - 1]} ${year}`;

  const itemChecked = (item: ChecklistItem) =>
    item.manual ? !!manualChecks[item.id] : item.status === "ok";

  const completed = useMemo(() => items.filter(itemChecked).length, [items, manualChecks]);
  const total = items.length;
  const allChecked = total > 0 && completed === total;

  const handleClose = async () => {
    try {
      await lockPeriod();
      toast.success(`Perioden ${periodLabel} är stängd`);
      refresh();
    } catch (e: any) {
      toast.error("Kunde inte stänga perioden", { description: e?.message });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-400" />
            <h1 className="text-2xl font-semibold">Periodstängning</h1>
            {isLocked && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-500 px-2 py-0.5 text-xs font-medium">
                <Lock className="h-3 w-3" /> Låst
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {periodLabel} — {completed}/{total} klart
          </p>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Stängningschecklista</span>
            <span className="text-xs text-muted-foreground tabular-nums">{completed}/{total}</span>
          </CardTitle>
          <Progress value={(completed / Math.max(total, 1)) * 100} className="h-1.5 mt-2" />
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && items.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
              Kontrollerar period…
            </div>
          )}
          {items.map((item) => {
            const checked = itemChecked(item);
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors"
              >
                <button
                  onClick={() => item.manual && toggleManual(item.id)}
                  className={`mt-0.5 ${item.manual ? "cursor-pointer" : "cursor-default"}`}
                  aria-label={checked ? "Klart" : "Inte klart"}
                  disabled={!item.manual}
                >
                  <StatusIcon checked={checked} status={item.status} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.manual && !checked && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Manuell
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                </div>
                {!checked && item.actionHref && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => navigate(item.actionHref!)}
                  >
                    {item.actionLabel ?? "Öppna"}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-xl border border-border/50 p-4 bg-muted/20">
        <div>
          <p className="text-sm font-medium">Stäng period {periodLabel}</p>
          <p className="text-xs text-muted-foreground">
            {allChecked
              ? "Alla kontroller klara. Perioden låses och kan inte ändras utan justeringsverifikation."
              : "Slutför alla checklistepunkter innan perioden kan stängas."}
          </p>
        </div>
        <Button
          onClick={handleClose}
          disabled={!allChecked || isLocked || locking}
          className="min-w-[160px]"
        >
          {locking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Lock className="h-4 w-4 mr-2" />
          )}
          {isLocked ? "Period stängd" : `Stäng ${MONTHS[month - 1]} ${year}`}
        </Button>
      </div>
    </div>
  );
};

export default PeriodClose;
