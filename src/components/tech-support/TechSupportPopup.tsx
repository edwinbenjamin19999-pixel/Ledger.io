import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, ShieldCheck, Wrench, ExternalLink, Undo2 } from "lucide-react";
import type { ActionResult, RecoveryAction, SupportPlan } from "@/lib/tech-support/types";
import { runAction } from "@/lib/tech-support/actionWhitelist";

interface Props {
  open: boolean;
  plan: SupportPlan | null;
  onClose: () => void;
  onResult?: (action: RecoveryAction, result: ActionResult) => void;
}

const modeColor: Record<string, string> = {
  AUTO: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/40 dark:text-emerald-200",
  ASSISTED: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/40 dark:text-amber-200",
  BLOCKED: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-rose-900/40 dark:text-rose-200",
};

export function TechSupportPopup({ open, plan, onClose, onResult }: Props) {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<{ action: RecoveryAction; res: ActionResult } | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setUndoVisible(false);
      setRunning(null);
    }
  }, [open]);

  useEffect(() => {
    if (result?.res.ok && result.res.undo) {
      setUndoVisible(true);
      const t = setTimeout(() => setUndoVisible(false), 30_000);
      return () => clearTimeout(t);
    }
  }, [result]);

  if (!plan) return null;

  const handleRun = async (action: RecoveryAction) => {
    setRunning(action.id);
    const res = await runAction(action);
    setRunning(null);
    setResult({ action, res });
    onResult?.(action, res);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {plan.mode === "BLOCKED" ? (
              <ShieldAlert className="h-5 w-5 text-[#7A1A1A]" />
            ) : (
              <Wrench className="h-5 w-5 text-[#3b82f6]" />
            )}
            Teknisk support
          </DialogTitle>
          <DialogDescription>Sandboxad assistent — ändrar aldrig din data eller systeminställningar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h4 className="mb-1 font-medium text-foreground">Vad hände</h4>
            <p className="text-muted-foreground">{plan.explanation}</p>
          </section>

          {plan.why && (
            <section>
              <h4 className="mb-1 font-medium text-foreground">Varför</h4>
              <p className="text-muted-foreground">{plan.why}</p>
            </section>
          )}

          {plan.affectedData && (
            <section>
              <h4 className="mb-1 font-medium text-foreground">Påverkad data</h4>
              <p className="text-muted-foreground">{plan.affectedData}</p>
            </section>
          )}

          {plan.actions.length > 0 && !result && (
            <section className="space-y-2">
              <h4 className="font-medium text-foreground">Föreslagna åtgärder</h4>
              <ul className="space-y-2">
                {plan.actions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.label}</span>
                        <Badge variant="secondary" className={modeColor[a.mode]}>
                          {a.mode}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRun(a)}
                      disabled={running !== null}
                    >
                      {running === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Kör fix"
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result && (
            <section className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center gap-2">
                {result.res.ok ? (
                  <ShieldCheck className="h-4 w-4 text-[#085041]" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-[#7A1A1A]" />
                )}
                <span className="font-medium">
                  {result.res.ok ? "Åtgärd lyckades" : "Åtgärd misslyckades"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{result.res.message}</p>
              {undoVisible && result.res.undo && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={async () => {
                    await result.res.undo?.();
                    setUndoVisible(false);
                  }}
                >
                  <Undo2 className="mr-1.5 h-3 w-3" /> Ångra
                </Button>
              )}
            </section>
          )}

          {plan.escalate && (
            <section className="rounded-lg border border-[#F4C8C8] bg-rose-50/50 p-3 dark:border-rose-900/40 dark:bg-rose-950/30">
              <p className="text-xs text-[#7A1A1A] dark:text-rose-100">
                Det här kräver vår support. Klicka nedan för att skicka ett ärende — vi har redan loggat detaljerna.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                asChild
              >
                <a
                  href={`mailto:support@bokfy.se?subject=${encodeURIComponent(
                    "Teknisk support: " + (plan.incident.module ?? "okänd modul"),
                  )}&body=${encodeURIComponent(
                    `Incident-ID: ${plan.incident.id}\nKlassificering: ${plan.incident.classification}\nFel: ${plan.incident.errorMessage}`,
                  )}`}
                >
                  <ExternalLink className="mr-1.5 h-3 w-3" /> Eskalera till support
                </a>
              </Button>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Stäng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
