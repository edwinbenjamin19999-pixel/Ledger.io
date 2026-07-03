import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DEFAULT_AUTO_RULES,
  loadFromJson,
  shouldRuleFire,
  toJson,
  type AutoRule,
  type AutoRuleKey,
  type RuleFireContext,
} from "@/lib/cashflow/rules";

interface Args {
  companyId: string | undefined;
  ctx: RuleFireContext | null;
  arInvoiceIds: string[];
}

interface State {
  rules: AutoRule[];
  loading: boolean;
}

/**
 * Subscribes to KPI-derived context and, when a rule's threshold is breached,
 * dispatches the configured action via execute-cfo-action with
 * automation_mode='auto'. Runs while the page is open (client-side cron).
 */
export function useAutoModeWatcher({ companyId, ctx, arInvoiceIds }: Args) {
  const [state, setState] = useState<State>({ rules: DEFAULT_AUTO_RULES, loading: true });
  const lastSettingsRef = useRef<unknown>(null);
  const lastFiredRef = useRef<Map<AutoRuleKey, number>>(new Map());

  // Load rules
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("automation_settings")
        .select("system_priorities")
        .eq("company_id", companyId)
        .maybeSingle();
      if (cancelled) return;
      lastSettingsRef.current = data?.system_priorities ?? null;
      const loaded = loadFromJson(data?.system_priorities);
      setState({ rules: loaded.rules, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const setRule = async (key: AutoRuleKey, patch: Partial<AutoRule>) => {
    if (!companyId) return;
    const next = state.rules.map((r) => (r.key === key ? { ...r, ...patch } : r));
    setState({ ...state, rules: next });
    const merged = toJson({ rules: next }, lastSettingsRef.current);
    lastSettingsRef.current = merged;
    await supabase
      .from("automation_settings")
      .upsert({ company_id: companyId, system_priorities: merged as never }, { onConflict: "company_id" });
  };

  // Watch context — fire rules
  useEffect(() => {
    if (!companyId || !ctx || state.loading) return;
    for (const rule of state.rules) {
      if (!shouldRuleFire(rule, ctx)) continue;
      const last = lastFiredRef.current.get(rule.key) ?? 0;
      if (Date.now() - last < 60 * 60 * 1000) continue; // 1h throttle
      lastFiredRef.current.set(rule.key, Date.now());

      const payload: Record<string, unknown> = {
        trigger_reason: rule.key,
        threshold: rule.threshold,
      };
      if (rule.actionType === "send_reminder" && arInvoiceIds.length > 0) {
        payload.invoice_ids = arInvoiceIds.slice(0, 10);
      }

      supabase.functions
        .invoke("execute-cfo-action", {
          body: {
            company_id: companyId,
            action_type: rule.actionType,
            payload,
            automation_mode: "auto",
            confidence: 0.85,
            title: `[Auto] ${rule.key}`,
          },
        })
        .then(({ error }) => {
          if (error) {
            console.warn("auto-mode dispatch failed", error);
          } else {
            toast.success("Auto-åtgärd utförd", { description: `Regel: ${rule.key}` });
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, ctx?.arOverdueTotal, ctx?.cashBalance, ctx?.oldestOverdueDays, state.rules, state.loading]);

  return { ...state, setRule };
}
