import { useState, useRef, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { streamAIResponse } from "@/lib/stream-helpers";
import { getModuleContext } from "@/config/moduleContexts";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { parseCommand, InvoiceData, ExpenseData } from "@/lib/mobile/commandParser";
import { formatSEK } from "@/lib/formatNumber";
import { Send, Mic, Paperclip, Camera, Loader2, Sparkles, FileText, CheckCircle, Receipt, ArrowLeft, ArrowDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MobileVoiceOverlay } from "../MobileVoiceOverlay";
import { JournalEntryCard, extractJournalEntry } from "../chat/JournalEntryCard";


interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  card?: { type: "invoice" | "expense"; data: InvoiceData | ExpenseData };
  createdAt?: number;
}

const mkId = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

// Suggested prompts shown as chips when thread is empty.
// Tapping fills the input field — does not auto-send.
const SUGGESTED_PROMPTS = [
  "Visa förfallna fakturor",
  "Sammanfatta månaden",
  "Skapa faktura till kund",
  "Vad ska jag betala denna vecka?",
  "Visa kommande deadlines",
];

/* ── Invoice Preview Card ── */
function InvoicePreviewCard({ data }: { data: InvoiceData }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const netto = data.amount ?? 0;
  const moms = netto * data.vatRate;
  const total = netto + moms;

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      toast.success(`Faktura ${data.invoiceNumber} skickad till ${data.customer || "kund"} ✓`);
    }, 1500);
  };

  if (sent) {
    return (
      <div className="bg-emerald-950 border border-emerald-800 rounded-2xl p-5 text-center">
        <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
        <p className="text-emerald-200 font-semibold">Faktura {data.invoiceNumber} skickad!</p>
        <p className="text-emerald-400/60 text-xs mt-1">{data.customer}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 rounded-xl p-2">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Faktura redo</p>
              <p className="text-slate-400 text-xs">{data.invoiceNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs">Förfallodatum</p>
            <p className="text-slate-300 text-xs font-medium">{data.dueDate} (+30 dagar)</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Customer */}
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Kund</p>
          <p className="text-white font-medium text-sm">{data.customer || "—"}</p>
        </div>

        {/* Line item */}
        <div className="bg-slate-800/50 rounded-xl p-3">
          <p className="text-slate-300 text-sm mb-1">{data.description || "Konsulttjänster"}</p>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">
              {data.hours ? `${data.hours} h × ${formatSEK(data.hourlyRate ?? 0)}/h` : "1 st"}
            </span>
            <span className="text-white font-semibold text-sm">{formatSEK(netto)}</span>
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Netto</span>
            <span className="text-slate-300">{formatSEK(netto)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Moms (25%)</span>
            <span className="text-slate-300">{formatSEK(moms)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-700">
            <span className="text-white">Totalt att betala</span>
            <span className="text-emerald-400 text-base">{formatSEK(total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
        <button className="flex-1 bg-slate-800 text-slate-300 rounded-xl py-3 text-sm font-semibold min-h-[52px] active:scale-95 transition-transform border border-slate-700">
          Redigera
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[52px] active:scale-95 transition-transform flex items-center justify-center gap-1"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Skicka faktura →</>}
        </button>
      </div>
    </div>
  );
}

/* ── Expense Card ── */
function ExpensePreviewCard({ data, companyId, userId }: { data: ExpenseData; companyId?: string; userId: string }) {
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState<string>(data.amount ? String(data.amount) : "");
  const [savedId, setSavedId] = useState<string | null>(null);

  const numericAmount = parseFloat(amount.replace(",", ".")) || 0;
  const canSave = numericAmount > 0 && !!companyId;

  const handleApprove = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data: row, error } = await supabase
        .from("expense_claims")
        .insert({
          company_id: companyId!,
          user_id: userId,
          amount: numericAmount,
          category: data.category || "Övrigt",
          description: data.description || "Utlägg via mobil-AI",
          expense_date: new Date().toISOString().slice(0, 10),
          status: "pending_approval",
          payment_method: "employee",
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      setSavedId(row?.id || null);
      setApproved(true);
      toast.success("Utlägg sparat — väntar på godkännande", {
        description: `${data.category} • ${formatSEK(numericAmount)}`,
      });
    } catch (e: any) {
      toast.error("Kunde inte spara utlägg", { description: e?.message || "Försök igen" });
    } finally {
      setSaving(false);
    }
  };

  if (approved) {
    return (
      <div className="bg-emerald-950 border border-emerald-800 rounded-2xl p-5 text-center">
        <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
        <p className="text-emerald-200 font-semibold">Utlägg sparat</p>
        <p className="text-emerald-400/60 text-xs mt-1">{data.category} — {formatSEK(numericAmount)}</p>
        {savedId && (
          <a
            href={`/expenses?id=${savedId}`}
            className="inline-block mt-3 text-emerald-300 text-xs font-medium underline"
          >
            Öppna i Utlägg →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 rounded-xl p-2">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Förslag på utlägg</p>
            <p className="text-slate-400 text-xs">{data.date} • Inget är sparat ännu</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Kategori</p>
          <p className="text-white font-medium text-sm">{data.category}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Belopp (kr)</p>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ange belopp i kr"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={handleApprove}
          disabled={!canSave || saving}
          className="w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold min-h-[52px] active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Godkänn & registrera"}
        </button>
        {!companyId && (
          <p className="text-amber-400 text-xs text-center">Inget bolag valt — välj bolag i toppmenyn först.</p>
        )}
      </div>
    </div>
  );
}

/* ── Waveform Animation ── */
function WaveformBars() {
  return (
    <div className="flex items-end justify-center gap-[3px] h-8 px-4">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-indigo-500"
          style={{
            animation: `waveform 1s ease-in-out ${i * 0.05}s infinite alternate`,
            height: `${8 + Math.random() * 20}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          0% { height: 6px; opacity: 0.4; }
          100% { height: 28px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Main Chat Component ── */
export const MobileChat = ({ user, initialMessage, onInitialMessageConsumed, onBack }: { user: User; initialMessage?: string | null; onInitialMessageConsumed?: () => void; onBack?: () => void }) => {
  const [companyId, setCompanyId] = useState<string | undefined>(getStoredActiveCompanyId() || undefined);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", content: "Hej! Jag laddar ditt bolag..." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [pressedTimestampId, setPressedTimestampId] = useState<string | null>(null);
  const isAtBottomRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ctx = getModuleContext("/dashboard");

  // Auto-resolve user's company — reactive to company-changed events from
  // the mobile top bar's company switcher so the chat is always personal to
  // the active bolag.
  useEffect(() => {
    let cancelled = false;
    const resolveCompany = async () => {
      const stored = getStoredActiveCompanyId();
      if (stored) {
        const { data } = await supabase.from("companies").select("id, name").eq("id", stored).maybeSingle();
        if (!cancelled && data) {
          setCompanyId(data.id);
          setCompanyName(data.name);
          return;
        }
      }
      const { data } = await supabase.from("companies").select("id, name").order("name").limit(1).maybeSingle();
      if (cancelled) return;
      if (data) {
        setCompanyId(data.id);
        setCompanyName(data.name);
        try { localStorage.setItem("dashboard:selectedCompanyId", data.id); } catch {}
      } else {
        setCompanyId(null);
        setCompanyName(null);
      }
    };
    resolveCompany();
    const onChange = () => resolveCompany();
    window.addEventListener("company-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("company-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [user.id]);

  const userMsgCount = messages.filter(m => m.role === "user").length;

  const scrollBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
      isAtBottomRef.current = true;
      setShowNewActivity(false);
    }, 50);
  }, []);

  // Auto-scroll only if the user was already at the bottom (don't yank
  // them away if they're scrolled up reading older history).
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollBottom();
    } else {
      setShowNewActivity(true);
    }
  }, [messages, scrollBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    isAtBottomRef.current = atBottom;
    if (atBottom) setShowNewActivity(false);
  }, []);

  // Auto-grow the textarea up to ~4 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 24 * 4 + 24; // ~4 lines + padding
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [input]);

  // Load latest conversation FOR THE ACTIVE COMPANY. Re-runs whenever the
  // user switches company so each bolag har sin egen chatthistorik & kontext.
  useEffect(() => {
    if (!companyId) {
      setConversationId(null);
      setMessages([{ id: "welcome", role: "assistant", content: "Hej! Inget bolag är aktivt. Välj bolag i toppen för att börja." }]);
      return;
    }
    let cancelled = false;
    (async () => {
      const welcome: Msg = {
        id: "welcome",
        role: "assistant",
        content: companyName
          ? `Hej! Jag är inloggad som **${companyName}** och har full insyn i fakturor, bank, moms, utlägg och uppladdade underlag. Fråga vad som helst.`
          : "Hej! Jag är din AI-assistent.",
      };
      const { data } = await supabase
        .from("ai_conversations")
        .select("id, messages")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data?.id && Array.isArray(data.messages) && (data.messages as any[]).length > 0) {
        setConversationId(data.id);
        const stored = (data.messages as any[]).map((m: any) => ({
          id: m.id || mkId(),
          role: m.role as "user" | "assistant",
          content: m.content || "",
        }));
        setMessages([welcome, ...stored]);
      } else {
        setConversationId(null);
        setMessages([welcome]);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id, companyId, companyName]);

  // Auto-send initial message from AI insights
  const initialMessageSentRef = useRef(false);
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current && !streaming) {
      initialMessageSentRef.current = true;
      onInitialMessageConsumed?.();
      setTimeout(() => sendText(initialMessage), 300);
    }
  }, [initialMessage]);

  // Persist messages to database
  const persistMessages = useCallback(async (msgs: Msg[], convId: string | null, firstUserMsg?: string) => {
    const toSave = msgs
      .filter(m => m.id !== "welcome" && m.content)
      .map(m => ({ role: m.role, content: m.content }));
    if (toSave.length === 0) return convId;

    if (convId) {
      await supabase.from("ai_conversations").update({
        messages: toSave as any,
        updated_at: new Date().toISOString(),
      }).eq("id", convId);
      return convId;
    } else {
      const title = (firstUserMsg || "Mobilkonversation").slice(0, 60);
      const { data } = await supabase.from("ai_conversations").insert({
        user_id: user.id,
        company_id: companyId || null,
        title,
        messages: toSave as any,
      }).select("id").maybeSingle();
      return data?.id || null;
    }
  }, [user.id, companyId]);

  const sendText = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Msg = { id: mkId(), role: "user", content: text.trim(), createdAt: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // Try command parser first
    const intent = parseCommand(text);

    if (intent.type === "invoice" && intent.confidence >= 0.5) {
      const data = intent.data as InvoiceData;
      setMessages((m) => [...m, {
        id: mkId(),
        role: "assistant",
        content: "Jag har skapat en faktura baserat på ditt kommando. Stämmer detta?",
        card: { type: "invoice", data },
      }]);
      return;
    }

    if (intent.type === "expense" && intent.confidence >= 0.5) {
      const data = intent.data as ExpenseData;
      setMessages((m) => [...m, {
        id: mkId(),
        role: "assistant",
        content: "Förslag på utlägg — granska och godkänn för att registrera.",
        card: { type: "expense", data },
      }]);
      return;
    }

    // Fallback: stream to AI
    setStreaming(true);
    const assistantId = mkId();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() }]);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-bookkeeper-stream`;
    const abort = new AbortController();
    abortRef.current = abort;

    const conversationHistory = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    await streamAIResponse(
      url,
      {
        message: text.trim(),
        companyId: companyId || "00000000-0000-0000-0000-000000000000",
        conversationHistory,
      },
      {
        onDelta: (t) => setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + t } : m))),
        onDone: () => {
          setStreaming(false);
          // Persist after AI response completes
          setMessages((latest) => {
            persistMessages(latest, conversationId, text.trim()).then((newId) => {
              if (newId && !conversationId) setConversationId(newId);
            });
            return latest;
          });
        },
        onError: (e) => { toast.error(e); setStreaming(false); },
      },
      abort.signal
    );
  };

  const handleFileAttach = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const userMsg: Msg = { id: mkId(), role: "user", content: `[Bifogad fil: ${file.name}]`, createdAt: Date.now() };
      setMessages((m) => [...m, userMsg]);
      setStreaming(true);
      const assistantId = mkId();
      setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() }]);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-bookkeeper-stream`;
      await streamAIResponse(
        url,
        {
          message: `Analysera denna fil: ${file.name}`,
          companyId: companyId || "00000000-0000-0000-0000-000000000000",
          attachments: [{ id: mkId(), name: file.name, type: file.type, status: "uploaded" }],
        },
        {
          onDelta: (t) => setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + t } : m))),
          onDone: () => {
            setStreaming(false);
            setMessages((latest) => {
              persistMessages(latest, conversationId, `Fil: ${file.name}`).then((newId) => {
                if (newId && !conversationId) setConversationId(newId);
              });
              return latest;
            });
          },
          onError: (e) => { toast.error(e); setStreaming(false); },
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const renderAssistantMsg = (m: Msg) => {
    // Detect inline JSON journal entry in the AI text and replace it with a card
    const journal = extractJournalEntry(m.content);
    const cleanedText = journal
      ? m.content.replace(journal.raw, "").replace(/\n{3,}/g, "\n\n").trim()
      : m.content;

    return (
      <div className="space-y-2">
        {cleanedText && (
          <div className="bg-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-200">
            <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1">
              <ReactMarkdown>{cleanedText || "..."}</ReactMarkdown>
            </div>
          </div>
        )}
        {journal && <JournalEntryCard data={journal.payload} />}
        {m.card?.type === "invoice" && <InvoicePreviewCard data={m.card.data as InvoiceData} />}
        {m.card?.type === "expense" && <ExpensePreviewCard data={m.card.data as ExpenseData} companyId={companyId} userId={user.id} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileAttach(e.target.files[0]); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileAttach(e.target.files[0]); e.target.value = ""; }} />

      {/* Header — back arrow returns to previous view without losing chat history */}
      <div className="bg-slate-900 border-b border-slate-800 px-2 py-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 4px)" }}>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Tillbaka"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-200 active:scale-[0.95] transition-transform"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="bg-indigo-600 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[15px] truncate">Ledger.io Assistent</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-400 text-xs truncate">{companyName ? `Inloggad som ${companyName}` : "Redo att hjälpa"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative">
        {messages.map((m) => {
          const isLastAssistant =
            m.role === "assistant" && m.id === messages[messages.length - 1]?.id;
          const showThinking =
            isLastAssistant && streaming && !m.content && !m.card;
          const showTimestamp = pressedTimestampId === m.id && m.createdAt;
          // Long-press handlers — show timestamp only on press-and-hold
          let pressTimer: ReturnType<typeof setTimeout> | null = null;
          const startPress = () => {
            if (!m.createdAt) return;
            pressTimer = setTimeout(() => setPressedTimestampId(m.id), 350);
          };
          const endPress = () => {
            if (pressTimer) clearTimeout(pressTimer);
            setTimeout(() => setPressedTimestampId((cur) => (cur === m.id ? null : cur)), 1500);
          };
          return (
            <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
              <div className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="flex-shrink-0 mr-2 mt-1">
                    <div className="bg-indigo-600 rounded-full p-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                )}
                <div
                  className="max-w-[85%]"
                  onTouchStart={startPress}
                  onTouchEnd={endPress}
                  onMouseDown={startPress}
                  onMouseUp={endPress}
                  onMouseLeave={endPress}
                >
                  {m.role === "assistant" ? (
                    showThinking ? (
                      <div className="bg-slate-800 rounded-2xl px-4 py-3 text-[15px] leading-[1.5] text-slate-300 flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                        <span className="text-slate-400">Tänker</span>
                        <span className="flex gap-1">
                          <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      </div>
                    ) : (
                      renderAssistantMsg(m)
                    )
                  ) : (
                    <div className="bg-[#3b82f6] text-white rounded-2xl px-4 py-3 text-[15px] leading-[1.5] whitespace-pre-wrap break-words">{m.content}</div>
                  )}
                </div>
              </div>
              {showTimestamp && (
                <span className={cn("text-[11px] text-slate-500 mt-1", m.role === "user" ? "mr-2" : "ml-9")}>
                  {new Date(m.createdAt!).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          );
        })}

        {/* "Ny aktivitet" pill — appears when scrolled up and new messages arrive */}
        {showNewActivity && (
          <button
            onClick={() => scrollBottom()}
            className="sticky bottom-2 mx-auto block bg-[#3b82f6] text-white text-[13px] font-medium px-4 h-9 rounded-full shadow-lg active:scale-95 transition-transform flex items-center gap-1.5"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Ny aktivitet
          </button>
        )}
      </div>

      {/* Suggested prompt chips — visible only when thread is empty.
          Tapping fills the input field; user must still tap send. */}
      {userMsgCount === 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setInput(prompt);
                inputRef.current?.focus();
              }}
              className="flex-shrink-0 flex items-center px-3 h-9 bg-white/10 backdrop-blur-sm rounded-full text-slate-200 text-[13px] border border-white/10 active:bg-white/20 active:scale-[0.97] transition-all whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Waveform */}
      {isListening && (
        <div className="py-2 bg-slate-900/50">
          <WaveformBars />
        </div>
      )}

      {/* Input bar — sticks to bottom, auto-grows with content (max ~4 lines).
          Padding-bottom uses safe-area-inset to avoid the home indicator on iOS;
          the bottom nav is hidden in chat view so we don't add extra offset. */}
      <div
        className="bg-slate-900/95 backdrop-blur-xl border-t border-white/5 px-3 py-2 flex items-end gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        {/* Mic button — opens voice overlay (transcription editable before send) */}
        <button
          onClick={() => setShowVoice(true)}
          aria-label="Röstinmatning"
          className={cn(
            "min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center active:scale-[0.97] transition-transform flex-shrink-0",
            isListening ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300"
          )}
        >
          <Mic className="h-5 w-5" />
        </button>

        {/* Attachments */}
        <button onClick={() => fileRef.current?.click()} aria-label="Bifoga fil" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 active:scale-[0.97] transition-transform flex-shrink-0">
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Auto-growing textarea */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter inserts newline (desktop fallback).
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText(input);
            }
          }}
          rows={1}
          placeholder={isListening ? "Lyssnar..." : "Skriv ett meddelande..."}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          className="flex-1 bg-slate-800 placeholder:text-slate-500 outline-none min-w-0 min-h-[44px] max-h-[140px] rounded-2xl px-4 py-3 border border-slate-700 focus:border-indigo-500 transition-colors resize-none leading-[1.4]"
          style={{ fontSize: "16px", color: "#ffffff", WebkitTextFillColor: "#ffffff", caretColor: "#818cf8" }}
        />

        {/* Send button — always visible (per spec), 44×44 px */}
        <button
          onClick={() => sendText(input)}
          disabled={streaming || !input.trim()}
          aria-label="Skicka meddelande"
          className={cn(
            "min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all flex-shrink-0 active:scale-[0.97]",
            input.trim() && !streaming
              ? "bg-[#3b82f6] text-white"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          )}
        >
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Voice overlay — transcription is shown in input field for edit before send */}
      <MobileVoiceOverlay
        open={showVoice}
        onClose={() => setShowVoice(false)}
        onConfirm={(text) => { setShowVoice(false); setInput(text); inputRef.current?.focus(); }}
      />
    </div>
  );
};
