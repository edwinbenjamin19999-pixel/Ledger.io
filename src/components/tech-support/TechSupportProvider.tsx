import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildPlan, makeIncident } from "@/lib/tech-support/supportOrchestrator";
import { saveSnapshot } from "@/lib/tech-support/actionWhitelist";
import { reportValidationError, onPredictive } from "@/lib/tech-support/predictiveMonitor";
import { logIncident } from "@/lib/tech-support/incidentLogger";
import type { ActionResult, RecoveryAction, SupportIncident, SupportPlan } from "@/lib/tech-support/types";
import { TechSupportPopup } from "./TechSupportPopup";
import { InlineWarningChip } from "./InlineWarningChip";
import { toast } from "sonner";

interface TechSupportContextValue {
  report: (
    error: Error | { message: string; status?: number },
    context?: { module?: string; source?: SupportIncident["source"]; [k: string]: unknown },
  ) => void;
  registerSnapshot: (key: string, state: unknown) => void;
  monitorValidation: (formId: string, fieldId?: string) => void;
}

export const TechSupportContext = createContext<TechSupportContextValue | null>(null);

export function TechSupportProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<SupportPlan | null>(null);
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const recentSignatures = useRef<Map<string, number>>(new Map());

  const report = useCallback<TechSupportContextValue["report"]>((error, context = {}) => {
    const msg = error instanceof Error ? error.message : error.message;
    const status = "status" in error ? (error as { status?: number }).status : undefined;
    const incident = makeIncident(
      context.source ?? "manual",
      msg || "Okänt fel",
      { ...context, status, name: error instanceof Error ? error.name : undefined },
      context.module,
    );

    // Throttle: same signature within 5s → skip popup but still log
    const sig = incident.signature ?? msg;
    const last = recentSignatures.current.get(sig) ?? 0;
    const now = Date.now();
    recentSignatures.current.set(sig, now);
    const built = buildPlan(incident);
    void logIncident(incident, built);

    if (now - last < 5_000) return;

    setPlan(built);
    setOpen(true);
  }, []);

  const registerSnapshot = useCallback((key: string, state: unknown) => {
    saveSnapshot(key, state);
  }, []);

  const monitorValidation = useCallback((formId: string, fieldId?: string) => {
    reportValidationError(formId, fieldId);
  }, []);

  // Listen to predictive events
  useEffect(() => {
    const off = onPredictive((ev) => {
      if (ev.kind === "repeated_validation") {
        setWarning(`Vi märkte upprepade valideringsfel (${ev.count}). Vill du ha hjälp?`);
      } else if (ev.kind === "repeated_request") {
        toast.warning("Samma anrop misslyckades flera gånger.", {
          action: {
            label: "Visa diagnos",
            onClick: () => {
              const incident = makeIncident("predictive", "Upprepat misslyckat anrop", {
                signature: ev.signature,
              });
              const built = buildPlan(incident);
              void logIncident(incident, built);
              setPlan(built);
              setOpen(true);
            },
          },
        });
      }
    });
    return () => {
      off();
    };
  }, []);

  // Global error listeners
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (!e.error && !e.message) return;
      report(e.error ?? { message: e.message }, { source: "render" });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      if (!reason) return;
      const err =
        reason instanceof Error
          ? reason
          : { message: typeof reason === "string" ? reason : "Oväntat fel" };
      report(err, { source: "api" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // Custom event channel for explicit reports from anywhere in the app
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { message: string; status?: number; module?: string }
        | undefined;
      if (!detail) return;
      report({ message: detail.message, status: detail.status }, {
        source: "api",
        module: detail.module,
      });
    };
    window.addEventListener("tech-support:report", onCustom as EventListener);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("tech-support:report", onCustom as EventListener);
    };
  }, [report]);

  const value = useMemo<TechSupportContextValue>(
    () => ({ report, registerSnapshot, monitorValidation }),
    [report, registerSnapshot, monitorValidation],
  );

  const handleResult = useCallback(
    (action: RecoveryAction, res: ActionResult) => {
      if (plan) void logIncident(plan.incident, plan, { actionId: action.id, result: res });
    },
    [plan],
  );

  return (
    <TechSupportContext.Provider value={value}>
      {children}
      {warning && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
          <div className="pointer-events-auto">
            <InlineWarningChip
              message={warning}
              onAction={() => {
                const incident = makeIncident("predictive", warning, { kind: "validation_pattern" });
                const built = buildPlan(incident);
                void logIncident(incident, built);
                setPlan(built);
                setOpen(true);
                setWarning(null);
              }}
              onDismiss={() => setWarning(null)}
            />
          </div>
        </div>
      )}
      <TechSupportPopup
        open={open}
        plan={plan}
        onClose={() => setOpen(false)}
        onResult={handleResult}
      />
    </TechSupportContext.Provider>
  );
}
