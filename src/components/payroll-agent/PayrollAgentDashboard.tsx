import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientKPIStrip, KPI_GRADIENTS } from "@/components/shared/GradientKPICard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Calendar, Clock, Bot, TrendingUp,
  AlertTriangle, CheckCircle, FileText, Sparkles, Send, Loader2, User, ArrowRight,
} from "lucide-react";
import { PayrollSetupWizard } from "./PayrollSetupWizard";
import { PayrollMonthlyFlow } from "./PayrollMonthlyFlow";
import { PayrollTimeline } from "./PayrollTimeline";
import { VacationTracker } from "./VacationTracker";
import { ComplianceAlerts } from "./ComplianceAlerts";
import { usePayrollContext } from "@/hooks/usePayrollAgent";
import { streamAIResponse } from "@/lib/stream-helpers";
import { formatSEK } from "@/lib/formatNumber";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface PayrollAgentDashboardProps { companyId: string; }

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "Vad kostar lönemassan i arbetsgivaravgifter per månad?",
  "Vilken anställd har lägst skattetabell?",
  "Simulera effekten av 10% löneökning",
  "Förbered underlag för AGI-inlämning",
];

export const PayrollAgentDashboard = ({ companyId }: PayrollAgentDashboardProps) => {
  const { data: ctx, isLoading } = usePayrollContext(companyId);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payroll-agent-chat`;

    await streamAIResponse(
      url,
      {
        message: text.trim(),
        companyId,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
      },
      {
        onDelta: (delta) => {
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: m.content + delta } : m)
          );
        },
        onDone: () => setStreaming(false),
        onError: (err) => {
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${err}` } : m)
          );
          setStreaming(false);
        },
      },
      abortRef.current?.signal,
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!ctx?.hasEmployees) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Intelligent Löneagent</h2>
            <p className="text-muted-foreground">Sätt upp löner med AI — berätta om dina anställda så sköter vi resten.</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-medium">Inga anställda registrerade</p>
            <p className="text-sm text-muted-foreground mt-1">Gå till HR & Lön för att lägga till personal</p>
            <Button className="mt-4" onClick={() => navigate("/hr")}>
              <ArrowRight className="h-4 w-4 mr-2" /> Gå till HR & Lön
            </Button>
          </CardContent>
        </Card>
        <PayrollSetupWizard companyId={companyId} onComplete={() => {}} />
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Intelligent Löneagent</h2>
            <p className="text-sm text-muted-foreground">AI-assistent för löner, förmåner och HR-frågor</p>
          </div>
        </div>
        {ctx.lastPayroll && (
          <Badge variant={ctx.lastPayroll.status === "approved" ? "default" : "secondary"}>
            Senaste: {ctx.lastPayroll.status === "approved" ? "Godkänd" : ctx.lastPayroll.status === "draft" ? "Utkast" : ctx.lastPayroll.status}
          </Badge>
        )}
      </div>

      {/* KPI Cards — premium surface */}
      {(() => {
        const cards = [
          { label: "ANSTÄLLDA", value: String(ctx.employeeCount), sub: "aktiva anställda" },
          { label: "BRUTTOLÖNER/MÅN", value: formatSEK(ctx.totalMonthlySalary), sub: "Månatlig lönekostnad" },
          { label: "ARBETSGIVARKOSTNAD", value: formatSEK(ctx.totalWithEmployerFees), sub: "inkl. 31,42% avg." },
          { label: "SENASTE KÖRNING", value: ctx.lastPayroll ? ctx.lastPayroll.period_start?.slice(0, 7) ?? "—" : "—", sub: ctx.lastPayroll ? ctx.lastPayroll.status : "Ingen lönekörning ännu" },
        ];
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map(c => (
              <div key={c.label} className="relative overflow-hidden rounded-[12px]" style={{ background: "#FAFBFC", border: "0.5px solid #DFE4EA", padding: "14px 16px" }}>
                <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#1D4ED8" }} />
                <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">{c.label}</div>
                <div className="mt-1 text-[18px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A]">{c.value}</div>
                <div className="mt-[2px] text-[10px] text-[#94A3B8]">{c.sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Tabs */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="bg-transparent p-0 h-auto rounded-none border-b-[0.5px] border-[#E2E8F0] flex gap-0 w-full justify-start">
          {[
            { v: "chat", l: "AI-chatt" },
            { v: "run", l: "Kör lön" },
            { v: "timeline", l: "Tidslinje" },
            { v: "vacation", l: "Semester" },
            { v: "compliance", l: "Kontroll" },
          ].map(t => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="rounded-none bg-transparent px-[12px] py-[7px] text-[11px] text-[#475569] border-b-2 border-transparent -mb-px data-[state=active]:text-[#1D4ED8] data-[state=active]:font-medium data-[state=active]:border-[#1D4ED8] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="chat">
          <Card className="h-[520px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Löneagent — AI-assistent
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
              {/* Quick questions */}
              {messages.length === 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Snabbfrågor:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="bg-[#EFF6FF] text-[#0C447C] border-[0.5px] border-[#B5D4F4] rounded-full text-[11px] font-medium px-[10px] py-[4px] cursor-pointer hover:bg-[#E6F0FD] transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Bot className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">Hej! Jag är din löneagent.</p>
                    <p className="text-xs mt-1">Ställ frågor om löner, förmåner, skattetabeller eller AGI.</p>
                    <p className="text-xs mt-0.5">Jag har tillgång till {ctx.employeeCount} anställdas data.</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-0.5">
                        <User className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {streaming && messages[messages.length - 1]?.content === "" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Tänker...
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                  placeholder="Ställ en fråga om löner, förmåner eller anställda..."
                  disabled={streaming}
                  className="text-sm"
                />
                <Button size="icon" onClick={() => sendMessage(input)} disabled={streaming || !input.trim()}>
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="run">
          <PayrollMonthlyFlow companyId={companyId} onPayrollCreated={() => {}} />
        </TabsContent>

        <TabsContent value="timeline">
          <PayrollTimeline payrollRuns={[]} />
        </TabsContent>

        <TabsContent value="vacation">
          <VacationTracker employees={ctx.employees.map(e => ({
            ...e,
            name: `${e.first_name} ${e.last_name}`,
          }))} />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceAlerts employees={ctx.employees.map(e => ({
            ...e,
            name: `${e.first_name} ${e.last_name}`,
          }))} companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
