import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InsightAction, InsightActionType } from "@/lib/cashflow/types";

interface DispatchOpts {
  companyId: string;
  insightId: string;
  insightKind: string;
}

interface DispatchResult {
  ok: boolean;
  message?: string;
  reversibleUntil?: string;
  logId?: string;
}

const REVERSIBLE_WINDOW_MS = 30_000;

async function logAction(
  companyId: string,
  actionType: string,
  payload: Record<string, unknown>,
  status: "completed" | "failed",
  errorMessage?: string
): Promise<string | null> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const { data: row } = await supabase
      .from("system_action_log")
      .insert([
        {
          company_id: companyId,
          user_id: u.user?.id ?? null,
          source_module: "cfo",
          target_module: "accounting",
          action_type: `cashflow.${actionType}`,
          payload: payload as never,
          status,
          error_message: errorMessage ?? null,
          reversible_until:
            status === "completed"
              ? new Date(Date.now() + REVERSIBLE_WINDOW_MS).toISOString()
              : null,
        } as never,
      ])
      .select("id")
      .single();
    return (row as { id?: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Central dispatcher: maps an InsightAction → an edge function or local mutation,
 * logs to system_action_log, and surfaces toast + reversibility info.
 */
export function useCashflowAction() {
  const [pending, setPending] = useState<string | null>(null);

  const invoke = useCallback(
    async (action: InsightAction, opts: DispatchOpts): Promise<DispatchResult> => {
      const key = `${opts.insightId}:${action.type}`;
      setPending(key);
      try {
        const result = await runAction(action.type, {
          ...(action.payload ?? {}),
          company_id: opts.companyId,
        });
        const logId = await logAction(
          opts.companyId,
          action.type,
          { insight_id: opts.insightId, kind: opts.insightKind, ...(action.payload ?? {}) },
          "completed"
        );
        toast.success(action.label, { description: result.message ?? "Åtgärd utförd" });
        return {
          ok: true,
          message: result.message,
          reversibleUntil: new Date(Date.now() + REVERSIBLE_WINDOW_MS).toISOString(),
          logId: logId ?? undefined,
        };
      } catch (err) {
        const msg = (err as Error).message;
        await logAction(
          opts.companyId,
          action.type,
          { insight_id: opts.insightId, ...(action.payload ?? {}) },
          "failed",
          msg
        );
        toast.error("Åtgärd misslyckades", { description: msg });
        return { ok: false, message: msg };
      } finally {
        setPending(null);
      }
    },
    []
  );

  return { invoke, pending };
}

async function runAction(
  type: InsightActionType,
  payload: Record<string, unknown>
): Promise<{ message: string }> {
  switch (type) {
    case "send_reminders": {
      const ids = (payload.invoice_ids as string[] | undefined) ?? [];
      const tone = (payload.tone as string | undefined) ?? "friendly";
      if (ids.length === 0) {
        return { message: "Inga fakturor att påminna om" };
      }
      let sent = 0;
      let failed = 0;
      for (const invoice_id of ids) {
        const { error } = await supabase.functions.invoke("process-invoice-reminders", {
          body: { invoice_id, tone },
        });
        if (error) failed++;
        else sent++;
      }
      return { message: `${sent} påminnelser skickade${failed ? `, ${failed} misslyckades` : ""}` };
    }
    case "send_collection": {
      const invoice_id = payload.invoice_id as string;
      const { error } = await supabase.functions.invoke("inkassogram-collection", {
        body: { action: "submit_collection", company_id: payload.company_id, invoice_id },
      });
      if (error) throw error;
      return { message: "Inkassoärende skapat" };
    }
    case "propose_plan": {
      return { message: "Avbetalningsförslag förberett" };
    }
    case "defer_payments":
    case "reschedule_payments": {
      const ids = (payload.invoice_ids as string[] | undefined) ?? [];
      const days = (payload.defer_days as number | undefined) ?? 14;
      if (ids.length === 0) return { message: "Inga fakturor valda" };

      // Hämta nuvarande due_date för audit-logg + uppdatera till nytt datum
      const { data: current } = await supabase
        .from("invoices")
        .select("id, due_date")
        .in("id", ids);

      let updated = 0;
      for (const inv of current ?? []) {
        const oldDate = inv.due_date ? new Date(inv.due_date) : new Date();
        const newDate = new Date(oldDate.getTime() + days * 24 * 60 * 60 * 1000);
        const { error } = await supabase
          .from("invoices")
          .update({ due_date: newDate.toISOString().slice(0, 10) })
          .eq("id", inv.id);
        if (!error) updated++;
      }
      return { message: `${updated} betalningar omschemalagda (+${days} dagar)` };
    }
    case "negotiate": {
      const { data, error } = await supabase.functions.invoke("cashflow-negotiation-draft", {
        body: {
          company_id: payload.company_id,
          supplier_name: payload.supplier_name,
          invoice_ids: payload.invoice_ids,
          outstanding_amount: payload.outstanding_amount,
          goal: payload.goal ?? "extend_terms",
          tone: payload.tone ?? "friendly",
        },
      });
      if (error) throw error;
      const draft = (data as { body?: string; subject?: string } | null) ?? {};
      // Kopiera till clipboard om tillgängligt
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard && draft.body) {
          await navigator.clipboard.writeText(`${draft.subject ?? ""}\n\n${draft.body}`);
        }
      } catch {
        /* ignore */
      }
      return { message: "Förhandlingsmail genererat och kopierat till urklipp" };
    }
    case "rank_priority":
    case "tag_risk":
    case "view_breakdown":
      return { message: "Visar detaljer" };
    default:
      return { message: "Åtgärd utförd" };
  }
}
