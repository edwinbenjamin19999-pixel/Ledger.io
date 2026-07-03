/**
 * FinOS — Cross-module insight bus.
 *
 * Aggregates insights from every available module hook into a single
 * deterministically-ranked stream. Dashboard uses the full stream; each
 * module passes a `modules` filter to scope to its own subset.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCFOPriorities } from "./useCFOPriorities";
import { useMonthlyCapitalNeed } from "./useMonthlyCapitalNeed";
import { generateCashflowActions } from "@/lib/ai-actions/generateCashflowActions";
import { cfoPriorityToInsight, aiActionToInsight } from "@/lib/finos/adapters";
import { automationTaskToInsight, type AutomationTaskRow } from "@/lib/finos/adapters/automationRuleToInsight";
import { taxAgentItemToInsight, type TaxAgentItem } from "@/lib/finos/adapters/taxAgentItemToInsight";
import { rankInsights } from "@/lib/finos/ranking";
import type { FinOSInsight, FinOSModule } from "@/lib/finos/insights";

interface Options {
  modules?: FinOSModule[];
  personaMode?: "business_owner" | "accountant";
}

interface Result {
  insights: FinOSInsight[];
  loading: boolean;
}

export function useFinOSInsights(companyId: string | null, opts: Options = {}): Result {
  const navigate = useNavigate();
  const allow = (m: FinOSModule) => !opts.modules || opts.modules.includes(m);

  const { data: priorities, loading: cfoLoading } =
    useCFOPriorities(allow("ai_ekonom") || allow("ai_cfo") || allow("dashboard") ? companyId : null, opts.personaMode ?? "business_owner");

  const cashData = useMonthlyCapitalNeed(
    (allow("cash_command") || allow("dashboard")) ? (companyId ?? undefined) : undefined,
  );

  // Automation pending tasks
  const [automationTasks, setAutomationTasks] = useState<AutomationTaskRow[]>([]);
  useEffect(() => {
    if (!companyId || !(allow("automation") || allow("dashboard"))) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("automation_tasks")
        .select("id, task_type, status, created_at, approval_summary")
        .eq("company_id", companyId)
        .in("status", ["needs_approval", "pending_approval", "running"])
        .order("created_at", { ascending: false })
        .limit(10);
      if (!cancelled) setAutomationTasks((data as AutomationTaskRow[]) || []);
    })();
    return () => { cancelled = true; };
  }, [companyId, opts.modules?.join(",")]);

  // Tax agent pending declarations — synthesized from accounting_periods + agi_periods
  const [taxItems, setTaxItems] = useState<TaxAgentItem[]>([]);
  useEffect(() => {
    if (!companyId || !(allow("tax_agent") || allow("dashboard"))) return;
    let cancelled = false;
    (async () => {
      const items: TaxAgentItem[] = [];
      try {
        const { data: agi } = await supabase
          .from("agi_periods")
          .select("id, period_year, period_month, status")
          .eq("company_id", companyId)
          .neq("status", "submitted")
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false })
          .limit(6);
        for (const p of agi || []) {
          // AGI deadline = 12th of the month after period
          const next = new Date(p.period_year, p.period_month, 12);
          items.push({
            id: `agi-${p.id}`,
            label: `AGI ${p.period_year}-${String(p.period_month).padStart(2, "0")}`,
            type: "AGI",
            deadline: next.toISOString(),
            status: (p.status === "submitted" ? "submitted" : next.getTime() < Date.now() ? "overdue" : "pending") as TaxAgentItem["status"],
          });
        }
      } catch { /* table may not exist for all tenants */ }
      if (!cancelled) setTaxItems(items);
    })();
    return () => { cancelled = true; };
  }, [companyId, opts.modules?.join(",")]);

  // VAT findings — heavy compute, scope only to vat module page itself.
  // VAT page already passes its own findings via `extraInsights` prop or mounts
  // a module-specific adapter — kept out of the hook to avoid double-compute.

  const insights = useMemo<FinOSInsight[]>(() => {
    const out: FinOSInsight[] = [];

    if (priorities && (allow("ai_ekonom") || allow("ai_cfo") || allow("dashboard"))) {
      for (const p of [...priorities.top, ...priorities.more]) {
        out.push(cfoPriorityToInsight(p, { onPrimary: () => navigate("/ai-ekonom") }));
      }
    }

    if (cashData && (allow("cash_command") || allow("dashboard"))) {
      const actions = generateCashflowActions({ data: cashData, onNavigate: navigate });
      for (const a of actions) out.push(aiActionToInsight(a, "cash_command"));
    }

    if (automationTasks.length && (allow("automation") || allow("dashboard"))) {
      for (const t of automationTasks) {
        out.push(automationTaskToInsight(t, {
          onReview: () => navigate("/automation"),
          onApprove: () => navigate("/automation"),
        }));
      }
    }

    if (taxItems.length && (allow("tax_agent") || allow("dashboard"))) {
      for (const it of taxItems) {
        out.push(taxAgentItemToInsight(it, {
          onSubmit: () => navigate("/tax-agent"),
          onReview: () => navigate("/tax-agent"),
        }));
      }
    }

    return rankInsights(out);
  }, [priorities, cashData, automationTasks, taxItems, navigate, opts.modules?.join(",")]);

  return { insights, loading: cfoLoading };
}
