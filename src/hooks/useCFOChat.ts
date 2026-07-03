import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CFOContextPayload } from "./useCFOContext";

export interface CFOStructured {
  summary: string;
  interpretation: string;
  risk_or_opportunity: { kind: "risk" | "opportunity" | "neutral"; severity?: "critical" | "high" | "medium" | "low"; text: string };
  recommendation: string;
  suggested_actions: Array<{ label: string; action_type: string; payload?: Record<string, unknown> }>;
  confidence: number;
}

export interface CFOMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  structured: CFOStructured | null;
  created_at: string;
}

export function useCFOChat(conversationId: string | null) {
  const [messages, setMessages] = useState<CFOMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId);

  useEffect(() => { setActiveConvId(conversationId); }, [conversationId]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("cfo_conversation_messages")
      .select("id, role, content, structured, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data || []) as unknown as CFOMessage[]);
  }, []);

  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    loadMessages(activeConvId);
    const ch = supabase
      .channel(`cfo-msgs-${activeConvId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "cfo_conversation_messages", filter: `conversation_id=eq.${activeConvId}` },
        () => loadMessages(activeConvId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeConvId, loadMessages]);

  const send = useCallback(async (
    companyId: string,
    message: string,
    contextPayload?: CFOContextPayload,
  ): Promise<string | null> => {
    if (!companyId || !message.trim()) return null;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("cfo-chat", {
        body: {
          company_id: companyId,
          conversation_id: activeConvId,
          message,
          context_payload: contextPayload,
        },
      });
      if (error) throw error;
      const newConvId = data?.conversation_id as string | undefined;
      if (newConvId && newConvId !== activeConvId) setActiveConvId(newConvId);
      else if (activeConvId) await loadMessages(activeConvId);
      return newConvId || null;
    } catch (e) {
      const msg = (e as Error).message || "Något gick fel";
      toast.error("AI CFO svarade inte", { description: msg });
      return null;
    } finally {
      setSending(false);
    }
  }, [activeConvId, loadMessages]);

  return { messages, sending, send, conversationId: activeConvId };
}
