import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CFOContextType } from "./useCFOContext";

export interface CFOConversation {
  id: string;
  title: string;
  context_type: CFOContextType;
  context_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useCFOConversations(companyId?: string | null) {
  const [conversations, setConversations] = useState<CFOConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    const { data } = await supabase
      .from("cfo_conversations")
      .select("id, title, context_type, context_payload, created_at, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(20);
    setConversations((data || []) as CFOConversation[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`cfo-conv-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cfo_conversations", filter: `company_id=eq.${companyId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, refresh]);

  return { conversations, loading, refresh };
}
