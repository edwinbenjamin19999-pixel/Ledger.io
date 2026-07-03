// Frontend hook: log user signals (view/click/act/ignore/simulate/dismiss).
// Triggers learn-cfo-preferences in the background after meaningful actions.
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CFOSignalAction = "view" | "click" | "act" | "ignore" | "simulate" | "dismiss";

const LEARNING_TRIGGERS: CFOSignalAction[] = ["act", "ignore", "dismiss", "simulate"];

export function useCFOTelemetry(companyId?: string | null, userId?: string | null) {
  const learnTimer = useRef<number | null>(null);

  const scheduleLearn = useCallback(() => {
    if (!companyId || !userId) return;
    if (learnTimer.current) window.clearTimeout(learnTimer.current);
    learnTimer.current = window.setTimeout(() => {
      supabase.functions.invoke("learn-cfo-preferences", {
        body: { user_id: userId, company_id: companyId },
      }).catch(() => {});
    }, 2500);
  }, [companyId, userId]);

  const log = useCallback(async (
    insightId: string,
    insightKind: string,
    action: CFOSignalAction,
    metadata: Record<string, unknown> = {},
  ) => {
    if (!companyId || !userId) return;
    try {
      await supabase.from("ai_cfo_signals").insert([{
        user_id: userId, company_id: companyId,
        insight_id: insightId, insight_kind: insightKind,
        action, weight: 1.0, metadata: metadata as never,
      }]);
      if (LEARNING_TRIGGERS.includes(action)) scheduleLearn();
    } catch {
      // swallow — telemetry must not break UX
    }
  }, [companyId, userId, scheduleLearn]);

  useEffect(() => () => {
    if (learnTimer.current) window.clearTimeout(learnTimer.current);
  }, []);

  return { log };
}
