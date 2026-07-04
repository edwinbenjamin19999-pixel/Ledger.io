import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { streamAIResponse } from "@/lib/stream-helpers";
import { InvoicePreviewCard, type InvoicePreviewData } from "@/components/ai-ekonom/InvoicePreviewCard";
import { Send, Loader2, Sparkles, User, Paperclip, Camera, X, FileText, Image as ImageIcon, Plus, MessageSquare, Trash2, PenLine, Upload, Zap, BarChart3, CalendarClock, ShieldCheck, Lightbulb, Receipt, FileUp, Wallet, TrendingUp, ArrowRight, CheckCircle2, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { extractImageFilesFromClipboardData, hasClipboardImageData, readClipboardImageFiles } from "@/lib/clipboard-images";
import { cn } from "@/lib/utils";

interface Attachment { id: string; name: string; type: string; base64: string; status: "processing" | "done" | "error"; }
interface Message { id: string; role: "user" | "assistant"; content: string; attachments?: Attachment[]; invoicePreview?: InvoicePreviewData; }
interface Conversation { id: string; title: string; updated_at: string; }

const WELCOME_MSG: Message = { id: "welcome", role: "assistant", content: "" };

const LOADING_TEXTS = [
  "Analyserar dokument...",
  "Identifierar transaktioner...",
  "Förbereder bokföring...",
];

const BOOK_EXAMPLES = [
  "Jag köpte kontorsmaterial för 1 200 kr på Clas Ohlson",
  "Betalade månadens hyra 8 500 kr",
  "Tankade bilen för 850 kr på Circle K",
  "Fick en Telia-faktura på 744 kr",
];

const ASK_EXAMPLES = [
  "Vad har vi för skatteskuld just nu?",
  "Hur mycket har vi i kassan?",
  "Visa kommande skattedeadlines",
  "Gör en snabbrevision av min bokföring",
];

const AI_CAPABILITIES = [
  { icon: Zap, title: "Automatisk bokföring", desc: "Transaktioner till verifikationer direkt" },
  { icon: BarChart3, title: "Finansiella insikter", desc: "Förstå ditt företag i realtid" },
  { icon: CalendarClock, title: "Skatt & deadlines", desc: "Håll koll på deklarationer" },
  { icon: ShieldCheck, title: "Revision & validering", desc: "AI kontrollerar fel och avvikelser" },
  { icon: Lightbulb, title: "Smarta förslag", desc: "Proaktiva rekommendationer" },
];

const RECENT_ACTIVITY = [
  { icon: CheckCircle2, text: "AI kategoriserade 3 transaktioner", time: "2 tim sedan", color: "text-[#085041]" },
  { icon: FileText, text: "Faktura #1247 matchad med betalning", time: "3 tim sedan", color: "text-blue-500" },
  { icon: Clock, text: "Momsdeklaration påminnelse skapad", time: "5 tim sedan", color: "text-[#7A5417]" },
  { icon: AlertTriangle, text: "Ovanlig kostnad upptäckt: 8 500 kr", time: "igår", color: "text-orange-500" },
];

const Assistant = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounter = useRef(0);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotate loading text
  useEffect(() => {
    if (!isLoading) { setLoadingTextIdx(0); return; }
    const interval = setInterval(() => setLoadingTextIdx(i => (i + 1) % LOADING_TEXTS.length), 2200);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  // Resolve active company — react to company-changed events so chatten alltid
  // är personlig för det aktuella bolaget.
  const resolveActiveCompany = useCallback(async () => {
    const stored = getStoredActiveCompanyId();
    if (stored) {
      const { data } = await supabase.from("companies").select("id, name").eq("id", stored).maybeSingle();
      if (data) { setCompany(data); return; }
    }
    const { data } = await supabase.from("companies").select("id, name").order("name").limit(1).maybeSingle();
    setCompany(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    resolveActiveCompany();
    const onChange = () => resolveActiveCompany();
    window.addEventListener("company-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("company-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [user, resolveActiveCompany]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const saveMessages = useCallback(async (msgs: Message[]) => {
    if (!activeConversationId || !user) return;
    const cleanMsgs = msgs.filter(m => m.id !== "welcome").map(m => ({ id: m.id, role: m.role, content: m.content, attachments: m.attachments?.map(a => ({ id: a.id, name: a.name, type: a.type })) }));
    if (cleanMsgs.length === 0) return;
    await supabase.from("ai_conversations").update({ messages: cleanMsgs as any, updated_at: new Date().toISOString() }).eq("id", activeConversationId);
  }, [activeConversationId, user]);

  // When the active company changes, reset chat state and reload its conversations.
  useEffect(() => {
    if (!user || !company?.id) return;
    setActiveConversationId(null);
    setMessages([WELCOME_MSG]);
    setShowSuggestions(true);
    loadConversations(company.id);
  }, [user, company?.id]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveMessages(messages), 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, activeConversationId, saveMessages]);

  const loadConversations = async (companyId?: string) => {
    setIsLoadingConversations(true);
    const cid = companyId ?? company?.id;
    let query = supabase.from("ai_conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(50);
    if (cid) query = query.eq("company_id", cid);
    const { data } = await query;
    setConversations((data || []) as Conversation[]);
    setIsLoadingConversations(false);
  };

  const createNewConversation = async () => {
    if (!user) return;
    if (activeConversationId) await saveMessages(messages);
    const { data, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, company_id: company?.id || null, title: "Ny konversation", messages: [] }).select("id, title, updated_at").maybeSingle();
    if (error || !data) { toast.error("Kunde inte skapa konversation"); return; }
    const conv = data as unknown as Conversation;
    setConversations(prev => [{ id: conv.id, title: conv.title, updated_at: conv.updated_at }, ...prev]);
    setActiveConversationId(conv.id);
    setMessages([WELCOME_MSG]);
    setShowSuggestions(true);
    setInput("");
    setPendingAttachments([]);
  };

  const loadConversation = async (convId: string) => {
    if (activeConversationId === convId) return;
    if (activeConversationId) await saveMessages(messages);
    const { data } = await supabase.from("ai_conversations").select("messages").eq("id", convId).maybeSingle();
    const msgs = ((data as Record<string, unknown>)?.messages || []) as any[];
    setActiveConversationId(convId);
    setMessages(msgs.length > 0 ? [WELCOME_MSG, ...msgs.map((m: any) => ({ ...m, attachments: m.attachments || [] }))] : [WELCOME_MSG]);
    setShowSuggestions(msgs.length === 0);
    setInput("");
    setPendingAttachments([]);
  };

  const deleteConversation = async (convId: string) => {
    if (!confirm("Vill du ta bort denna konversation?")) return;
    await supabase.from("ai_conversations").delete().eq("id", convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversationId === convId) { setActiveConversationId(null); setMessages([WELCOME_MSG]); setShowSuggestions(true); }
  };

  const renameConversation = async (convId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    await supabase.from("ai_conversations").update({ title: newTitle.trim() }).eq("id", convId);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: newTitle.trim() } : c));
    setEditingTitle(null);
  };

  const autoTitle = async (convId: string, firstMsg: string) => {
    const title = firstMsg.slice(0, 60) + (firstMsg.length > 60 ? "..." : "");
    await supabase.from("ai_conversations").update({ title }).eq("id", convId);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
  };

  const mkId = () => { try { return crypto.randomUUID(); } catch { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }); } };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); });

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 5)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} är för stor (max 10 MB)`); continue; }
      const att: Attachment = { id: mkId(), name: file.name, type: file.type, base64: "", status: "processing" };
      setPendingAttachments(prev => [...prev, att]);
      try { const base64 = await fileToBase64(file); setPendingAttachments(prev => prev.map(a => a.id === att.id ? { ...a, base64, status: "done" } : a)); }
      catch { setPendingAttachments(prev => prev.map(a => a.id === att.id ? { ...a, status: "error" } : a)); toast.error(`Kunde inte läsa ${file.name}`); }
    }
  };

  const handleImagePaste = async (clipboardData?: DataTransfer | null) => { const imageFiles = extractImageFilesFromClipboardData(clipboardData); if (imageFiles.length === 0) return false; await handleFiles(imageFiles); return true; };
  const pasteFromClipboard = async () => { try { const imageFiles = await readClipboardImageFiles(); if (imageFiles.length === 0) { toast.error("Ingen bild hittades i urklipp."); return; } await handleFiles(imageFiles); } catch { toast.error("Kunde inte läsa urklipp."); } };
  const removeAttachment = (id: string) => setPendingAttachments(prev => prev.filter(a => a.id !== id));

  const isSelfFixableAssistantMessage = (message: Message) =>
    message.role === "assistant" && /Kunde inte skapa|Något gick fel|Försök igen|schema cache|slutade svara|tog för lång tid|Could not find/i.test(message.content);

  const submitMessage = async (content: string, attachments: Attachment[] = [], options: { clearComposer?: boolean } = {}) => {
    if ((!content.trim() && attachments.length === 0) || isLoading) return;
    let convId = activeConversationId;
    if (!convId && user) {
      const { data, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, company_id: company?.id || null, title: content.slice(0, 60) || "Ny konversation", messages: [] }).select("id, title, updated_at").maybeSingle();
      if (!error && data) { const conv = data as unknown as Conversation; convId = conv.id; setActiveConversationId(conv.id); setConversations(prev => [{ id: conv.id, title: conv.title, updated_at: conv.updated_at }, ...prev]); }
    }
    const userMsg: Message = { id: mkId(), role: "user", content, attachments: attachments.length > 0 ? attachments : undefined };
    setMessages(prev => [...prev, userMsg]);
    if (options.clearComposer) {
      setInput("");
      setPendingAttachments([]);
    }
    setIsLoading(true);
    setShowSuggestions(false);
    const nonWelcomeMsgs = messages.filter(m => m.id !== "welcome");
    if (nonWelcomeMsgs.length === 0 && convId) autoTitle(convId, content);
    const assistantId = mkId();
    let fullText = "";
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-stream`;
      const filePayload = attachments.map(a => ({ name: a.name, mimeType: a.type, base64: a.base64 }));
      await streamAIResponse(url, { messages: [...messages, userMsg].filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content })), companyId: company?.id, attachments: filePayload.length > 0 ? filePayload : undefined }, {
        onDelta: (text) => { fullText += text; setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)); },
        onInvoicePreview: (preview) => { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, invoicePreview: preview as InvoicePreviewData } : m)); },
        onDone: () => {
          setIsLoading(false);
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content.trim() ? m.content : "Jag fick inget textsvar från AI:n. Försök igen med en kortare fråga." } : m));
        },
        onError: (err) => { toast.error(err); setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Något gick fel. Försök igen!" } : m)); setIsLoading(false); },
      });
    } catch { toast.error("Kunde inte få svar"); setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Något gick fel." } : m)); setIsLoading(false); }
  };

  const sendMessage = async () => {
    const attachments = pendingAttachments.filter(a => a.status === "done");
    await submitMessage(input, attachments, { clearComposer: true });
  };

  const selfFixMessage = async (assistantMessageId: string) => {
    const assistantIndex = messages.findIndex(m => m.id === assistantMessageId);
    const previousUserMessage = messages.slice(0, assistantIndex).reverse().find(m => m.role === "user" && m.content.trim());
    if (!previousUserMessage) { toast.error("Hittade inget tidigare meddelande att försöka igen med"); return; }
    await submitMessage(`Självfixa och försök igen:\n${previousUserMessage.content}`, [], { clearComposer: false });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  // Drag and drop
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer.types.includes("Files")) setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounter.current = 0; if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr); const now = new Date(); const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Idag"; if (diffDays === 1) return "Igår"; if (diffDays < 7) return `${diffDays} dagar sedan`;
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  };

  const grouped = conversations.reduce<{ label: string; items: Conversation[] }[]>((acc, c) => {
    const label = formatDate(c.updated_at); const existing = acc.find(g => g.label === label);
    if (existing) existing.items.push(c); else acc.push({ label, items: [c] }); return acc;
  }, []);

  const showHero = showSuggestions && messages.length <= 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 relative overflow-hidden">
      {/* Subtle background depth blobs */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-[#3b82f6]/[0.02] rounded-full blur-3xl pointer-events-none" />

      <main className="container mx-auto px-4 py-6 max-w-[1400px] relative z-10">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Assistant</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Din AI-bokförare, analytiker och automationsmotor</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E1F5EE] border border-[#BFE6D6]">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </div>
            <span className="text-xs font-medium text-[#085041] dark:text-[#1D9E75]">AI Redo</span>
          </div>
        </div>

        {/* ── AI Capabilities Strip ── */}
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 min-w-max md:grid md:grid-cols-5 md:min-w-0">
            {AI_CAPABILITIES.map((cap) => (
              <div key={cap.title} className="relative flex items-start gap-3 px-4 py-3 rounded-[12px] border-[0.5px] border-[#DFE4EA] bg-[#FAFBFC] min-w-[200px] md:min-w-0 hover:shadow-sm transition-all duration-200 overflow-hidden">
                <span className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#0040CC]" />
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                  <cap.icon size={16} strokeWidth={1.5} color="#0040CC" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#0F172A] truncate">{cap.title}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-[2px] leading-snug">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 h-[calc(100vh-14rem)]">

          {/* ── Conversation Sidebar ── */}
          <div className="w-[320px] min-w-[300px] max-w-[340px] flex-shrink-0 hidden md:flex flex-col rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="p-3 border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent">
              <Button onClick={createNewConversation} size="sm" className="w-full gap-2 bg-[#0040CC] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium">
                <Plus className="w-4 h-4" />
                Ny konversation
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 px-3">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Inga konversationer ännu</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Skriv ett meddelande för att starta</p>
                  </div>
                ) : (
                  grouped.map(group => (
                    <div key={group.label}>
                      <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium px-3 py-2 mt-3 mb-1">{group.label}</div>
                      {group.items.map(conv => (
                        <div
                          key={conv.id}
                          className={cn(
                            "group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150",
                            activeConversationId === conv.id
                              ? "bg-primary/8 text-foreground border-l-2 border-l-primary"
                              : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                          )}
                          onClick={() => loadConversation(conv.id)}
                        >
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                          {editingTitle === conv.id ? (
                            <input autoFocus className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm outline-none" value={editTitleValue}
                              onChange={e => setEditTitleValue(e.target.value)}
                              onBlur={() => renameConversation(conv.id, editTitleValue)}
                              onKeyDown={e => { if (e.key === "Enter") renameConversation(conv.id, editTitleValue); if (e.key === "Escape") setEditingTitle(null); }}
                              onClick={e => e.stopPropagation()} />
                          ) : (
                            <span className="text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0" title={conv.title}>{conv.title}</span>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-foreground" onClick={e => { e.stopPropagation(); setEditingTitle(conv.id); setEditTitleValue(conv.title); }} title="Byt namn"><PenLine className="w-3.5 h-3.5" /></button>
                            <button className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500" onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }} title="Radera"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ── Chat Area ── */}
          <div
            className="flex-1 flex flex-col rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm relative overflow-hidden"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-primary/5 backdrop-blur-sm border-2 border-dashed border-primary/40 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-float">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Släpp filer här</p>
                <p className="text-xs text-muted-foreground">PDF, bilder, kvitton eller fakturor</p>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="space-y-6 max-w-3xl mx-auto">

                {/* Hero card — shown when no conversation started */}
                {showHero && (
                  <div className="flex flex-col items-center pt-4 pb-4 animate-fade-in">
                    {/* AI Avatar */}
                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-[ai-glow_3s_ease-in-out_infinite]" style={{ margin: "-6px" }} />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                        <Sparkles className="w-8 h-8 text-primary-foreground" />
                      </div>
                    </div>

                    {/* Glassmorphism hero card */}
                    <div className="w-full max-w-2xl rounded-2xl border border-border/30 bg-gradient-to-b from-card/90 to-card/50 backdrop-blur-md p-6 shadow-lg text-center space-y-4">
                      <h2 className="text-xl font-bold text-foreground">Din AI-bokförare är redo</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Beskriv vad som hänt — inga konton, inga manuella steg, ingen förvirring.
                      </p>

                      {/* Examples — Bokför */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">⚡ Bokför direkt</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {BOOK_EXAMPLES.map(q => (
                            <button key={q} onClick={() => { setInput(q); setShowSuggestions(false); textareaRef.current?.focus(); }}
                              className="bg-[#EFF6FF] text-[#0C447C] border-[0.5px] border-[#85B7EB] rounded-full text-[11px] px-[10px] py-[4px] cursor-pointer hover:bg-[#E6F0FD] transition-colors">
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Examples — Fråga */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">📊 Fråga & analysera</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {ASK_EXAMPLES.map(q => (
                            <button key={q} onClick={() => { setInput(q); setShowSuggestions(false); textareaRef.current?.focus(); }}
                              className="bg-[#EFF6FF] text-[#0C447C] border-[0.5px] border-[#85B7EB] rounded-full text-[11px] px-[10px] py-[4px] cursor-pointer hover:bg-[#E6F0FD] transition-colors">
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground/70 pt-1">
                        Du kan också bifoga kvitton, fakturor eller dokument 📎
                      </p>
                    </div>

                    {/* ── Quick Action Bar ── */}
                    <div className="w-full max-w-2xl mt-4 space-y-2">
                      {/* Primary AI Action */}
                      <button onClick={() => { textareaRef.current?.focus(); }} className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-[12px] bg-white border-[0.5px] border-[#E2E8F0] hover:bg-[#F8FAFB] hover:border-[#CBD5E1] transition-all duration-200 group">
                        <Sparkles size={16} strokeWidth={1.5} color="#0040CC" className="group-hover:scale-110 transition-transform" />
                        <span className="text-[12px] font-medium text-[#0F172A]">Fråga AI</span>
                      </button>
                      {/* Secondary actions */}
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border/30 bg-transparent hover:bg-[#EFF6FF] hover:border-[#C8DDF5] transition-all duration-150 group">
                          <Receipt className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#3b82f6] dark:group-hover:text-[#1E3A5F] transition-colors" />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Kvitto</span>
                        </button>
                        <button onClick={() => { setInput("Skapa en faktura"); textareaRef.current?.focus(); }} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border/30 bg-transparent hover:bg-[#EFF6FF] hover:border-[#C8DDF5] transition-all duration-150 group">
                          <FileUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#3b82f6] dark:group-hover:text-[#1E3A5F] transition-colors" />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Faktura</span>
                        </button>
                        <button onClick={() => { setInput("Registrera ett utlägg"); textareaRef.current?.focus(); }} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border/30 bg-transparent hover:bg-[#EFF6FF] hover:border-[#C8DDF5] transition-all duration-150 group">
                          <Wallet className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#3b82f6] dark:group-hover:text-[#1E3A5F] transition-colors" />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Utlägg</span>
                        </button>
                      </div>
                    </div>

                    {/* ── Recent AI Activity + Insight Widget ── */}
                    <div className="w-full max-w-2xl mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Activity Feed */}
                      <div className="sm:col-span-2 rounded-xl border border-border/30 bg-card/70 backdrop-blur-sm p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Senaste AI-aktivitet</p>
                        </div>
                        <div className="space-y-2.5">
                          {RECENT_ACTIVITY.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 group cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-1 rounded-lg transition-colors">
                              <item.icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", item.color)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground truncate">{item.text}</p>
                                <p className="text-[10px] text-muted-foreground/60">{item.time}</p>
                              </div>
                              <ArrowRight className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Insight Widget */}
                      <div className="rounded-xl border border-border/30 bg-gradient-to-b from-card/80 to-card/50 backdrop-blur-sm p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Denna månad</p>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-lg font-bold text-foreground">+12%</p>
                              <p className="text-[11px] text-muted-foreground">Intäkter vs förra mån</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-foreground">Stabila</p>
                              <p className="text-[11px] text-muted-foreground">Kostnader</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/20">
                          <p className="text-[10px] text-muted-foreground/60">AI-genererad sammanfattning</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat messages (skip the empty welcome) */}
                {messages.filter(m => m.id !== "welcome" || !showHero).map((message) => {
                  if (message.id === "welcome" && showHero) return null;
                  if (message.id === "welcome") return null;

                  return (
                    <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                      {message.role === "assistant" && (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-md mt-1">
                          <Sparkles className="w-5 h-5 text-primary-foreground" />
                        </div>
                      )}
                      <div className={cn(
                        "rounded-2xl",
                        message.role === "user"
                          ? "max-w-[70%] bg-primary text-primary-foreground px-4 py-3 rounded-br-md shadow-md"
                          : "max-w-[90%] bg-gradient-to-b from-card to-card/80 border border-border/40 rounded-bl-md px-5 py-4 shadow-sm"
                      )}>
                        {message.role === "assistant" ? (
                          <>
                            <div className="prose prose-sm dark:prose-invert max-w-none
                              prose-headings:text-foreground prose-headings:font-semibold
                              prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h2:pb-1 prose-h2:border-b prose-h2:border-border/50
                              prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1.5
                              prose-p:text-[13px] prose-p:leading-relaxed prose-p:my-1.5
                              prose-li:text-[13px] prose-li:leading-relaxed prose-li:my-0.5
                              prose-ul:my-2 prose-ol:my-2
                              prose-strong:text-foreground prose-strong:font-semibold
                              prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-[13px]
                              prose-table:text-[12px] prose-th:text-left prose-th:font-semibold prose-th:py-1.5 prose-th:px-3 prose-th:bg-muted/50 prose-td:py-1.5 prose-td:px-3 prose-td:border-t prose-td:border-border/30
                              prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-normal
                              prose-hr:my-4 prose-hr:border-border/30
                            ">
                              <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                            </div>
                            {isSelfFixableAssistantMessage(message) && (
                              <button
                                type="button"
                                onClick={() => selfFixMessage(message.id)}
                                disabled={isLoading}
                                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                                Självfixa och försök igen
                              </button>
                            )}
                            {message.invoicePreview && (
                              <InvoicePreviewCard data={message.invoicePreview} companyId={company?.id || null} />
                            )}
                          </>
                        ) : (
                          <div>
                            {message.content && <p className="whitespace-pre-wrap text-sm">{message.content}</p>}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {message.attachments.map(att => (
                                  <div key={att.id} className="flex items-center gap-1.5 px-2 py-1 bg-primary-foreground/20 rounded text-xs">
                                    {att.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                    <span className="truncate max-w-[120px]">{att.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {message.role === "user" && (
                        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Premium loading state */}
                {isLoading && messages[messages.length - 1]?.content === "" && (
                  <div className="flex gap-3 justify-start animate-fade-in">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Sparkles className="w-5 h-5 text-primary-foreground animate-[ai-glow_2s_ease-in-out_infinite]" />
                    </div>
                    <div className="bg-gradient-to-b from-card to-card/80 border border-border/40 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-[dot-wave_1.4s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.16}s` }} />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground transition-all duration-300">{LOADING_TEXTS[loadingTextIdx]}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Premium Input Bar ── */}
            <div className="p-4 border-t border-border/30 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm">
              <div className="max-w-3xl mx-auto">
                {/* Attachment chips */}
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pendingAttachments.map(att => (
                      <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border border-border/30 rounded-full text-sm backdrop-blur-sm">
                        {att.type.startsWith("image/") ? <ImageIcon className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                        <span className="truncate max-w-[120px] text-xs">{att.name}</span>
                        {att.status === "processing" ? <Loader2 className="w-3 h-3 animate-spin" /> :
                          att.status === "done" ? <button onClick={() => removeAttachment(att.id)} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button> :
                            <span className="text-destructive text-xs">Fel</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Input container */}
                <div className="rounded-2xl border border-border/40 bg-card shadow-lg focus-within:ring-2 focus-within:ring-[#3b82f6]/20 focus-within:border-[#C8DDF5] focus-within:shadow-[0_0_20px_rgba(0,198,255,0.08)] transition-all duration-200">
                  <div className="flex items-end gap-2 p-2">
                    <div className="flex items-center pb-1.5 pl-1">
                      <Sparkles className="w-4 h-4 text-primary/40" />
                    </div>

                    <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.doc,.docx" onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }} />
                    <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }} />

                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      onPaste={async (e) => { if (hasClipboardImageData(e.nativeEvent.clipboardData)) { e.preventDefault(); await handleImagePaste(e.nativeEvent.clipboardData); } }}
                      placeholder="Beskriv en transaktion eller fråga vad som helst..."
                      className="flex-1 min-h-[44px] max-h-32 resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60 py-2 px-1 leading-relaxed"
                      rows={1}
                    />

                    <div className="flex items-center gap-1 pb-1">
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all" title="Bifoga fil">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button onClick={pasteFromClipboard} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all hidden sm:flex" title="Klistra in bild">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => cameraInputRef.current?.click()} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all sm:hidden" title="Ta foto">
                        <Camera className="w-4 h-4" />
                      </button>

                      <button
                        onClick={sendMessage}
                        disabled={isLoading || (!input.trim() && pendingAttachments.length === 0)}
                        className={cn(
                          "w-9 h-9 rounded-[8px] flex items-center justify-center transition-all duration-200",
                          isLoading || (!input.trim() && pendingAttachments.length === 0)
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-[#0040CC] hover:bg-[#1074A0] text-[#E6F4FA] shadow-sm hover:shadow-md"
                        )}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-[11px] text-muted-foreground/50">
                    Skriv, klistra in, eller släpp filer — AI hanterar resten
                  </p>
                  <p className="text-[11px] text-muted-foreground/40 hidden sm:block">
                    Tryck Enter för att skicka
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Assistant;
