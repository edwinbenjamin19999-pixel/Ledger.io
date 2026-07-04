import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAIEkonom, type ChatTurn } from "@/hooks/useAIEkonom";
import { ConversationStream } from "@/components/ai-ekonom/ConversationStream";
import { PrimaryInput } from "@/components/ai-ekonom/PrimaryInput";
import { WorkspaceHeader, type ConversationListItem } from "@/components/ai-ekonom/workspace/WorkspaceHeader";
import { WelcomeState } from "@/components/ai-ekonom/workspace/WelcomeState";
import { ContextRail } from "@/components/ai-ekonom/workspace/ContextRail";
import { Sparkles } from "lucide-react";

const titleFromMessage = (msg: string) => {
  const t = msg.trim().replace(/\s+/g, " ");
  if (t.length <= 60) return t;
  return t.slice(0, 57) + "…";
};

const AIEkonomPage = () => {
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const { turns, send, retry, loading, setTurns } = useAIEkonom(companyId);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasBank, setHasBank] = useState<boolean>(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const initialTurnsRef = useRef<ChatTurn[] | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const sb = supabase as any;
    const { data } = await sb
      .from("ai_conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    setConversations((data || []) as ConversationListItem[]);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Detect bank connection
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const sb = supabase as any;
        const { count } = await sb
          .from("bank_transactions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .limit(1);
        if (!cancelled) setHasBank((count ?? 0) > 0);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  // Persist turns to ai_conversations (debounced)
  useEffect(() => {
    if (turns.length === 0) return;
    // skip persistence right after we hydrated from history
    if (initialTurnsRef.current === turns) return;
    if (loading) return; // wait until streaming completes
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const sb = supabase as any;
        const firstUser = turns.find((t) => t.role === "user");
        const title = firstUser ? titleFromMessage(firstUser.text) : "Ny konversation";
        const payload = {
          user_id: user.id,
          company_id: companyId,
          title,
          messages: turns,
          updated_at: new Date().toISOString(),
        };
        if (activeId) {
          await sb.from("ai_conversations").update(payload).eq("id", activeId);
        } else {
          const { data, error } = await sb.from("ai_conversations").insert(payload).select("id").single();
          if (!error && data?.id) setActiveId(data.id as string);
        }
        loadConversations();
      } catch (e) {
        console.error("[AIEkonom] persist error", e);
      }
    }, 800);
    return () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current); };
  }, [turns, loading, activeId, companyId, loadConversations]);

  const handleNew = () => {
    setActiveId(null);
    initialTurnsRef.current = null;
    setTurns([]);
    setRefreshTick((t) => t + 1);
  };

  const handleSelect = async (id: string) => {
    if (id === activeId) return;
    try {
      const sb = supabase as any;
      const { data } = await sb.from("ai_conversations").select("id, messages").eq("id", id).maybeSingle();
      if (!data) return;
      const msgs = (data.messages || []) as ChatTurn[];
      setActiveId(id);
      setTurns(msgs);
      // Mark these turns as hydrated to skip immediate persist
      initialTurnsRef.current = msgs;
    } catch (e) {
      console.error("[AIEkonom] select error", e);
    }
  };

  const handleRename = async (id: string, title: string) => {
    const sb = supabase as any;
    await sb.from("ai_conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", id);
    loadConversations();
  };

  const handleDelete = async (id: string) => {
    const sb = supabase as any;
    await sb.from("ai_conversations").delete().eq("id", id);
    if (activeId === id) handleNew();
    loadConversations();
  };

  const onPickPrompt = (q: string) => {
    if (!loading) send(q);
  };

  const openVoucher = (id: string) => navigate(`/verifikationer?entry=${id}`);

  // Mobile context rail toggle
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <WorkspaceHeader
        conversations={conversations}
        activeId={activeId}
        onNew={handleNew}
        onSelect={handleSelect}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      <div className="flex-1 flex min-h-0">
        {/* LEFT — conversation thread (70%) */}
        <main className="flex-1 flex flex-col min-w-0">
          {turns.length === 0 ? (
            <div className="flex-1 flex flex-col">
              <WelcomeState
                onPick={onPickPrompt}
                hasBank={hasBank}
                onConnectBank={() => navigate("/bankintegration")}
                onUploadSie={() => navigate("/migration")}
              />
              <PrimaryInput
                onSend={send}
                onFiles={async () => { /* file upload handled elsewhere */ }}
                loading={loading}
                placeholder="Skriv din fråga eller välj ett förslag ovan..."
              />
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ConversationStream
                  turns={turns}
                  loading={loading}
                  onPickAction={send}
                  onOpenVoucher={openVoucher}
                  onRetry={retry}
                />
              </div>
              <PrimaryInput
                onSend={send}
                onFiles={async () => {}}
                loading={loading}
                placeholder="Ställ en följdfråga eller be mig agera…"
              />
            </>
          )}
        </main>

        {/* RIGHT — context rail (desktop) */}
        <ContextRail
          companyId={companyId}
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          refreshTick={refreshTick}
        />

        {/* Mobile floating button */}
        <button
          onClick={() => setMobileRailOpen(true)}
          className="lg:hidden fixed bottom-24 right-4 w-12 h-12 rounded-full bg-[#3b82f6] text-white shadow-lg flex items-center justify-center z-40"
          aria-label="Öppna kontextpanel"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {mobileRailOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMobileRailOpen(false)}>
            <div
              className="absolute right-0 top-0 bottom-0 w-[85%] max-w-[360px] bg-background flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-[14px] font-semibold">Kontext</h2>
                <button
                  onClick={() => setMobileRailOpen(false)}
                  className="text-[13px] text-muted-foreground hover:text-foreground"
                >Stäng</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ContextRail
                  companyId={companyId}
                  conversations={conversations}
                  activeId={activeId}
                  onSelect={(id) => { handleSelect(id); setMobileRailOpen(false); }}
                  refreshTick={refreshTick}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEkonomPage;
