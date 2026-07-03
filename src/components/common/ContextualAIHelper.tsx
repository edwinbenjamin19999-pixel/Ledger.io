import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { streamAIResponse } from "@/lib/stream-helpers";
import { Sparkles, Send, Loader2, X, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

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
}

interface ContextualAIHelperProps { /** Module context injected as extra system instructions */
  context: string;
  /** Short title shown in the panel header */
  title?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Company ID för financial context */
  companyId?: string;
  /** Suggested quick-questions */
  suggestions?: string[];
  /** Greeting shown when assistant is first opened (empty state) */
  greeting?: string;
  /** Custom header class för visual module differentiation */
  headerClass?: string;
  /** Custom button class för the floating trigger */
  buttonClass?: string;
}

const mkId = () => { try { return crypto.randomUUID(); } catch { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
};

export const ContextualAIHelper = ({ context,
  title = "AI-assistent",
  placeholder = "Ställ en fråga...",
  companyId,
  suggestions = [],
  greeting,
  headerClass,
  buttonClass,
}: ContextualAIHelperProps) => { const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const lastHandledPasteTimestampRef = useRef<number | null>(null);
  const pasteEventInFlightRef = useRef<number | null>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => { const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const dataUrlToFile = (dataUrl: string) => { const normalizedDataUrl = dataUrl.replace(/\s+/g, "").trim();
    const match = normalizedDataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!match) return null;

    try { const mimeType = match[1];
      const base64 = match[2];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i += 1) { bytes[i] = binary.charCodeAt(i);
      }

      const extension = mimeType.split("/")[1]?.replace(/[^a-z0-9]+/gi, "-") || "png";
      return new File([bytes], `screenshot-${Date.now()}.${extension}`, { type: mimeType });
    } catch { return null;
    }
  };

  const getClipboardDataUrlImageFiles = (clipboardData?: DataTransfer | null) => { const html = clipboardData?.getData("text/html") ?? "";
    const plainText = clipboardData?.getData("text/plain")?.trim() ?? "";

    const embeddedDataUrl =
      html.match(/src=["'](data:image\/[a-z0-9.+-]+;base64,[^"']+)["']/i)?.[1] ||
      html.match(/url\((data:image\/[a-z0-9.+-]+;base64,[^)]+)\)/i)?.[1] ||
      (/^data:image\/[a-z0-9.+-]+;base64,/i.test(plainText) ? plainText : "");

    const file = embeddedDataUrl ? dataUrlToFile(embeddedDataUrl) : null;
    return file ? [file] : [];
  };

  const handleFiles = async (files: FileList | File[] | null) => { const normalizedFiles = !files ? [] : Array.isArray(files) ? files : Array.from(files);
    for (const file of normalizedFiles.slice(0, 3)) { if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} är för stor`); continue; }
      const att: Attachment = { id: mkId(), name: file.name, type: file.type, base64: "", status: "processing" };
      setPendingAttachments(prev => [...prev, att]);
      try { const b64 = await fileToBase64(file);
        setPendingAttachments(prev => prev.map(a => a.id === att.id ? { ...a, base64: b64, status: "done" } : a));
      } catch { setPendingAttachments(prev => prev.map(a => a.id === att.id ? { ...a, status: "error" } : a));
      }
    }
  };

  const getClipboardImageFiles = (clipboardData?: DataTransfer | null) => { const clipboardFiles = Array.from(clipboardData?.files ?? []).filter(file => file.type.startsWith("image/"));
    if (clipboardFiles.length > 0) return clipboardFiles;

    return Array.from(clipboardData?.items ?? [])
      .filter(item => item.kind === "file" && item.type.startsWith("image/"))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);
  };

  const getPastedImageFiles = (clipboardData?: DataTransfer | null) => { const directImageFiles = getClipboardImageFiles(clipboardData);
    if (directImageFiles.length > 0) return directImageFiles;

    return getClipboardDataUrlImageFiles(clipboardData);
  };

  const hasClipboardImageLikeData = (clipboardData?: DataTransfer | null) => { if (getPastedImageFiles(clipboardData).length > 0) return true;

    const html = clipboardData?.getData("text/html") ?? "";
    if (/data:image\/[a-z0-9.+-]+;base64,/i.test(html)) return true;

    const plainText = clipboardData?.getData("text/plain")?.trim() ?? "";
    return /^data:image\/[a-z0-9.+-]+;base64,/i.test(plainText);
  };

  const shouldTryClipboardApiImageFallback = (clipboardData?: DataTransfer | null) => { if (!clipboardData) return true;

    const hasFileItems = Array.from(clipboardData.items ?? []).some(item => item.kind === "file");
    const hasFiles = Array.from(clipboardData.files ?? []).length > 0;
    const types = Array.from(clipboardData.types ?? []);

    return (!hasFiles && !hasFileItems && types.length === 0) || hasClipboardImageLikeData(clipboardData);
  };

  const getClipboardApiImageFiles = async () => { if (typeof navigator === "undefined" || !navigator.clipboard?.read) return [];

    try { const items = await navigator.clipboard.read();
      const files: File[] = [];

      for (const item of items) { const imageType = item.types.find(type => type.startsWith("image/"));
        if (!imageType) continue;

        const blob = await item.getType(imageType);
        const extension = imageType.split("/")[1]?.replace(/[^a-z0-9]+/gi, "-") || "png";
        files.push(new File([blob], `screenshot-${Date.now()}.${extension}`, { type: imageType }));
      }

      return files;
    } catch (error) { console.debug("Clipboard image read failed", error);
      return [];
    }
  };

  const handlePaste = async (clipboardData?: DataTransfer | null, eventTimestamp?: number) => { if (typeof eventTimestamp === "number") { if (
        lastHandledPasteTimestampRef.current === eventTimestamp ||
        pasteEventInFlightRef.current === eventTimestamp
      ) { return false;
      }

      pasteEventInFlightRef.current = eventTimestamp;
    }

    try { const directImageFiles = getPastedImageFiles(clipboardData);
      if (directImageFiles.length > 0) { if (typeof eventTimestamp === "number") lastHandledPasteTimestampRef.current = eventTimestamp;
        await handleFiles(directImageFiles);
        return true;
      }

      if (!shouldTryClipboardApiImageFallback(clipboardData)) return false;

      const clipboardApiFiles = await getClipboardApiImageFiles();
      if (clipboardApiFiles.length > 0) { if (typeof eventTimestamp === "number") lastHandledPasteTimestampRef.current = eventTimestamp;
        await handleFiles(clipboardApiFiles);
        return true;
      }

      return false;
    } finally { if (typeof eventTimestamp === "number" && pasteEventInFlightRef.current === eventTimestamp) { pasteEventInFlightRef.current = null;
      }
    }
  };

  useEffect(() => { if (!open) return;

    const handleNativePaste = (event: ClipboardEvent) => { const sheet = sheetContentRef.current;
      if (!sheet) return;

      const activeElement = document.activeElement;
      const targetNode = event.target instanceof Node ? event.target : null;
      const isInsideAssistant =
        (targetNode ? sheet.contains(targetNode) : false) ||
        (activeElement instanceof Node ? sheet.contains(activeElement) : false);
      const hasNeutralFocus = !activeElement || activeElement === document.body;

      if (!isInsideAssistant && !hasNeutralFocus) return;

      const hasImageLikeData = hasClipboardImageLikeData(event.clipboardData);
      if (hasImageLikeData) event.preventDefault();

      void handlePaste(event.clipboardData, event.timeStamp);
    };

    document.addEventListener("paste", handleNativePaste, true);
    return () => document.removeEventListener("paste", handleNativePaste, true);
  }, [open]);

  const sendMessage = async (overrideText?: string) => { const text = overrideText || input;
    if ((!text.trim() && pendingAttachments.length === 0) || isLoading) return;

    const attachments = pendingAttachments.filter(a => a.status === "done");
    const userMsg: Message = { id: mkId(), role: "user", content: text, attachments: attachments.length > 0 ? attachments : undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);

    const assistantId = mkId();
    let fullText = "";
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try { const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-stream`;
      const filePayload = attachments.map(a => ({ name: a.name, mimeType: a.type, base64: a.base64 }));

      await streamAIResponse(url, { messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        companyId,
        moduleContext: context,
        attachments: filePayload.length > 0 ? filePayload : undefined,
      }, { onDelta: (t) => { fullText += t;
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m));
        },
        onDone: () => setIsLoading(false),
        onError: (err) => { toast.error(err);
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Något gick fel." } : m));
          setIsLoading(false);
        },
      });
    } catch { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Något gick fel." } : m));
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl ${buttonClass || "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"}`}
        >
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent ref={sheetContentRef} side="right" className="w-full sm:w-[440px] p-0 flex flex-col">
        <SheetHeader className={`px-4 py-3 border-b flex-shrink-0 ${headerClass || ""}`}>
          <SheetTitle className={`flex items-center gap-2 text-base ${headerClass ? "text-white" : ""}`}>
            <Sparkles className={`w-4 h-4 ${headerClass ? "text-white/70" : "text-primary"}`} />
            {title}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <Sparkles className="w-10 h-10 text-primary/40 mx-auto" />
                <p className="text-sm text-muted-foreground">{greeting || "Ställ en fråga om det du jobbar med just nu"}</p>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
                        onClick={() => sendMessage(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
                <div className={`rounded-xl ${ msg.role === "user"
                    ? "max-w-[80%] bg-primary text-primary-foreground px-3 py-2 text-sm rounded-br-sm"
                    : "max-w-[90%] bg-card border px-3 py-2 rounded-bl-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-[12px] prose-p:my-1 prose-li:text-[12px] prose-strong:text-foreground prose-code:text-primary prose-code:text-xs">
                      <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <div>
                      {msg.content && <p className="whitespace-pre-wrap text-sm">{msg.content}</p>}
                      {msg.attachments?.map(att => (
                        <div key={att.id} className="flex items-center gap-1 mt-1 text-xs opacity-80">
                          {att.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          <span className="truncate max-w-[100px]">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <div className="bg-card border rounded-xl px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Analyserar...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-3 flex-shrink-0">
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pendingAttachments.map(att => (
                <div key={att.id} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                  {att.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  <span className="truncate max-w-[80px]">{att.name}</span>
                  {att.status === "processing" ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : (
                    <button onClick={() => setPendingAttachments(p => p.filter(a => a.id !== att.id))} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
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
              onChange={e => { void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button type="button" size="icon" variant="ghost" className="flex-shrink-0 h-8 w-8" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-shrink-0 h-8 gap-1 px-2"
              title="Klistra in bild från urklipp"
              onClick={async () => { const clipboardApiFiles = await getClipboardApiImageFiles();
                if (clipboardApiFiles.length === 0) { toast.error("Ingen bild hittades i urklipp.");
                  return;
                }

                await handleFiles(clipboardApiFiles);
              }}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Klistra in</span>
            </Button>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onPaste={e => { if (hasClipboardImageLikeData(e.clipboardData)) e.preventDefault();
                void handlePaste(e.clipboardData, e.timeStamp);
              }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder={placeholder}
              disabled={isLoading}
              className="min-h-[36px] max-h-[80px] resize-none text-sm rounded-xl"
              rows={1}
            />
            <Button onClick={() => sendMessage()} disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading} size="icon" className="rounded-full h-8 w-8">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
