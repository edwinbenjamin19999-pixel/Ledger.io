import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { streamAIResponse } from "@/lib/stream-helpers";
import { toast } from "sonner";
import { Sparkles, BarChart3, FileSpreadsheet, Loader2, ArrowRight, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface BudgetOnboardingProps { companyId: string;
  fiscalYear: number;
  onBudgetCreated: (budgetId: string) => void;
}

const AI_QUESTIONS = [
  "Vad är ditt mål för omsättningen {year}?",
  "Planerar du att anställa fler eller förändra personalkostnader?",
  "Finns det stora investeringar planerade?",
  "Vilken marginal siktar du på?",
];

export const BudgetOnboarding = ({ companyId, fiscalYear, onBudgetCreated }: BudgetOnboardingProps) => { const [method, setMethod] = useState<"ai" | "historical" | "manual" | null>(null);
  const [aiStep, setAiStep] = useState(0);
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState("");
  const [growthRate, setGrowthRate] = useState([18]);
  const [creating, setCreating] = useState(false);

  const createBudget = async (creationMethod: string, assumptions: Json = {}, growth = 0) => { setCreating(true);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const budgetPlan: Database["public"]["Tables"]["budget_plans"]["Insert"] = {
        company_id: companyId,
        fiscal_year: fiscalYear,
        name: `Budget ${fiscalYear}`,
        scenario_type: "base",
        creation_method: creationMethod,
        created_by: user.id,
        ai_assumptions: assumptions,
        growth_rate: growth,
      };

      const { data, error } = await supabase
        .from("budget_plans")
        .insert(budgetPlan)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      const budgetId = (data as unknown as { id: string }).id;

      // Load accounts and historical data to create rows
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("account_number, account_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .gte("account_number", "3000")
        .lte("account_number", "8999")
        .order("account_number");

      if (accounts && accounts.length > 0) { // Load historical monthly data for the previous year
        const prevYear = fiscalYear - 1;
        const { data: journalData } = await supabase
          .from("journal_entries")
          .select(`id, entry_date, journal_entry_lines(debit, credit, account_id)`)
          .eq("company_id", companyId)
          .eq("status", "approved")
          .gte("entry_date", `${prevYear}-01-01`)
          .lte("entry_date", `${prevYear}-12-31`);

        // Build monthly account totals
        const { data: allAccounts } = await supabase
          .from("chart_of_accounts")
          .select("id, account_number")
          .eq("company_id", companyId);

        const acctIdToNumber = new Map((allAccounts || []).map((a: any) => [a.id, a.account_number]));
        const monthlyTotals: Record<string, number[]> = {};

        (journalData || []).forEach((entry: any) => { const month = new Date(entry.entry_date).getMonth();
          entry.journal_entry_lines.forEach((line: any) => { const acctNum = acctIdToNumber.get(line.account_id);
            if (!acctNum) return;
            if (!monthlyTotals[acctNum]) monthlyTotals[acctNum] = new Array(12).fill(0);
            const isIncome = acctNum.startsWith("3") || acctNum.startsWith("8");
            if (isIncome) { monthlyTotals[acctNum][month] += (line.credit || 0) - (line.debit || 0);
            } else { monthlyTotals[acctNum][month] += (line.debit || 0) - (line.credit || 0);
            }
          });
        });

        const gFactor = 1 + growth / 100;
        const monthKeys = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
        const rows = accounts
          .filter((a: any) => { if (creationMethod === "manual") return true;
            const hist = monthlyTotals[a.account_number];
            return hist && hist.some((v: number) => Math.abs(v) > 0);
          })
          .map((a: any) => { const hist = monthlyTotals[a.account_number] || new Array(12).fill(0);
            const row: any = { budget_id: budgetId,
              account_number: a.account_number,
              account_name: a.account_name,
              ai_generated: creationMethod !== "manual",
            };
            monthKeys.forEach((key, i) => { row[key] = creationMethod === "manual" ? 0 : Math.round(hist[i] * gFactor);
            });
            return row;
          });

        if (rows.length > 0) { const { error: rowError } = await supabase.from("budget_rows").insert(rows);
          if (rowError) console.error("Row insert error:", rowError);
        }
      }

      toast.success("Budget skapad!");
      onBudgetCreated(budgetId);
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa budget");
    } finally { setCreating(false);
    }
  };

  const handleAiAnswer = () => { if (!currentAnswer.trim()) return;
    const newAnswers = [...aiAnswers, currentAnswer];
    setAiAnswers(newAnswers);
    setCurrentAnswer("");

    if (aiStep < AI_QUESTIONS.length - 1) { setAiStep(aiStep + 1);
    } else { setAiGenerating(true);
      const steps = [
        "Analyserar historik...",
        "Beräknar säsongsvariation...",
        "Applicerar tillväxtmål...",
        "Budget klar!",
      ];
      let i = 0;
      const interval = setInterval(() => { setAiProgress(steps[i]);
        i++;
        if (i >= steps.length) { clearInterval(interval);
          createBudget("ai", { revenue_goal: newAnswers[0],
            staffing: newAnswers[1],
            investments: newAnswers[2],
            margin: newAnswers[3],
          }, 15);
        }
      }, 1200);
    }
  };

  if (creating || aiGenerating) { return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="py-12 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium">{aiProgress || "Skapar budget..."}</p>
        </CardContent>
      </Card>
    );
  }

  if (method === "ai") { return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-[#3b82f6]" />
            AI bygger din budget
          </CardTitle>
          <CardDescription>Fråga {aiStep + 1} av {AI_QUESTIONS.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiAnswers.map((ans, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs text-muted-foreground">{AI_QUESTIONS[i].replace("{year}", String(fiscalYear))}</p>
              <p className="text-sm bg-muted rounded-lg px-3 py-2">{ans}</p>
            </div>
          ))}
          <div className="space-y-2">
            <p className="text-sm font-medium">{AI_QUESTIONS[aiStep].replace("{year}", String(fiscalYear))}</p>
            <div className="flex gap-2">
              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Skriv fritt..."
                onKeyDown={(e) => e.key === "Enter" && handleAiAnswer()}
                autoFocus
              />
              <Button onClick={handleAiAnswer} disabled={!currentAnswer.trim()} size="icon">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMethod(null)}>
            Tillbaka
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (method === "historical") { return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Basera på historik
          </CardTitle>
          <CardDescription>Kopiera föregående års utfall med tillväxtjustering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tillväxt vs föregående år</span>
              <span className="font-semibold text-primary">{growthRate[0] >= 0 ? "+" : ""}{growthRate[0]}%</span>
            </div>
            <Slider
              value={growthRate}
              onValueChange={setGrowthRate}
              min={-20}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-20%</span>
              <span>+50%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            Baserat på din trend rekommenderar vi ca +{growthRate[0]}%. Du kan justera konto för konto efteråt.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setMethod(null)}>Tillbaka</Button>
            <Button onClick={() => createBudget("historical", {}, growthRate[0])} className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              Skapa budget
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (method === "manual") { createBudget("manual");
    return null;
  }

  // Method selection
  return (
    <div className="max-w-3xl mx-auto mt-12 space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">Hur vill du skapa din budget för {fiscalYear}?</h2>
        <p className="text-sm text-muted-foreground">Välj en metod — du kan alltid justera efteråt</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-[#3b82f6] hover:shadow-md transition-all" onClick={() => setMethod("ai")}>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <h3 className="font-semibold">AI-budget</h3>
            <p className="text-xs text-muted-foreground">AI skapar hela budgeten från din historik och dina mål</p>
            <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); setMethod("ai"); }}>Välj</Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all" onClick={() => setMethod("historical")}>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Basera på historik</h3>
            <p className="text-xs text-muted-foreground">Kopiera förra årets utfall och justera för tillväxt</p>
            <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); setMethod("historical"); }}>Välj</Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all" onClick={() => setMethod("manual")}>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Börja blank</h3>
            <p className="text-xs text-muted-foreground">Fyll i manuellt konto för konto</p>
            <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); setMethod("manual"); }}>Välj</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
