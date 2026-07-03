import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Trash2, Shield, TrendingUp, Plus, Save, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props { companyId: string;
}

export function AgentRuleEngine({ companyId }: Props) { const [rules, setRules] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Form state
  const [formPattern, setFormPattern] = useState("");
  const [formField, setFormField] = useState("counterparty");
  const [formAccount, setFormAccount] = useState("");
  const [formVat, setFormVat] = useState("");

  useEffect(() => { loadData();
  }, [companyId]);

  const loadData = async () => { try { const [rulesRes, acctRes] = await Promise.all([
        supabase
          .from("agent_booking_rules")
          .select("*")
          .eq("company_id", companyId)
          .order("hit_count", { ascending: false }),
        supabase
          .from("chart_of_accounts")
          .select("account_number, account_name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("account_number"),
      ]);
      setRules(rulesRes.data || []);
      setAccounts(acctRes.data || []);
    } catch (err) { console.error("Error loading rules:", err);
    } finally { setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => { await supabase
      .from("agent_booking_rules")
      .update({ is_active: !isActive, updated_at: new Date().toISOString() })
      .eq("id", ruleId);
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: !isActive } : r));
  };

  const deleteRule = async (ruleId: string) => { if (!confirm("Vill du ta bort denna regel?")) return;
    await supabase.from("agent_booking_rules").delete().eq("id", ruleId);
    setRules(prev => prev.filter(r => r.id !== ruleId));
    toast({ title: "Regel borttagen" });
  };

  const saveRule = async () => { if (!formPattern || !formAccount) { toast({ title: "Fyll i monster och konto", variant: "destructive" });
      return;
    }
    const acct = accounts.find(a => a.account_number === formAccount);
    const { error } = await supabase.from("agent_booking_rules").insert({ company_id: companyId,
      match_pattern: formPattern.toLowerCase().trim(),
      account_number: formAccount,
      account_name: acct?.account_name || formAccount,
      vat_code: formVat || null,
      rule_type: "manual",
      match_field: formField,
      source: "manual_builder",
      confidence: 0.95,
    });
    if (error) { toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else { toast({ title: "Regel sparad" });
      setFormPattern("");
      setFormAccount("");
      setFormVat("");
      setShowAddDialog(false);
      loadData();
    }
  };

  const filtered = rules.filter(r =>
    !search ||
    r.match_pattern.toLowerCase().includes(search.toLowerCase()) ||
    r.account_number.includes(search) ||
    r.account_name.toLowerCase().includes(search.toLowerCase())
  );

  const manualRules = filtered.filter(r => r.source === "manual_builder" || r.source === "template");
  const learnedRules = filtered.filter(r => r.source === "user_correction" || r.source === "learned" || (!["manual_builder", "template"].includes(r.source)));

  if (loading) { return <div className="h-40 bg-muted/50 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök leverantör, konto, nyckelord..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{rules.length} regler</Badge>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Ny regel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Skapa bokföringsregel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">Om faktura/transaktion innehaller text:</label>
                <Input
                  value={formPattern}
                  onChange={e => setFormPattern(e.target.value)}
                  placeholder="t.ex. adobe, tele2, hyra..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Matchningsfall:</label>
                <Select value={formField} onValueChange={setFormField}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="counterparty">Leverantörsnamn</SelectItem>
                    <SelectItem value="description">Beskrivning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Bokfor på konto:</label>
                <Select value={formAccount} onValueChange={setFormAccount}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Valj konto..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {accounts.slice(0, 80).map(a => (
                      <SelectItem key={a.account_number} value={a.account_number} className="text-xs">
                        {a.account_number} -- {a.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Momskod:</label>
                <Select value={formVat} onValueChange={setFormVat}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Automatisk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveRule} className="w-full gap-1.5">
                <Save className="h-4 w-4" /> Spara regel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Manual rules */}
      {manualRules.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Manuella regler ({manualRules.length})
          </h3>
          <RuleTable rules={manualRules} onToggle={toggleRule} onDelete={deleteRule} />
        </div>
      )}

      {/* Learned rules */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Inlarda regler ({learnedRules.length})
        </h3>
        {learnedRules.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Inga inlärda regler ännu. Agenten lär sig när du korrigerar bokföringar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <RuleTable rules={learnedRules} onToggle={toggleRule} onDelete={deleteRule} />
        )}
      </div>
    </div>
  );
}

function RuleTable({ rules,
  onToggle,
  onDelete,
}: { rules: any[];
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) { return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Leverantör/Nyckelord</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Konto Debet</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Moms</th>
              <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Traffar</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Kalla</th>
              <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Aktiv</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr
                key={rule.id}
                className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${!rule.is_active ? "opacity-40" : ""}`}
              >
                <td className="px-4 py-2.5 font-medium">{rule.match_pattern}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className="text-xs">
                    {rule.account_number} {rule.account_name}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-xs">{rule.vat_code ? `${rule.vat_code}%` : "--"}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="font-mono text-xs">{rule.hit_count}</span>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-[10px]">
                    {rule.source === "template" ? "Mall" : rule.source === "user_correction" ? "Inlard" : rule.source === "manual_builder" ? "Manuell" : "Auto"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => onToggle(rule.id, rule.is_active)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
