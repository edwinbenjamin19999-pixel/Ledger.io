import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Loader2, Bot, CheckCircle, Send, DollarSign,
  FileText, User, Sparkles, ArrowRight,
} from "lucide-react";

interface PayrollMonthlyFlowProps { companyId: string;
  onPayrollCreated: () => void;
}

interface ChatMessage { id: string;
  role: "user" | "assistant";
  content: string;
  actions?: any[];
  timestamp: Date;
}

const QUICK_COMMANDS = [
  "Kör lön för denna månad",
  "Visa alla anställda",
  "Vem har högst lön?",
  "Beräkna arbetsgivarkostnad",
];

const EMPLOYER_FEE_RATE = 0.3142;

export const PayrollMonthlyFlow = ({ companyId, onPayrollCreated }: PayrollMonthlyFlowProps) => { const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [runningPayroll, setRunningPayroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const monthNames = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December",
  ];

  useEffect(() => { // Welcome message
    setMessages([{ id: "welcome",
      role: "assistant",
      content: `Hej! Jag är din löneagent. Berätta vad du vill göra — jag kan ändra löner, lägga till anställda, köra lönekörningar och mer.\n\nSäg t.ex. *"Edwin har fått löneförhöjning till 45 000 kr"* eller *"Kör lön för denna månad"*.`,
      timestamp: new Date(),
    }]);
  }, [companyId]);

  useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text?: string) => { const msgText = text || input.trim();
    if (!msgText || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(),
      role: "user",
      content: msgText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try { const history = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("payroll-agent-chat", { body: { message: msgText,
          companyId,
          conversationHistory: history.slice(-20),
        },
      });

      if (error) throw error;

      const assistantMsg: ChatMessage = { id: crypto.randomUUID(),
        role: "assistant",
        content: data.message || "Jag förstod inte riktigt. Kan du omformulera?",
        actions: data.actions,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Handle executed actions
      if (data.actions?.length > 0) { for (const action of data.actions) { if (action.type === "update_salary" && action.success) { toast.success(`Lön uppdaterad till ${Number(action.new_salary).toLocaleString("sv-SE")} kr/mån`);
            onPayrollCreated(); // Refresh parent data
          }
          if (action.type === "add_employee" && action.success) { toast.success(`${action.employee?.first_name} ${action.employee?.last_name} tillagd!`);
            onPayrollCreated();
          }
          if (action.type === "update_employee" && action.success) { toast.success("Anställd uppdaterad!");
            onPayrollCreated();
          }
          if (action.type === "run_payroll" && action.success) { await executePayroll(action.deviations || {});
          }
          if (!action.success && action.error) { toast.error(`Fel: ${action.error}`);
          }
        }
      }
    } catch (err: any) { console.error("Agent error:", err);
      setMessages(prev => [...prev, { id: crypto.randomUUID(),
        role: "assistant",
        content: "Något gick fel. Försök igen.",
        timestamp: new Date(),
      }]);
    } finally { setLoading(false);
      inputRef.current?.focus();
    }
  };

  const executePayroll = async (deviations: Record<string, any>) => { setRunningPayroll(true);
    try { // Check for existing payroll run for this period
      const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

      const { data: existingRun } = await supabase
        .from("payroll_runs")
        .select("id, status")
        .eq("company_id", companyId)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .not("status", "in", '("cancelled","rejected")')
        .maybeSingle();

      if (existingRun) { const statusLabel = existingRun.status === "approved" ? "godkänd" : "utkast";
        toast.error(`Det finns redan en lönekörning (${statusLabel}) för denna period. Gå till Lönekörningar för att hantera den.`);
        setMessages(prev => [...prev, { id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ Det finns redan en lönekörning (${statusLabel}) för ${monthNames[now.getMonth()]} ${now.getFullYear()}. Du kan inte skapa en till för samma period. Gå till fliken **Lönekörningar** för att granska eller godkänna den befintliga.`,
          timestamp: new Date(),
        }]);
        setRunningPayroll(false);
        return;
      }

      const { data: employees } = await supabase
        .from("employees")
        .select("id, first_name, last_name, monthly_salary, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (!employees?.length) { toast.error("Inga aktiva anställda att köra lön för.");
        setRunningPayroll(false);
        return;
      }

      let totalGross = 0, totalTax = 0, totalNet = 0;
      const lines: any[] = [];

      for (const emp of employees) { const baseSalary = emp.monthly_salary || 0;
        const name = `${emp.first_name} ${emp.last_name}`;
        const dev = deviations[name] || deviations[emp.first_name] || {};

        let gross = baseSalary;
        if (dev.sick_days > 0) { const dailyRate = baseSalary / 21.75;
          const karens = dailyRate;
          const sjuklon = Math.max(0, dev.sick_days - 1) * dailyRate * 0.8;
          gross = baseSalary - karens - (dev.sick_days - 1) * dailyRate + sjuklon;
        }
        if (dev.bonus > 0) gross += dev.bonus;
        if (dev.overtime_hours > 0) { const hourlyRate = baseSalary / 168;
          gross += dev.overtime_hours * hourlyRate * 1.5;
        }

        gross = Math.round(gross);
        const tax = Math.round(gross * 0.32);
        const net = gross - tax;
        const socialFees = Math.round(gross * EMPLOYER_FEE_RATE);

        totalGross += gross;
        totalTax += tax;
        totalNet += net;

        lines.push({ employee_id: emp.id, name, gross, tax, net, socialFees });
      }

      const totalSocialFees = Math.round(totalGross * EMPLOYER_FEE_RATE);
      const totalEmployerCost = totalGross + totalSocialFees;
      const pStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const pEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lDay}`;
      const paymentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-25`;

      const { data: user } = await supabase.auth.getUser();
      const { data: payrollRun, error } = await supabase
        .from("payroll_runs")
        .insert({ company_id: companyId,
          period_start: pStart,
          period_end: pEnd,
          payment_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-25`,
          status: "draft",
          total_gross: totalGross,
          total_net: totalNet,
          total_tax: totalTax,
          total_employer_cost: totalEmployerCost,
          created_by: user?.user?.id || "",
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      await supabase.from("payroll_lines").insert(
        lines.map(l => ({ payroll_run_id: payrollRun.id,
          employee_id: l.employee_id,
          gross_salary: l.gross,
          tax_deduction: l.tax,
          net_salary: l.net,
          employer_social_fees: l.socialFees,
        }))
      );

      const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
      const summaryLines = lines.map(l => `| ${l.name} | ${fmt(l.gross)} kr | ${fmt(l.tax)} kr | ${fmt(l.net)} kr |`).join("\n");

      setMessages(prev => [...prev, { id: crypto.randomUUID(),
        role: "assistant",
        content: `✅ **Lönekörning skapad för ${monthNames[now.getMonth()]} ${now.getFullYear()}**\n\n| Anställd | Brutto | Skatt | Netto |\n|---|---|---|---|\n${summaryLines}\n\n**Totalt:** ${fmt(totalGross)} kr brutto, ${fmt(totalEmployerCost)} kr arbetsgivarkostnad\n\nLönekörningen är sparad som utkast. Gå till **Lönekörningar** för att granska och godkänna.`,
        timestamp: new Date(),
      }]);

      toast.success("Lönekörning skapad!");
      onPayrollCreated();
    } catch (err: any) { toast.error("Kunde inte köra lön: " + err.message);
    } finally { setRunningPayroll(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Löneagent</CardTitle>
            <CardDescription className="text-xs">
              Ge instruktioner på naturligt språk — jag utför ändringarna
            </CardDescription>
          </div>
          {loading && (
            <Badge variant="secondary" className="ml-auto gap-1 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              Tänker...
            </Badge>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${ msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.actions.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        {a.success ? (
                          <CheckCircle className="h-3 w-3 text-[#085041]" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-destructive" />
                        )}
                        <span className="text-muted-foreground">
                          {a.type === "update_salary" && `Lön uppdaterad`}
                          {a.type === "add_employee" && `Anställd tillagd`}
                          {a.type === "update_employee" && `Anställd uppdaterad`}
                          {a.type === "run_payroll" && `Lönekörning startad`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-foreground/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
          {(loading || runningPayroll) && (
            <div className="flex gap-2 items-start">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {runningPayroll ? "Beräknar löner..." : "Analyserar..."}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick commands - only show when no messages yet */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => sendMessage(cmd)}
              className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="T.ex. 'Edwin har fått löneförhöjning till 45 000 kr'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || runningPayroll}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || runningPayroll}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
