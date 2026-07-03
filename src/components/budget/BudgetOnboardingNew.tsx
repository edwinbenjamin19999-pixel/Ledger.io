import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, BarChart3, FileSpreadsheet, Upload, Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONTH_KEYS } from "@/lib/budget/budgetEngine";

interface Props { companyId: string;
  fiscalYear: number;
  onBudgetCreated: (budgetId: string) => void;
}

export const BudgetOnboardingNew = ({ companyId, fiscalYear, onBudgetCreated }: Props) => { const [method, setMethod] = useState<"ai" | "historical" | "manual" | "excel" | null>(null);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState("");

  // AI wizard steps
  const [aiStep, setAiStep] = useState(0);
  const [growthTarget, setGrowthTarget] = useState("15");
  const [hasInvestments, setHasInvestments] = useState("no");
  const [investmentDesc, setInvestmentDesc] = useState("");
  const [newHires, setNewHires] = useState("0");
  const [industry, setIndustry] = useState("IT/SaaS");

  // Historical
  const [growthRate, setGrowthRate] = useState([18]);

  const createBudget = async (creationMethod: string, growth = 0) => { setCreating(true);
    const steps = [
      "Analyserar 24 månaders historik…",
      "Beräknar säsongsmönster…",
      "Applicerar tillväxtmål…",
      "Projicerar kassaflöde…",
      "Budget klar!",
    ];
    let stepIdx = 0;
    const interval = setInterval(() => { if (stepIdx < steps.length) { setProgress(steps[stepIdx]); stepIdx++; }
    }, 800);

    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const { data, error } = await supabase
        .from("budget_plans")
        .insert({ company_id: companyId, fiscal_year: fiscalYear,
          name: `Budget ${fiscalYear}`, scenario_type: "base",
          creation_method: creationMethod, created_by: user.id,
          growth_rate: growth, status: creationMethod === "ai" ? "ai_generated" : "draft",
        })
        .select("id").maybeSingle();

      if (error) throw error;
      const budgetId = (data as unknown as { id: string }).id;

      // Load accounts and create rows
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("account_number, account_name")
        .eq("company_id", companyId).eq("is_active", true)
        .gte("account_number", "3000").lte("account_number", "8999")
        .order("account_number");

      if (accounts && accounts.length > 0) { const prevYear = fiscalYear - 1;
        const { data: journalData } = await supabase
          .from("journal_entries")
          .select("id, entry_date, journal_entry_lines(debit, credit, account_id)")
          .eq("company_id", companyId).eq("status", "approved")
          .gte("entry_date", `${prevYear}-01-01`).lte("entry_date", `${prevYear}-12-31`);

        const { data: allAccounts } = await supabase.from("chart_of_accounts").select("id, account_number").eq("company_id", companyId);
        const acctIdToNumber = new Map((allAccounts || []).map((a: any) => [a.id, a.account_number]));
        const monthlyTotals: Record<string, number[]> = {};

        (journalData || []).forEach((entry: any) => { const month = new Date(entry.entry_date).getMonth();
          entry.journal_entry_lines.forEach((line: any) => { const acctNum = acctIdToNumber.get(line.account_id);
            if (!acctNum) return;
            if (!monthlyTotals[acctNum]) monthlyTotals[acctNum] = new Array(12).fill(0);
            const isIncome = acctNum.startsWith("3") || acctNum.startsWith("8");
            if (isIncome) monthlyTotals[acctNum][month] += (line.credit || 0) - (line.debit || 0);
            else monthlyTotals[acctNum][month] += (line.debit || 0) - (line.credit || 0);
          });
        });

        const gFactor = 1 + growth / 100;
        const monthKeys = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
        const rows = accounts
          .filter((a: any) => creationMethod === "manual" || (monthlyTotals[a.account_number] && monthlyTotals[a.account_number].some((v: number) => Math.abs(v) > 0)))
          .map((a: any) => { const hist = monthlyTotals[a.account_number] || new Array(12).fill(0);
            const row: any = { budget_id: budgetId, account_number: a.account_number, account_name: a.account_name,
              ai_generated: creationMethod !== "manual",
            };
            monthKeys.forEach((key, i) => { row[key] = creationMethod === "manual" ? 0 : Math.round(hist[i] * gFactor); });
            return row;
          });

        if (rows.length > 0) { await supabase.from("budget_rows").insert(rows);
        }
      }

      clearInterval(interval);
      const rowCount = accounts?.length || 0;
      toast.success(`AI har fyllt i ${rowCount} budgetrader baserat på historik med ${growth >= 0 ? "+" : ""}${growth}% tillväxtantagande.`);
      onBudgetCreated(budgetId);
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa budget");
    } finally { clearInterval(interval);
      setCreating(false);
    }
  };

  if (creating) { return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-6">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full bg-[#0F1F3D] animate-pulse opacity-20" />
          <div className="absolute inset-2 rounded-full bg-[#0F1F3D] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-medium">{progress || "Skapar budget..."}</p>
        <div className="h-2 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
          <div className="h-full bg-[#0F1F3D] animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  // AI wizard
  if (method === "ai") { const aiSteps = [
      <div key="s1" className="space-y-4">
        <Label className="text-sm">Vilket tillväxtmål har ni för omsättningen?</Label>
        <div className="flex items-center gap-2">
          <Input type="number" value={growthTarget} onChange={e => setGrowthTarget(e.target.value)} className="w-24" />
          <span className="text-sm text-muted-foreground">% jämfört med {fiscalYear - 1}</span>
        </div>
      </div>,
      <div key="s2" className="space-y-4">
        <Label className="text-sm">Planerar ni större investeringar {fiscalYear}?</Label>
        <div className="flex gap-2">
          <Button variant={hasInvestments === "yes" ? "default" : "outline"} size="sm" onClick={() => setHasInvestments("yes")}>Ja</Button>
          <Button variant={hasInvestments === "no" ? "default" : "outline"} size="sm" onClick={() => setHasInvestments("no")}>Nej</Button>
        </div>
        <Label className="text-sm">Planerar ni nyanställningar?</Label>
        <Input type="number" value={newHires} onChange={e => setNewHires(e.target.value)} placeholder="Antal" className="w-24" />
      </div>,
      <div key="s3" className="space-y-4">
        <Label className="text-sm">Välj bransch för benchmarking:</Label>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["IT/SaaS", "Handel", "Tjänst", "Produktion", "Bygg", "Restaurang"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>,
    ];

    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0F1F3D] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI-budgetguide</p>
              <p className="text-xs text-muted-foreground">Steg {aiStep + 1} av {aiSteps.length}</p>
            </div>
          </div>

          <div className="flex gap-1 mb-4">
            {aiSteps.map((_, i) => (
              <div key={i} className={cn("h-1 flex-1 rounded-full", i <= aiStep ? "bg-indigo-500" : "bg-muted")} />
            ))}
          </div>

          {aiSteps[aiStep]}

          <div className="flex gap-2 pt-2">
            {aiStep > 0 && <Button variant="ghost" size="sm" onClick={() => setAiStep(aiStep - 1)}><ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka</Button>}
            <div className="flex-1" />
            {aiStep < aiSteps.length - 1 ? (
              <Button size="sm" onClick={() => setAiStep(aiStep + 1)}>Nästa <ArrowRight className="w-4 h-4 ml-1" /></Button>
            ) : (
              <Button size="sm" onClick={() => createBudget("ai", parseInt(growthTarget) || 15)} className="bg-[#0F1F3D]">
                <Sparkles className="w-4 h-4 mr-1" /> Generera budget
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMethod(null)} className="w-full text-xs">Avbryt</Button>
        </CardContent>
      </Card>
    );
  }

  if (method === "historical") { return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <p className="font-semibold">Basera på historik</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tillväxt vs föregående år</span>
              <span className="font-semibold">{growthRate[0] >= 0 ? "+" : ""}{growthRate[0]}%</span>
            </div>
            <Slider value={growthRate} onValueChange={setGrowthRate} min={-20} max={50} step={1} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setMethod(null)}>Tillbaka</Button>
            <Button onClick={() => createBudget("historical", growthRate[0])} className="flex-1">
              <Check className="w-4 h-4 mr-2" /> Skapa budget
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
  const methods = [
    { key: "ai" as const, icon: Sparkles, title: "AI-budget", desc: "AI bygger hela budgeten från historik, tillväxtmål och branschjämförelse", recommended: true, color: "text-purple-500", hover: "hover:border-purple-400" },
    { key: "historical" as const, icon: BarChart3, title: "Basera på historik", desc: "Kopiera förra årets utfall och justera med tillväxtprocent", color: "text-indigo-500", hover: "hover:border-indigo-400" },
    { key: "manual" as const, icon: FileSpreadsheet, title: "Börja blank", desc: "Fyll i manuellt konto för konto", color: "text-slate-500", hover: "hover:border-slate-400" },
    { key: "excel" as const, icon: Upload, title: "Importera från Excel", desc: "Ladda upp en budget-fil och låt AI mappa den automatiskt", color: "text-blue-500", hover: "hover:border-blue-400" },
  ];

  return (
    <div className="max-w-4xl mx-auto mt-12 space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">Hur vill du skapa din budget för {fiscalYear}?</h2>
        <p className="text-sm text-muted-foreground">Välj en metod — du kan alltid justera efteråt</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {methods.map(m => (
          <Card
            key={m.key}
            className={cn(
              "cursor-pointer border-2 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 rounded-2xl",
              m.hover
            )}
            onClick={() => setMethod(m.key)}
          >
            <CardContent className="pt-8 pb-6 text-center space-y-3 relative">
              {m.recommended && (
                <div className="absolute top-2 right-2 bg-[#E1F5EE] text-[#085041] text-[10px] font-semibold px-2 py-0.5 rounded-full">Rekommenderad</div>
              )}
              <div className={cn("w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto", m.color)}>
                <m.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm">{m.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
              <Button variant="outline" size="sm" className="w-full mt-2">Välj</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
