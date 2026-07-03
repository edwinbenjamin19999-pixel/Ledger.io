import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addDays } from "date-fns";

interface DismissalRow {
  action_id: string;
  dismissed_until: string | null;
}

export type DismissDuration = "today" | "week" | "permanent";

export function useActionDismissals(companyId?: string | null) {
  const [rows, setRows] = useState<DismissalRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(auth.user?.id ?? null);
      if (!companyId || !auth.user) {
        setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("ai_action_dismissals")
        .select("action_id, dismissed_until")
        .eq("company_id", companyId)
        .eq("user_id", auth.user.id);
      if (!active) return;
      setRows((data as DismissalRow[]) || []);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [companyId]);

  const isDismissed = useCallback(
    (actionId: string): boolean => {
      const row = rows.find((r) => r.action_id === actionId);
      if (!row) return false;
      if (row.dismissed_until === null) return true; // permanent
      return new Date(row.dismissed_until) > new Date();
    },
    [rows],
  );

  const dismiss = useCallback(
    async (actionId: string, duration: DismissDuration) => {
      if (!companyId || !userId) return;
      const dismissed_until =
        duration === "permanent"
          ? null
          : duration === "week"
          ? addDays(new Date(), 7).toISOString()
          : addDays(new Date(), 1).toISOString();

      // optimistic
      setRows((prev) => {
        const filtered = prev.filter((r) => r.action_id !== actionId);
        return [...filtered, { action_id: actionId, dismissed_until }];
      });

      await supabase.from("ai_action_dismissals").upsert(
        {
          company_id: companyId,
          user_id: userId,
          action_id: actionId,
          dismissed_until,
        },
        { onConflict: "company_id,user_id,action_id" },
      );
    },
    [companyId, userId],
  );

  return { isDismissed, dismiss, loaded };
}
