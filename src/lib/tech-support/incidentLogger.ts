/**
 * Logger — postar incidenter till tech-support-ai edge function.
 * Fail-silent: får aldrig kasta vidare.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SupportIncident, SupportPlan, ActionResult } from "./types";

export async function logIncident(
  incident: SupportIncident,
  plan: SupportPlan,
  outcome?: { actionId?: string; result?: ActionResult },
) {
  try {
    await supabase.functions.invoke("tech-support-ai", {
      body: {
        op: "log",
        incident,
        plan: { mode: plan.mode, escalate: plan.escalate, actions: plan.actions.map((a) => a.id) },
        outcome: outcome
          ? { actionId: outcome.actionId, ok: outcome.result?.ok, message: outcome.result?.message }
          : null,
      },
    });
  } catch {
    /* never throw from logger */
  }
}

export async function explainIncident(incident: SupportIncident): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("tech-support-ai", {
      body: { op: "explain", incident },
    });
    if (error) return null;
    return (data as { explanation?: string } | null)?.explanation ?? null;
  } catch {
    return null;
  }
}
