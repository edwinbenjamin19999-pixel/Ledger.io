import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CFOPriority } from "./useCFOPriorities";
import type { Consequence } from "@/components/ai-economist/ConsequencePanel";

export function useExecuteCFOAction() {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const execute = async (
    insight: CFOPriority,
    companyId: string,
    automationMode: "manual" | "assisted" | "autonomous",
    payload: Record<string, unknown> = {}
  ) => {
    setPendingId(insight.id);
    try {
      const { data, error } = await supabase.functions.invoke("execute-cfo-action", {
        body: {
          company_id: companyId,
          insight_id: insight.id,
          action_type: insight.action_type,
          payload,
          automation_mode: automationMode,
          confidence: insight.confidence,
          title: insight.title,
          financial_impact: insight.impact_sek,
        },
      });
      if (error) throw error;
      toast.success(`Åtgärd utförd: ${insight.title}`, {
        description: insight.impact_sek
          ? `Påverkan: ${insight.impact_sek.toLocaleString("sv-SE")} kr`
          : undefined,
      });
      return data;
    } catch (e) {
      toast.error("Kunde inte utföra åtgärd", { description: (e as Error).message });
      throw e;
    } finally {
      setPendingId(null);
    }
  };

  /**
   * Dry-run: returns the projected consequence + concrete preview lines
   * without writing any state.
   */
  const dryRun = async (
    insight: CFOPriority,
    companyId: string,
    selectedItems: string[],
  ): Promise<{ consequence: Consequence; preview_items: string[] } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("execute-cfo-action", {
        body: {
          company_id: companyId,
          insight_id: insight.id,
          action_type: insight.action_type,
          payload: { selected_items: selectedItems },
          confidence: insight.confidence,
          title: insight.title,
          financial_impact: insight.impact_sek,
          dry_run: true,
        },
      });
      if (error) throw error;
      return {
        consequence: data?.consequence || {
          expected: [
            { label: "Finansiell påverkan", value: `${insight.impact_sek < 0 ? "−" : "+"}${Math.abs(insight.impact_sek).toLocaleString("sv-SE")} kr` },
            { label: "Antal poster", value: String(selectedItems.length || data?.preview_items?.length || 0) },
          ],
          downside: ["Ångringsfönster på 24 timmar är aktivt"],
          tradeoff: "Snabb åtgärd vs manuell kontroll",
        },
        preview_items: data?.preview_items || [],
      };
    } catch (e) {
      toast.error("Kunde inte ladda förhandsvisning", { description: (e as Error).message });
      return null;
    }
  };

  /**
   * True rollback — calls revert-cfo-action which restores prior state.
   */
  const revert = async (actionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("revert-cfo-action", {
        body: { action_id: actionId },
      });
      if (error) throw error;
      toast.success("Åtgärd ångrad", { description: "Tidigare tillstånd återställt" });
      return data;
    } catch (e) {
      toast.error("Kunde inte ångra", { description: (e as Error).message });
      throw e;
    }
  };

  /**
   * Track learning-loop decisions (approve / reject / edit).
   */
  const trackDecision = async (
    insight: CFOPriority,
    companyId: string,
    decision: "approved" | "rejected" | "edited" | "reverted",
  ) => {
    try {
      await supabase.functions.invoke("track-ai-decision", {
        body: {
          company_id: companyId,
          insight_id: insight.id,
          insight_kind: (insight.source || "").toLowerCase().split(":")[0] || "unknown",
          action_type: insight.action_type,
          decision,
          confidence: insight.confidence,
          financial_impact: insight.impact_sek,
        },
      });
    } catch {
      // non-fatal
    }
  };

  return { execute, dryRun, revert, trackDecision, pendingId };
}
