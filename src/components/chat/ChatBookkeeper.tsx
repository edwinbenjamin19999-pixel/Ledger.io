import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { streamAIResponse } from "@/lib/stream-helpers";
import { JournalEntryCard } from "./JournalEntryCard";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { Send, 
  Bot, 
  User, 
  Loader2, 
  Camera, 
  Paperclip, 
  CheckCircle2, 
  FileText,
  Sparkles,
  X,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extractImageFilesFromClipboardData, hasClipboardImageData, readClipboardImageFiles } from "@/lib/clipboard-images";

interface Message { id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  journalEntry?: JournalEntryPreview;
  timestamp: Date;
}

interface Attachment { id: string;
  name: string;
  type: string;
  url?: string;
  status: "uploading" | "processing" | "done" | "error";
}

interface JournalEntryPreview { id: string;
  description: string;
  date: string;
  lines: { account: string;
    accountName: string;
    debit?: number;
    credit?: number;
  }[];
  status: "draft" | "pending_approval" | "approved";
  autoApproved?: boolean;
  confidence?: number;
}

interface ChatBookkeeperProps { companyId: string;
  companyName?: string;
}

export const ChatBookkeeper = ({ companyId, companyName }: ChatBookkeeperProps) => { const [messages, setMessages] = useState<Message[]>([
    { id: "welcome",
      role: "assistant",
      content: `Hej! Jag är din AI-bokförare${companyName ? ` för **${companyName}**` : ''}.\n\nBerätta bara vad som hänt så sköter jag bokföringen åt dig.\n\n**Exempel på vad du kan säga:**\n- \"Jag köpte kontorsmaterial för 450 kr\"\n- \"Fick in 25 000 kr från Företaget AB\"\n- \"Betalade hyran 8 500 kr\"\n\nDu kan också fota kvitton eller ladda upp underlag direkt här.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateId = () => Math.random().toString(36).substring(7);

  const uploadFile = async (file: File): Promise<Attachment> => { const attachment: Attachment = { id: generateId(),
      name: file.name,
      type: file.type,
      status: "uploading",
    };

    try { // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${generateId()}.${fileExt}`;
      const filePath = `${companyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      // Create document record
      const { data: { user },
      } = await supabase.auth.getUser();
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({ company_id: companyId,
          document_type: "receipt",
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          processing_status: "pending",
          uploaded_by: user?.id,
        })
        .select()
        .maybeSingle();

      if (docError) throw docError;

      return { ...attachment,
        url: publicUrl,
        status: "done",
      };
    } catch (error: any) { console.error("Upload error:", error);
      return { ...attachment,
        status: "error",
      };
    }
  };

  const handleFiles = async (files: FileList | File[]) => { const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Add pending attachments
    const newAttachments: Attachment[] = fileArray.map((file) => ({ id: generateId(),
      name: file.name,
      type: file.type,
      status: "uploading" as const,
    }));

    setPendingAttachments((prev) => [...prev, ...newAttachments]);

    // Upload files
    const uploadedAttachments = await Promise.all(
      fileArray.map(async (file, index) => { const uploaded = await uploadFile(file);
        // Update status in pending
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === newAttachments[index].id ? { ...a, ...uploaded } : a
          )
        );
        return uploaded;
      })
    );

    // Update pending with final status
    setPendingAttachments((prev) =>
      prev.map((a) => { const uploaded = uploadedAttachments.find((u) => u.name === a.name);
        return uploaded || a;
      })
    );
  };

  const handleImagePaste = async (clipboardData?: DataTransfer | null) => { const imageFiles = extractImageFilesFromClipboardData(clipboardData);
    if (imageFiles.length === 0) return false;

    await handleFiles(imageFiles);
    return true;
  };

  const pasteFromClipboard = async () => { try { const imageFiles = await readClipboardImageFiles();
      if (imageFiles.length === 0) { toast.error("Ingen bild hittades i urklipp.");
        return;
      }

      await handleFiles(imageFiles);
    } catch { toast.error("Kunde inte läsa urklipp. Prova Cmd+V i chattfältet eller ladda upp bilden.");
    }
  };

  const removeAttachment = (id: string) => { setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const sendMessage = async () => { if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;

    const userMessage: Message = { id: generateId(),
      role: "user",
      content: input.trim(),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);

    const assistantId = generateId();
    let fullText = "";

    // Add empty assistant message för streaming
    setMessages((prev) => [...prev, { id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }]);

    try { const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-bookkeeper-stream`;

      await streamAIResponse(
        url,
        { message: userMessage.content,
          attachments: userMessage.attachments,
          companyId,
          conversationHistory: messages.slice(-10).map((m) => ({ role: m.role, content: m.content,
          })),
        },
        { onDelta: (text) => { fullText += text;
            // Remove JSON blocks from displayed text
            const displayText = fullText.replace(/```json[\s\S]*?```/g, "").trim();
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: displayText } : m)
            );
          },
          onJournalEntry: (entry) => { setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, journalEntry: entry } : m)
            );
            const statusText = entry.autoApproved
              ? `✅ Auto-godkänt (${Math.round(entry.confidence * 100)}% säkerhet)`
              : "Väntar på godkännande";
            toast.success("Verifikat skapat!", { description: `${entry.description} – ${statusText}` });
          },
          onDone: () => setIsLoading(false),
          onError: (error) => { // Never show raw error – always give a helpful message
            const friendlyMsg = "Hmm, jag kunde inte tolka det just nu. 🤔\n\nFörsök formulera det lite annorlunda, till exempel:\n- \"Jag köpte kontorsmaterial för 450 kr\"\n- \"Fick betalt 25 000 kr från kund\"\n\nEller använd **Bokföring → Registrera verifikation** för manuell bokning.";
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: friendlyMsg } : m)
            );
            setIsLoading(false);
          },
        }
      );
    } catch (error: any) { console.error("Error:", error);
      const fallbackMsg = "Anslutningen avbröts. 🔄\n\nFörsök igen, eller använd **Bokföring → Registrera verifikation** för att bokföra manuellt.";
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: fallbackMsg } : m)
      );
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] space-y-3",
                  message.role === "user" ? "order-first" : ""
                )}
              >
                {/* Message Content */}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border rounded-bl-md"
                  )}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                      {message.content}
                    </p>
                  ) : (
                    <AssistantMarkdown text={message.content} className="text-sm sm:text-base" />
                  )}
                </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {message.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm"
                      >
                        {att.type.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4 text-primary" />
                        ) : (
                          <FileText className="w-4 h-4 text-primary" />
                        )}
                        <span className="truncate max-w-[150px]">{att.name}</span>
                        {att.status === "uploading" && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        {att.status === "done" && (
                          <CheckCircle2 className="w-3 h-3 text-[#085041]" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {message.journalEntry && (
                  <JournalEntryCard
                    entry={message.journalEntry}
                    companyId={companyId}
                    onUpdate={(updated) => {
                      setMessages(prev => prev.map(m =>
                        m.journalEntry?.id === updated.id
                          ? { ...m, journalEntry: updated }
                          : m
                      ));
                    }}
                  />
                )}

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground px-1">
                  {message.timestamp.toLocaleTimeString("sv-SE", { hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {message.role === "user" && (
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Analyserar och bokför...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto p-4">
          {/* Pending Attachments */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                >
                  {att.type.startsWith("image/") ? (
                    <ImageIcon className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary" />
                  )}
                  <span className="truncate max-w-[100px]">{att.name}</span>
                  {att.status === "uploading" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-end gap-2">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => { if (e.target.files) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={(e) => { if (e.target.files) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Camera Button (Mobile) */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="flex-shrink-0 sm:hidden"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-5 h-5" />
            </Button>

            {/* Attach Button */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <button
              type="button"
              className="flex-shrink-0 inline-flex items-center gap-2 h-11 px-3 transition-colors duration-150"
              style={{
                background: "rgba(0,82,255,0.1)",
                color: "#0D7A8A",
                border: "1px solid rgba(0,82,255,0.2)",
                borderRadius: 8,
                fontSize: 13,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,82,255,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,82,255,0.1)"; }}
              onClick={() => void pasteFromClipboard()}
              title="Klistra in bild från urklipp"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden md:inline">Klistra in</span>
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => { if (!hasClipboardImageData(e.clipboardData)) return;
                  e.preventDefault();
                  void handleImagePaste(e.clipboardData);
                }}
                onKeyDown={handleKeyPress}
                placeholder="Beskriv en transaktion eller ställ en fråga..."
                disabled={isLoading}
                className="min-h-[44px] max-h-[120px] resize-none pr-12 chat-bookkeeper-input"
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 14,
                  padding: "14px 18px",
                  fontSize: 15,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "border-color 150ms ease, box-shadow 150ms ease",
                }}
                rows={1}
              />
              <style>{`
                .chat-bookkeeper-input:focus,
                .chat-bookkeeper-input:focus-visible {
                  outline: none !important;
                  border-color: rgba(0,82,255,0.4) !important;
                  box-shadow: 0 0 0 3px rgba(0,82,255,0.08) !important;
                }
              `}</style>
            </div>

            {/* Send Button */}
            <Button
              onClick={sendMessage}
              disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
              size="icon"
              className="flex-shrink-0 rounded-full h-11 w-11"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Hint text */}
          <p className="text-xs text-center text-muted-foreground mt-3">
            Skriv vad som hänt • Cmd+V eller Klistra in bild • AI bokför automatiskt
          </p>
        </div>
      </div>
    </div>
  );
};
