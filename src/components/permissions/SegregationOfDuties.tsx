import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShieldAlert, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SegregationOfDutiesProps { companyId: string;
}

interface SegregationRule { id: string;
  company_id: string;
  action_a: string;
  action_b: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const actionLabels: Record<string, string> = { create_payment: "Skapa betalning",
  approve_payment: "Godkänna betalning",
  sign_payment: "Signera betalning",
  create_invoice: "Skapa faktura",
  approve_invoice: "Godkänna faktura",
  create_payroll: "Skapa lönekörning",
  approve_payroll: "Godkänna lönekörning",
  create_journal: "Skapa verifikation",
  approve_journal: "Godkänna verifikation",
  create_expense: "Skapa utlägg",
  approve_expense: "Godkänna utlägg",
};

const defaultRules = [
  { action_a: "create_payment", action_b: "approve_payment", description: "Samma person kan inte skapa och godkänna en betalning" },
  { action_a: "create_payroll", action_b: "approve_payroll", description: "Samma person kan inte skapa och godkänna löner" },
  { action_a: "create_expense", action_b: "approve_expense", description: "Samma person kan inte skapa och godkänna egna utlägg" },
];

export const SegregationOfDuties = ({ companyId }: SegregationOfDutiesProps) => { const { user } = useAuth();
  const [rules, setRules] = useState<SegregationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState({ action_a: "", action_b: "", description: "" });

  useEffect(() => { loadRules();
  }, [companyId]);

  const loadRules = async () => { try { const { data, error } = await supabase
        .from("segregation_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at");
      if (error) throw error;
      setRules((data ) || []);
    } catch (e) { console.error("Error loading segregation rules:", e);
    } finally { setLoading(false);
    }
  };

  const addRule = async () => { if (!user || !newRule.action_a || !newRule.action_b) { toast.error("Välj båda åtgärder");
      return;
    }
    if (newRule.action_a === newRule.action_b) { toast.error("Åtgärderna måste vara olika");
      return;
    }
    setSaving(true);
    try { const { error } = await supabase.from("segregation_rules").insert({ company_id: companyId,
        action_a: newRule.action_a,
        action_b: newRule.action_b,
        description: newRule.description || null,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success("Regel skapad");
      setOpen(false);
      setNewRule({ action_a: "", action_b: "", description: "" });
      loadRules();
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa regel");
    } finally { setSaving(false);
    }
  };

  const applyDefaults = async () => { if (!user) return;
    setSaving(true);
    try { const inserts = defaultRules.map((r) => ({ company_id: companyId,
        action_a: r.action_a,
        action_b: r.action_b,
        description: r.description,
        created_by: user.id,
      }));
      const { error } = await supabase.from("segregation_rules").insert(inserts);
      if (error) throw error;
      toast.success("Standardregler tillagda");
      loadRules();
    } catch (error: any) { toast.error(error.message || "Kunde inte lägga till standardregler");
    } finally { setSaving(false);
    }
  };

  if (loading) { return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5" />
              Separation av arbetsuppgifter
            </CardTitle>
            <CardDescription>
              Förhindra att samma person utför motstridiga åtgärder
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {rules.length === 0 && (
              <Button variant="outline" size="sm" onClick={applyDefaults} disabled={saving}>
                Lägg till standardregler
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Ny regel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ny separationsregel</DialogTitle>
                  <DialogDescription>
                    Definiera två åtgärder som inte får utföras av samma person
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Åtgärd A</Label>
                      <Select value={newRule.action_a} onValueChange={(v) => setNewRule({ ...newRule, action_a: v })}>
                        <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(actionLabels).map(([id, label]) => (
                            <SelectItem key={id} value={id}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Åtgärd B</Label>
                      <Select value={newRule.action_b} onValueChange={(v) => setNewRule({ ...newRule, action_b: v })}>
                        <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(actionLabels).map(([id, label]) => (
                            <SelectItem key={id} value={id}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Beskrivning</Label>
                    <Input
                      placeholder="Varför behövs denna regel?"
                      value={newRule.description}
                      onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={addRule} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                    Skapa regel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Inga separationsregler konfigurerade</p>
            <p className="text-xs mt-1">Lägg till standardregler eller skapa egna</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Åtgärd A</TableHead>
                <TableHead></TableHead>
                <TableHead>Åtgärd B</TableHead>
                <TableHead>Beskrivning</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Badge variant="outline">{actionLabels[rule.action_a] || rule.action_a}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground text-xs">≠</TableCell>
                  <TableCell>
                    <Badge variant="outline">{actionLabels[rule.action_b] || rule.action_b}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-64 truncate">
                    {rule.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
