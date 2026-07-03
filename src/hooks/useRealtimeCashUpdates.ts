import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to live changes on bank_transactions and bank_accounts for the
 * given company. Calls onUpdate() whenever fresh data arrives so the caller
 * can refetch its derived views.
 *
 * Returns connection state for UI ("live" | "reconnecting" | "offline").
 */
export function useRealtimeCashUpdates(
  companyId: string | null | undefined,
  onUpdate: () => void,
) {
  const [status, setStatus] = useState<"live" | "reconnecting" | "offline">("reconnecting");

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`cash-updates-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_transactions", filter: `company_id=eq.${companyId}` },
        () => onUpdate(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_accounts", filter: `company_id=eq.${companyId}` },
        () => onUpdate(),
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("offline");
        else setStatus("reconnecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, onUpdate]);

  return { status };
}
