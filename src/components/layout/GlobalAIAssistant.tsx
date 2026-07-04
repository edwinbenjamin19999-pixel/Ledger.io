import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { streamAIResponse } from "@/lib/stream-helpers";
import { getModuleContext } from "@/config/moduleContexts";
import { MessageCircle,
  Send,
  Loader2,
  X,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/TenantContext";
import { useCompanyId } from "@/hooks/useCompanyId";
import { SelfFixButton } from "@/components/shared/SelfFixButton";
import { detectAIAction, type AIAction } from "@/lib/aiActionDetector";
import { AIActionCard } from "@/components/ai/AIActionCard";

/* ─── Types ─── */
interface Attachment { id: string;
  name: string;
  type: string;
  base64: string;
  status: "processing" | "done" | "error";
}

interface Message { id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  suggestedQuestions?: string[];
  action?: AIAction;
}

/* ─── Helpers ─── */
const mkId = () => { try { return crypto.randomUUID();
  } catch { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => { const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ─── Component ─── */
interface GlobalAIAssistantProps { companyId?: string;
}

export const GlobalAIAssistant = ({ companyId: companyIdProp }: GlobalAIAssistantProps) => { const location = useLocation();
  const ctx = getModuleContext(location.pathname);
  // Suppress on /ai-ekonom — the page hosts its own central, more powerful bookkeeping chat
  const suppressOnRoute = location.pathname === "/ai-ekonom";
  const { tenant } = useTenant();
  const assistantName = tenant?.ai?.ai_name || "AI-assistent";
  // Always resolve the active company id via the shared hook so the assistant
  // works regardless of whether the parent layout passes a prop.
  const activeCompanyId = useCompanyId();
  const companyId = companyIdProp || activeCompanyId || undefined;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Listen for proactive helper open events
  useEffect(() => { const handler = (e: Event) => { const detail = (e as CustomEvent).detail as { message?: string; autoSend?: boolean } | undefined;
      setOpen(true);
      if (detail?.message) {
        if (detail.autoSend) {
          setTimeout(() => sendMessage(detail.message!), 200);
        } else {
          setInput(detail.message);
          setTimeout(() => inputRef.current?.focus(), 150);
        }
      } else {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    };
    window.addEventListener("open-ai-assistant", handler);
    return () => window.removeEventListener("open-ai-assistant", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  useEffect(() => { if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  /* ─── File handling ─── */
  const handleFiles = async (files: FileList | File[] | null) => { const normalized = !files ? [] : Array.isArray(files) ? files : Array.from(files);
    for (const file of normalized.slice(0, 3)) { if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} är för stor (max 10 MB)`);
        continue;
      }
      const att: Attachment = { id: mkId(), name: file.name, type: file.type, base64: "", status: "processing" };
      setPendingAttachments((prev) => [...prev, att]);
      try { const b64 = await fileToBase64(file);
        setPendingAttachments((prev) => prev.map((a) => (a.id === att.id ? { ...a, base64: b64, status: "done" } : a)));
      } catch { setPendingAttachments((prev) => prev.map((a) => (a.id === att.id ? { ...a, status: "error" } : a)));
      }
    }
  };

  /* ─── Paste handling ─── */
  useEffect(() => { if (!open) return;
    const handler = (e: ClipboardEvent) => { const panel = panelRef.current;
      if (!panel) return;
      const target = e.target instanceof Node ? e.target : null;
      if (target && !panel.contains(target)) return;

      const imageFiles = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length > 0) { e.preventDefault();
        void handleFiles(imageFiles);
      }
    };
    document.addEventListener("paste", handler, true);
    return () => document.removeEventListener("paste", handler, true);
  }, [open]);

  /* ─── Context badge ─── */
  const contextLabel = ctx.title.replace("AI-assistent · ", "").replace("AI-assistent", "Allmänt");

  /* ─── Send message ─── */
  const sendMessage = useCallback(
    async (overrideText?: string) => { const text = overrideText || input;
      if ((!text.trim() && pendingAttachments.length === 0) || isLoading) return;

      const attachments = pendingAttachments.filter((a) => a.status === "done");
      const userMsg: Message = { id: mkId(),
        role: "user",
        content: text,
        attachments: attachments.length > 0 ? attachments : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setPendingAttachments([]);

      // ─── Action detection: short-circuit before calling AI ───
      const detected = detectAIAction(text);
      if (detected) {
        const intro = detected.declined
          ? detected.declineMessage ?? "Det kan jag inte göra här."
          : `Visst — här är vad jag tänker göra. Bekräfta så kör jag.`;
        setMessages((prev) => [
          ...prev,
          { id: mkId(), role: "assistant", content: intro, action: detected },
        ]);
        return;
      }

      setIsLoading(true);

      const assistantId = mkId();
      let fullText = "";
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      try { const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-stream`;
        const filePayload = attachments.map((a) => ({ name: a.name, mimeType: a.type, base64: a.base64 }));

        await streamAIResponse(
          url,
          { messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
            companyId,
            moduleContext: ctx.systemContext,
            attachments: filePayload.length > 0 ? filePayload : undefined,
          },
          { onDelta: (t) => { fullText += t;
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)));
            },
            onDone: () => { setIsLoading(false);
              // Guard against empty streams: if no content arrived, swap the
              // placeholder so the bubble doesn't sit on "..." forever.
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m,
                        content: m.content && m.content.trim().length > 0
                          ? m.content
                          : "Jag hittade ingen data att svara på. Försök formulera om frågan eller välj ett aktivt bolag.",
                        suggestedQuestions: ctx.suggestions.slice(0, 3),
                      }
                    : m
                )
              );
            },
            onError: (err) => { toast.error(err);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: "Kunde inte hämta svar. Försök igen." } : m))
              );
              setIsLoading(false);
            },
          }
        );
      } catch { setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "Kunde inte hämta svar. Försök igen." } : m))
        );
        setIsLoading(false);
      }
    },
    [input, pendingAttachments, isLoading, messages, companyId, ctx]
  );

  const clearChat = () => { setMessages([]);
    setInput("");
    setPendingAttachments([]);
  };

  if (suppressOnRoute) return null;

  return (
    <>
      {/* ─── Floating trigger button ─── */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-20 md:bottom-6 right-6 z-50 h-[52px] px-5 rounded-full",
          "bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white",
          "flex items-center gap-2 font-medium text-sm",
          "animate-[pulse-glow_3s_ease-in-out_infinite]",
          "hover:scale-105 hover:-translate-y-0.5",
          "transition-all duration-200",
          "shadow-[0_4px_12px_rgba(59,130,246,0.35),_0_2px_4px_rgba(0,0,0,0.15)]",
          "hover:shadow-[0_8px_24px_rgba(59,130,246,0.45)]",
          "hover:[animation:none]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50",
          open && "hidden"
        )}
        title="Fråga AI (Ctrl+K)"
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden sm:inline">Fråga AI</span>
      </button>

      {/* ─── Side panel ─── */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[380px] flex flex-col",
          "bg-background border-l shadow-lg",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[hsl(185,80%,10%)]">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-[#3b82f6] shrink-0" />
            <span className="text-sm font-semibold text-white truncate">{assistantName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] font-medium truncate">
              {contextLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <SelfFixButton
              module={location.pathname.split("/").filter(Boolean)[0] || "global"}
              companyId={companyId}
              context={{ route: location.pathname }}
              size="sm"
              variant="ghost"
              label="Självfix"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
              onClick={clearChat}
              title="Rensa chatt"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#3b82f6]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{ctx.greeting}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Keyboard className="w-3 h-3" /> Ctrl+K för att öppna/stänga
                  </p>
                </div>
                {ctx.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {ctx.suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent text-foreground transition-colors"
                        onClick={() => sendMessage(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-xl text-sm",
                      msg.role === "user"
                        ? "max-w-[80%] bg-[#3b82f6] text-white px-3 py-2 rounded-br-sm"
                        : "max-w-[90%] bg-card border px-3 py-2 rounded-bl-sm"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-[12px] prose-p:my-1 prose-li:text-[12px] prose-strong:text-foreground prose-code:text-[#3b82f6] prose-code:text-xs">
                        <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      <div>
                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                        {msg.attachments?.map((att) => (
                          <div key={att.id} className="flex items-center gap-1 mt-1 text-xs opacity-80">
                            {att.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            <span className="truncate max-w-[100px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action confirmation/result card */}
                {msg.role === "assistant" && msg.action && (
                  <div className="mt-2 ml-9 mr-1">
                    <AIActionCard action={msg.action} />
                  </div>
                )}

                {/* Follow-up suggestions after assistant messages */}
                {msg.role === "assistant" && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && !isLoading && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
                    {msg.suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors"
                        onClick={() => sendMessage(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-card border rounded-xl px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Analyserar...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-3 shrink-0">
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pendingAttachments.map((att) => (
                <div key={att.id} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                  {att.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  <span className="truncate max-w-[80px]">{att.name}</span>
                  {att.status === "processing" ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <button onClick={() => setPendingAttachments((p) => p.filter((a) => a.id !== att.id))} className="hover:text-destructive">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv"
              onChange={(e) => { void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button type="button" size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={`Fråga om ${contextLabel.toLowerCase()}...`}
              disabled={isLoading}
              className="min-h-[36px] max-h-[80px] resize-none text-sm rounded-xl"
              rows={1}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
              size="icon"
              className="rounded-full h-8 w-8 bg-[#3b82f6] hover:bg-[#3b82f6]/90"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Backdrop on mobile */}
      {open && <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setOpen(false)} />}
    </>
  );
};
