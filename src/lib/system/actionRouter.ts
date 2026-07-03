import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";
import type { SystemModule } from "./insightBus";

export interface SystemAction {
  type: string;
  source_module: SystemModule;
  target_module: SystemModule;
  company_id: string;
  payload?: Record<string, unknown>;
  navigate?: NavigateFunction;
}

interface ActionResult {
  ok: boolean;
  navigateTo?: string;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Maps cross-module action types → target route and side-effect.
 * Example: benchmark.increase_marketing → creates a budget scenario, opens /budget.
 */
const ROUTE_MAP: Record<string, (payload: Record<string, unknown>) => string> = {
  "benchmark.increase_marketing": (p) => `/budget?scenario=${p.scenario_id ?? ""}`,
  "benchmark.compare_peers":      ()  => `/benchmarking`,
  "cfo.create_accrual":           (p) => `/closing?task=${p.task_id ?? ""}`,
  "cfo.review_priority":          (p) => `/cfo/workspace?context=${p.insight_id ?? ""}`,
  "closing.mismatch_detected":    (p) => `/verifikationer?review=${p.review_id ?? ""}`,
  "closing.open_period":          ()  => `/closing`,
  "group.ic_mismatch":            (p) => `/consolidation?adjustment=${p.adjustment_id ?? ""}`,
  "group.run_consolidation":      ()  => `/consolidation`,
  "budget.simulate":              (p) => `/budget?scenario=${p.scenario_id ?? ""}`,
  "accounting.review":            (p) => `/verifikationer?id=${p.journal_entry_id ?? ""}`,
};

/**
 * Central dispatch for all cross-module actions.
 * Logs to system_action_log (audit), then navigates.
 */
export async function dispatchSystemAction(action: SystemAction): Promise<ActionResult> {
  const { type, source_module, target_module, company_id, payload = {}, navigate } = action;

  try {
    // Write audit row
    const { data: userResp } = await supabase.auth.getUser();
    const user_id = userResp.user?.id ?? null;

    const { data: logRow, error: logErr } = await supabase
      .from("system_action_log")
      .insert([{
        company_id,
        user_id,
        source_module,
        target_module,
        action_type: type,
        payload: payload as never,
        status: "completed",
      }])
      .select("id")
      .single();

    if (logErr) throw logErr;

    // Resolve route
    const router = ROUTE_MAP[type];
    const navigateTo = router ? router(payload) : undefined;

    if (navigateTo && navigate) {
      navigate(navigateTo);
    }

    toast.success("Åtgärd skickad", {
      description: `${source_module} → ${target_module}`,
    });

    return { ok: true, navigateTo, result: { log_id: logRow?.id } };
  } catch (e) {
    const error = (e as Error).message;
    // Best-effort failure log
    try {
      await supabase.from("system_action_log").insert([{
        company_id,
        source_module,
        target_module,
        action_type: type,
        payload: payload as never,
        status: "failed",
        error_message: error,
      }]);
    } catch { /* noop */ }

    toast.error("Cross-module action misslyckades", { description: error });
    return { ok: false, error };
  }
}
