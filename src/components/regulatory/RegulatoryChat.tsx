import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, ThumbsUp, ThumbsDown, Loader2, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessage { role: "user" | "assistant";
  content: string;
  source?: string;
  sourceUrl?: string;
  feedback?: "up" | "down" | null;
}

interface Props { companyId: string;
}

const SUGGESTIONS = [
  "Vad gäller för representation 2026?",
  "Hur bokförs friskvårdsbidrag?",
  "Vilka avdrag kan jag göra för hemmakontor?",
  "Vad är skillnaden mellan K2 och K3?",
  "Hur beräknas arbetsgivaravgifter för unga?",
  "När ska årsredovisningen vara inlämnad?",
];

const SYSTEM_PROMPT = `Du är en expert på svensk lagstiftning inom redovisning, skatt och bolagsrätt. Du svarar på svenska och citerar alltid lagrum och källor.

Dina kunskapsområden:
- Momslagen (ML)
- Inkomstskattelagen (IL)
- Bokföringslagen (BFL)
- Årsredovisningslagen (ÅRL)
- GDPR/Dataskyddsförordningen
- Aktiebolagslagen (ABL)
- K2/K3 (BFNAR 2016:10 / BFNAR 2012:1)
- Skatteverkets ställningstaganden
- BFN:s allmänna råd

Format för svar:
1. Kort sammanfattning
2. Detaljerat svar med lagrumshänvisningar (t.ex. **IL 16 kap. 2 §**)
3. Praktiskt exempel om möjligt
4. Källa med datum

Svara alltid korrekt, koncist och på svenska. Om du är osäker, ange det tydligt.`;

export function RegulatoryChat({ companyId }: Props) { const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text?: string) { const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try { const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-stream`;
      const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(CHAT_URL, { method: "POST",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages,
          systemPrompt: SYSTEM_PROMPT,
          companyId,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";

      while (true) { const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = textBuffer.indexOf("\n")) !== -1) { let line = textBuffer.slice(0, newlineIdx);
          textBuffer = textBuffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try { const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { assistantContent += content;
              setMessages(prev => { const last = prev[prev.length - 1];
                if (last?.role === "assistant") { return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent, feedback: null }];
              });
            }
          } catch {}
        }
      }

      // Ensure final message exists
      if (assistantContent) { setMessages(prev => { const last = prev[prev.length - 1];
          if (last?.role === "assistant") { return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          }
          return [...prev, { role: "assistant", content: assistantContent, feedback: null }];
        });
      }
    } catch (e) { console.error("Chat error:", e);
      setMessages(prev => [...prev, { role: "assistant",
        content: "Kunde inte generera svar. Kontrollera att AI-tjänsten är konfigurerad.",
        feedback: null,
      }]);
    }
    setLoading(false);
  }

  function setFeedback(idx: number, fb: "up" | "down") { setMessages(prev => prev.map((m, i) => i === idx ? { ...m, feedback: fb } : m));
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Fraga om regelverket
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 pb-3">
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-3 py-6">
              <p className="text-sm text-muted-foreground text-center">
                Stall fragor om svensk lagstiftning, skatteRegler och redovisningsstandarder
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left text-xs p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${ msg.role === "user"
                        ? "bg-[#3b82f6] text-white"
                        : "bg-card border"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}

                    {msg.role === "assistant" && msg.source && (
                      <p className="text-[10px] text-muted-foreground mt-2 italic">
                        Källa: {msg.source}
                        {msg.sourceUrl && (
                          <a href={msg.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">lank</a>
                        )}
                      </p>
                    )}

                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1 mt-2 border-t pt-1.5">
                        <button
                          onClick={() => setFeedback(i, "up")}
                          className={`p-1 rounded transition-colors ${msg.feedback === "up" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setFeedback(i, "down")}
                          className={`p-1 rounded transition-colors ${msg.feedback === "down" ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                        <span className="text-[9px] text-muted-foreground ml-1">Var detta hjalpsamt?</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Soker i regelverket...
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 pt-2 shrink-0">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Stall en fraga om regelverket..."
            disabled={loading}
            className="text-sm"
          />
          <Button size="sm" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
