import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, MessageSquare, Brain, Mic, ArrowRight, Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
// jsPDF loaded lazily via dynamic import
import type { FinancialSnapshot } from "./CFODashboard";

interface CFOChatProps { companyId: string;
  snapshot: FinancialSnapshot | null;
}

interface ChatMessage { role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const CFO_SYSTEM_PROMPT = `Du är NorthLedger CFO — en senior finansiell rådgivare specialiserad på svenska småföretag. Du har djup kunskap om:
- Svensk skattelagstiftning (IL, ML, ABL)
- BAS kontoplan
- K2/K3 redovisningsstandarder (BFNAR 2016:10 / 2012:1)
- Skatteverkets regler för moms, arbetsgivaravgifter, F-skatt
- 3:12-regler och utdelningsplanering
- Periodiseringsfonder och bokslutsdispositioner

Du svarar ALLTID på svenska. Var konkret, ge siffror och hänvisa till relevanta lagrum.
Strukturera långa svar med rubriker (##) och punktlistor.
Avsluta skatterelaterade svar med: "*Obs: Rådgivningen är generell. Konsultera auktoriserad skatterådgivare för komplexa beslut.*"

Du har tillgång till företagets faktiska bokföringsdata som bifogas i varje meddelande.`;

export function CFOChat({ companyId, snapshot }: CFOChatProps) { const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceEmail, setVoiceEmail] = useState("");
  const [voiceRegistered, setVoiceRegistered] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => { setVoiceRegistered(!!localStorage.getItem("northledger_voice_waitlist"));
  }, []);

  const suggestions = buildSuggestions(snapshot);

  const buildContext = () => { if (!snapshot) return "";
    return `FÖRETAGSDATA (realtid):
- Kassa (konto 1910-1940): ${fmt(snapshot.cashBalance)} kr
- Intäkter YTD: ${fmt(snapshot.revenue)} kr
- Kostnader YTD: ${fmt(snapshot.expenses)} kr
- Årets resultat: ${fmt(snapshot.yearResult)} kr
- EBITDA-marginal: ${snapshot.ebitdaMargin}%
- Kassareserv (runway): ${snapshot.runwayDays} dagar
- Öppna kundfordringar: ${fmt(snapshot.openReceivables)} kr (${snapshot.openReceivablesCount} fakturor)
- Förfallna fakturor: ${snapshot.overdueInvoices.map(i => `${i.customer} ${fmt(i.amount)} kr (${i.daysOverdue} dagar)`).join(", ") || "Inga"}
- Arbetsgivaravgift: 31,42%
- Bolagsskatt: 20,6%`;
  };

  const sendMessage = async (text?: string) => { const msgText = text || input.trim();
    if (!msgText || loading) return;

    const userMsg: ChatMessage = { role: "user", content: msgText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";

    try { const context = buildContext();
      const allMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: `${context}\n\nFråga: ${msgText}` },
      ];

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-stream`;

      const resp = await fetch(CHAT_URL, { method: "POST",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages,
          companyId,
          systemPrompt: CFO_SYSTEM_PROMPT,
        }),
      });

      if (!resp.ok) { if (resp.status === 429) { toast.error("Hastighetsgräns nådd. Vänta en stund och försök igen.");
          setLoading(false);
          return;
        }
        if (resp.status === 402) { toast.error("AI-kredit förbrukad. Fyll på under Inställningar.");
          setLoading(false);
          return;
        }
        throw new Error("AI-tjänsten svarade inte");
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const upsertAssistant = (chunk: string) => { assistantSoFar += chunk;
        setMessages(prev => { const last = prev[prev.length - 1];
          if (last?.role === "assistant") { return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar, timestamp: new Date().toISOString() }];
        });
      };

      while (!streamDone) { const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) { let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try { const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) { for (let raw of textBuffer.split("\n")) { if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try { const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      // If no assistant response was generated (maybe not SSE format), try JSON fallback
      if (!assistantSoFar) { setMessages(prev => [...prev, { role: "assistant", content: "Kunde inte generera svar. Försök igen.", timestamp: new Date().toISOString() }]);
      }
    } catch { if (!assistantSoFar) { setMessages(prev => [...prev, { role: "assistant", content: "Kunde inte svara just nu. Försök igen.", timestamp: new Date().toISOString() }]);
      }
    } finally { setLoading(false);
    }
  };

  const exportPDF = async () => { if (messages.length === 0) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("NorthLedger CFO — Konversation", 14, 20);
    doc.setFontSize(9);
    doc.text(`Exporterad: ${new Date().toLocaleDateString("sv-SE")}`, 14, 28);
    doc.line(14, 31, 196, 31);

    let y = 38;
    for (const msg of messages) { if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(msg.role === "user" ? "Du:" : "CFO:", 14, y);
      y += 4;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(msg.content, 175);
      for (const line of lines) { if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 14, y);
        y += 4;
      }
      y += 4;
    }

    window.open(URL.createObjectURL(doc.output("blob")), "_blank");
    toast.success("Konversation exporterad som PDF");
  };

  const handleVoiceRegister = () => { if (voiceEmail) { localStorage.setItem("northledger_voice_waitlist", voiceEmail);
      setVoiceRegistered(true);
      setVoiceModalOpen(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />CFO-chatt</CardTitle>
              <CardDescription>Fråga din AI CFO — alla svar baseras på din faktiska bokföring</CardDescription>
            </div>
            {messages.length > 0 && (
              <Button onClick={exportPDF} size="sm" variant="outline" className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Exportera
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3 py-2">
              {messages.length === 0 && (
                <div className="space-y-4 py-4">
                  <div className="text-center">
                    <Brain className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">Baserat på din data — föreslagna frågor:</p>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s.question)}
                        className="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs">{s.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{s.question}</p>
                            {s.context && <p className="text-xs text-muted-foreground mt-0.5">{s.context}</p>}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Voice memo banner */}
                  <div className="border border-dashed rounded-lg p-4 bg-muted/20 mt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Mic className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Ring mig</p>
                          <ComingSoonBadge />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Få din veckobriefing uppläst av AI-CFO via telefonsamtal varje måndag 08:00
                        </p>
                        {voiceRegistered ? (
                          <Badge variant="secondary" className="mt-2 text-xs">Du är förhandsregistrerad</Badge>
                        ) : (
                          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => setVoiceModalOpen(true)}>
                            Förhandsregistrera dig
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${ msg.role === "user"
                      ? "bg-[hsl(var(--primary))] text-primary-foreground"
                      : "bg-card border"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-lg px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Suggestions row when conversation is active */}
          {messages.length > 0 && messages.length < 6 && (
            <div className="flex gap-1.5 py-2 overflow-x-auto">
              {suggestions.slice(0, 3).map((s, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs shrink-0 h-7" onClick={() => sendMessage(s.question)}>
                  {s.question.slice(0, 40)}...
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ställ en fråga till din AI CFO..."
              className="flex-1"
            />
            <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice waitlist modal */}
      <Dialog open={voiceModalOpen} onOpenChange={setVoiceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Förhandsregistrering — AI CFO Röstsamtal
            </DialogTitle>
            <DialogDescription>
              Vi meddelar dig när funktionen är tillgänglig. Din veckobriefing uppläst via AI-samtal varje måndag 08:00.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              type="email"
              placeholder="Din e-postadress"
              value={voiceEmail}
              onChange={e => setVoiceEmail(e.target.value)}
            />
            <Button onClick={handleVoiceRegister} className="w-full" disabled={!voiceEmail.includes("@")}>
              Registrera mig
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildSuggestions(snapshot: CFOChatProps["snapshot"]): { icon: string; question: string; context?: string }[] { if (!snapshot) return [];

  const suggestions: { icon: string; question: string; context?: string }[] = [];

  if (snapshot.overdueInvoices.length > 0) { const worst = snapshot.overdueInvoices[0];
    suggestions.push({ icon: "!",
      question: `${worst.customer} har ${fmt(worst.amount)} kr förfallit sedan ${worst.daysOverdue} dagar — vad rekommenderar du?`,
      context: "Förfallen faktura",
    });
  }

  const now = new Date();
  const nextTaxDay = now.getDate() <= 12 ? 12 : 26;
  const taxDate = new Date(now.getFullYear(), now.getMonth(), nextTaxDay);
  if (taxDate < now) taxDate.setMonth(taxDate.getMonth() + 1);
  const daysUntilTax = Math.ceil((taxDate.getTime() - now.getTime()) / 86400000);
  if (daysUntilTax <= 14) { suggestions.push({ icon: "S",
      question: `Skattebetalning den ${taxDate.getDate()}:e — hur mycket ska jag reservera?`,
      context: `${daysUntilTax} dagar kvar`,
    });
  }

  if (snapshot.ebitdaMargin > 50) { suggestions.push({ icon: "M",
      question: `Min rörelsemarginal är ${snapshot.ebitdaMargin}% — vad driver den höga marginalen?`,
    });
  }

  if (snapshot.runwayDays < 90) { suggestions.push({ icon: "K",
      question: `Kassareserven är ${snapshot.runwayDays} dagar — vilka åtgärder föreslår du?`,
    });
  }

  suggestions.push({ icon: "P",
    question: "Har vi råd att anställa en person till?",
    context: `Baserat på kassa ${fmt(snapshot.cashBalance)} kr`,
  });

  if (snapshot.yearResult > 100000) { suggestions.push({ icon: "O",
      question: "Vilka skatteoptimeringar kan vi göra i år?",
      context: `Resultat: ${fmt(snapshot.yearResult)} kr`,
    });
  }

  return suggestions.slice(0, 5);
}
