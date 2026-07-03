import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type BoardAction = "viewed" | "ignored" | "drilled_in" | "executed";

export function useBoardFeedback(companyId: string | null) {
  const log = useCallback(async (action: BoardAction, insightId?: string, metadata?: Record<string, unknown>) => {
    if (!companyId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from as any)("board_mode_feedback").insert({
      company_id: companyId,
      user_id: user.id,
      insight_id: insightId,
      action,
      metadata: metadata || {},
    });
  }, [companyId]);

  return { log };
}
