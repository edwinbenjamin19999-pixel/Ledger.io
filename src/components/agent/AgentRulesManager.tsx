import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Search, Trash2, Shield, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AgentRulesManagerProps { companyId: string;
}

export function AgentRulesManager({ companyId }: AgentRulesManagerProps) { const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadRules();
  }, [companyId]);

  const loadRules = async () => { try { const { data } = await supabase
        .from("agent_booking_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("hit_count", { ascending: false });
      setRules(data || []);
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

  const filtered = rules.filter(r =>
    !search ||
    r.match_pattern.toLowerCase().includes(search.toLowerCase()) ||
    r.account_number.includes(search) ||
    r.account_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) { return <div className="h-40 bg-muted/50 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök regler..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{rules.length} regler totalt</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {rules.length === 0
                ? "Inga regler ännu. Agenten lär sig automatiskt när du korrigerar bokföringar."
                : "Inga regler matchar din sökning."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((rule) => (
            <Card key={rule.id} className={`transition-opacity ${!rule.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{rule.match_pattern}</span>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="secondary">
                        {rule.account_number} {rule.account_name}
                      </Badge>
                      {rule.vat_code && (
                        <Badge variant="outline" className="text-xs">
                          Moms {rule.vat_code}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Använd {rule.hit_count} gånger
                      </span>
                      <span>Konfidens: {(rule.confidence * 100).toFixed(0)}%</span>
                      <span>Källa: {rule.source === "user_correction" ? "Användarkorrigering" : rule.source}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
