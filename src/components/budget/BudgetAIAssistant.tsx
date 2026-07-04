import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, BarChart3, Calculator, TrendingDown, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message { role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

interface BudgetAIAssistantProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  budgetId?: string;
  onFillRR: () => void;
  onCalcCashFlow: () => void;
  onGenerateBR: () => void;
  onSuggestSavings: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/budget-ai-cfo`;

export const BudgetAIAssistant = ({ open, onOpenChange, companyId, budgetId, onFillRR, onCalcCashFlow, onGenerateBR, onSuggestSavings }: BudgetAIAssistantProps) => { const [messages, setMessages] = useState<Message[]>([
    { role: "assistant",
      content: "Hej! Jag är din AI CFO. Jag hjälper dig att planera, övervaka och optimera din budget.\n\nBerätta — vad vill du fokusera på idag? Tillväxt, kostnadsoptimering, kassaflöde, eller något annat?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text?: string) => { const msgText = text || input.trim();
    if (!msgText || loading) return;

    const userMsg: Message = { role: "user", content: msgText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try { const resp = await fetch(CHAT_URL, { method: "POST",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, companyId, budgetId }),
      });

      if (!resp.ok) { const errData = await resp.json().catch(() => ({ error: "Okänt fel" }));
        toast.error(errData.error || "AI-tjänsten svarar inte");
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";

      const upsertAssistant = (chunk: string) => { assistantSoFar += chunk;
        const current = assistantSoFar;
        setMessages(prev => { const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.timestamp.getTime() > userMsg.timestamp.getTime()) { return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: current } : m);
          }
          return [...prev, { role: "assistant", content: current, timestamp: new Date() }];
        });
      };

      let streamDone = false;
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
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try { const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }
    } catch (e) { console.error("AI stream error:", e);
      toast.error("Kunde inte nå AI-tjänsten");
    } finally { setLoading(false);
    }
  }, [input, loading, messages, companyId, budgetId]);

  const quickActions = [
    { label: "Fyll i hela RR med AI", icon: BarChart3, color: "text-purple-500", action: () => { onFillRR(); sendMessage("Hjälp mig fylla i resultaträkningen. Analysera historisk data och ge mig en komplett RR med intäkter, kostnader och nettoresultat för varje månad."); } },
    { label: "Beräkna kassaflöde", icon: Calculator, color: "text-blue-500", action: () => { onCalcCashFlow(); sendMessage("Beräkna kassaflödet baserat på min resultaträkning. Visa operativt kassaflöde, förändringar i rörelsekapital och slutkassa per månad."); } },
    { label: "Generera BR-prognos", icon: BarChart3, color: "text-blue-500", action: () => { onGenerateBR(); sendMessage("Generera en balansräkningsprognos baserat på resultaträkningen och kassaflödet. Visa tillgångar, eget kapital och skulder per månad."); } },
    { label: "Föreslå sparåtgärder", icon: TrendingDown, color: "text-[#085041]", action: () => sendMessage("Analysera min budget och föreslå sparåtgärder. Var detaljerad med belopp och kontogrupper.") },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] p-0 flex flex-col">
        <SheetHeader className="bg-[#0F1F3D] text-white px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/20">
              <Bot className="w-4 h-4" />
            </div>
            <SheetTitle className="text-white text-lg">AI CFO</SheetTitle>
          </div>
          <p className="text-purple-100 text-xs">Din personliga finansiella rådgivare</p>
        </SheetHeader>

        {/* Chat area */}
        <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#0F1F3D] flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                  <p className={cn("text-[10px] mt-1", msg.role === "user" ? "text-indigo-200" : "text-muted-foreground")}>
                    {msg.timestamp.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-[#0F1F3D] flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#0F1F3D] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick actions */}
        <div className="border-t px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Snabbåtgärder</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(qa => (
              <Button key={qa.label} variant="outline" size="sm" className="text-xs gap-1.5 h-9 justify-start hover:shadow-sm transition-all" onClick={qa.action}>
                <qa.icon className={cn("w-3.5 h-3.5", qa.color)} /> {qa.label}
              </Button>
            ))}
          </div>
          {/* Quick prompts */}
          <div className="flex gap-1.5 flex-wrap">
            {["Hur ser kassaflödet ut?", "Vad är vår runway?", "Simulera 10% prisökning"].map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-[10px] px-2 py-1 rounded-full border border-[#C8DDF5] text-indigo-600 hover:bg-[#EFF6FF] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Fråga din AI CFO..."
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              className="flex-1"
            />
            <Button size="icon" onClick={() => sendMessage()} disabled={!input.trim() || loading} className="bg-[#0F1F3D] hover:from-indigo-700 hover:to-purple-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
