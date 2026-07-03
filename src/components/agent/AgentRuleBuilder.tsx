import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, Wrench, Activity, Save, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RuleBuilderProps { companyId: string;
}

interface RuleTemplate { label: string;
  pattern: string;
  account: string;
  accountName: string;
  vat: string;
}

const TEMPLATES: RuleTemplate[] = [
  { label: "Alla Tele2-transaktioner → konto 6210 (Telefon)", pattern: "tele2", account: "6210", accountName: "Telefon", vat: "25" },
  { label: "Transaktioner med \"lön\" i text → konto 7010", pattern: "lön", account: "7010", accountName: "Löner tjänstemän", vat: "0" },
  { label: "Belopp < 500 kr med \"ICA\" → konto 7690", pattern: "ica", account: "7690", accountName: "Övriga kostnader", vat: "25" },
  { label: "Adobe-abonnemang → konto 6911 (SaaS)", pattern: "adobe", account: "6911", accountName: "Programvarulicenser/SaaS", vat: "25" },
  { label: "SJ-biljetter → konto 6712 (Tågresor)", pattern: "sj", account: "6712", accountName: "Tågresor", vat: "6" },
  { label: "Circle K drivmedel → konto 6770", pattern: "circle k", account: "6770", accountName: "Drivmedel tjänsteresor", vat: "25" },
  { label: "Scandic hotell → konto 6720", pattern: "scandic", account: "6720", accountName: "Hotell och logi", vat: "12" },
  { label: "PostNord → konto 6250 (Postbefordran)", pattern: "postnord", account: "6250", accountName: "Postbefordran", vat: "0" },
];

interface Condition { field: "counterparty" | "description" | "amount_min" | "amount_max";
  value: string;
}

export function AgentRuleBuilder({ companyId }: RuleBuilderProps) { const [accounts, setAccounts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "counterparty", value: "" },
  ]);
  const [targetAccount, setTargetAccount] = useState("");
  const [vatOverride, setVatOverride] = useState("");
  const [confidenceOverride, setConfidenceOverride] = useState("95");

  useEffect(() => { loadData();
  }, [companyId]);

  const loadData = async () => { try { const [acctRes, rulesRes] = await Promise.all([
        supabase
          .from("chart_of_accounts")
          .select("account_number, account_name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("account_number"),
        supabase
          .from("agent_booking_rules")
          .select("*")
          .eq("company_id", companyId)
          .order("hit_count", { ascending: false })
          .limit(50),
      ]);
      setAccounts(acctRes.data || []);
      setRules(rulesRes.data || []);
    } catch (err) { console.error(err);
    } finally { setLoading(false);
    }
  };

  const addTemplate = async (template: RuleTemplate) => { const { error } = await supabase.from("agent_booking_rules").insert({ company_id: companyId,
      match_pattern: template.pattern,
      account_number: template.account,
      account_name: template.accountName,
      vat_code: template.vat,
      rule_type: "manual",
      match_field: "counterparty",
      source: "template",
      confidence: 0.95,
    });
    if (error) { toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else { toast({ title: "Regel tillagd", description: template.label });
      loadData();
    }
  };

  const saveCustomRule = async () => { const cpCondition = conditions.find(c => c.field === "counterparty" && c.value.trim());
    const descCondition = conditions.find(c => c.field === "description" && c.value.trim());
    const pattern = cpCondition?.value || descCondition?.value || "";
    if (!pattern || !targetAccount) { toast({ title: "Fyll i leverantör/beskrivning och konto", variant: "destructive" });
      return;
    }

    const acct = accounts.find(a => a.account_number === targetAccount);
    const { error } = await supabase.from("agent_booking_rules").insert({ company_id: companyId,
      match_pattern: pattern.toLowerCase().trim(),
      account_number: targetAccount,
      account_name: acct?.account_name || targetAccount,
      vat_code: vatOverride || null,
      rule_type: "manual",
      match_field: cpCondition ? "counterparty" : "description",
      source: "manual_builder",
      confidence: parseInt(confidenceOverride) / 100,
    });

    if (error) { toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else { toast({ title: "Regel sparad!" });
      setConditions([{ field: "counterparty", value: "" }]);
      setTargetAccount("");
      setVatOverride("");
      setConfidenceOverride("95");
      loadData();
    }
  };

  const deleteRule = async (id: string) => { await supabase.from("agent_booking_rules").delete().eq("id", id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast({ title: "Regel borttagen" });
  };

  if (loading) { return <div className="h-60 bg-muted/50 rounded-lg animate-pulse" />;
  }

  const fieldLabels: Record<string, string> = { counterparty: "Leverantör innehåller",
    description: "Beskrivning innehåller",
    amount_min: "Belopp minst (kr)",
    amount_max: "Belopp högst (kr)",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* LEFT: Template library */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Regelbibliotek
          </CardTitle>
          <CardDescription className="text-xs">Klicka för att lägga till</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 p-3">
          {TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => addTemplate(t)}
              className="w-full text-left text-xs p-2.5 rounded-md border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors"
            >
              <span className="text-muted-foreground mr-1.5">□</span>
              {t.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* MIDDLE: Rule builder */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Regelbyggare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{i === 0 ? "NÄR:" : "OCH:"}</span>
                <Select
                  value={cond.field}
                  onValueChange={v => { const c = [...conditions];
                    c[i].field = v as Condition["field"];
                    setConditions(c);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="counterparty">Leverantör innehåller</SelectItem>
                    <SelectItem value="description">Beskrivning innehåller</SelectItem>
                    <SelectItem value="amount_min">Belopp minst</SelectItem>
                    <SelectItem value="amount_max">Belopp högst</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={cond.value}
                  onChange={e => { const c = [...conditions];
                    c[i].value = e.target.value;
                    setConditions(c);
                  }}
                  placeholder="Värde..."
                  className="h-7 text-xs flex-1"
                />
                {conditions.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setConditions(conditions.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1"
              onClick={() => setConditions([...conditions, { field: "description", value: "" }])}
            >
              <Plus className="h-3 w-3" /> Lägg till villkor
            </Button>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">→ KONTO:</span>
                <Select value={targetAccount} onValueChange={setTargetAccount}>
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Välj kontonr..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {accounts.slice(0, 80).map(a => (
                      <SelectItem key={a.account_number} value={a.account_number} className="text-xs">
                        {a.account_number} – {a.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">→ MOMS:</span>
                <Select value={vatOverride} onValueChange={setVatOverride}>
                  <SelectTrigger className="h-7 text-xs w-24">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                  </SelectContent>
                </Select>

                <span className="text-xs text-muted-foreground shrink-0 ml-2">KONFIDENS:</span>
                <Input
                  value={confidenceOverride}
                  onChange={e => setConfidenceOverride(e.target.value)}
                  className="h-7 text-xs w-16"
                  type="number"
                  min={50}
                  max={99}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <Button onClick={saveCustomRule} className="w-full gap-1.5">
            <Save className="h-4 w-4" /> Spara regel
          </Button>
        </CardContent>
      </Card>

      {/* RIGHT: Rule log */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Regellog
          </CardTitle>
          <CardDescription className="text-xs">{rules.length} regler aktiva</CardDescription>
        </CardHeader>
        <CardContent className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
          {rules.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Inga regler ännu. Skapa en ovan eller låt agenten lära sig automatiskt.
            </p>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className="border rounded-md p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{rule.match_pattern} → {rule.account_number}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {rule.hit_count > 0 ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-[#22c55e]" />
                      Träffade {rule.hit_count} transaktioner
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-[#f59e0b]" />
                      0 träffar — kontrollera villkoret
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {rule.source === "template" ? "Mall" : rule.source === "user_correction" ? "Inlärd" : "Manuell"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
