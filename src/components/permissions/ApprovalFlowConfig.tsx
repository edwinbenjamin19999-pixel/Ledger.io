import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, GitBranch, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalFlows } from "@/hooks/useApprovalFlows";

interface ApprovalFlowConfigProps { companyId: string;
}

const moduleOptions = [
  { id: "invoices", label: "Fakturor" },
  { id: "bookkeeping", label: "Bokföring" },
  { id: "payroll", label: "Lön" },
  { id: "bank", label: "Bank" },
  { id: "payments", label: "Betalningar" },
  { id: "tax", label: "Skatt" },
  { id: "corporate_actions", label: "Företagshändelser" },
  { id: "expenses", label: "Utlägg" },
];

const actionOptions = [
  { id: "approve", label: "Godkänna" },
  { id: "sign", label: "Signera" },
  { id: "execute", label: "Verkställa" },
  { id: "create", label: "Skapa" },
  { id: "delete", label: "Ta bort" },
];

const roleOptions = [
  { id: "owner", label: "Ägare" },
  { id: "admin", label: "Admin" },
  { id: "accountant", label: "Redovisare" },
  { id: "cfo", label: "CFO" },
  { id: "payroll", label: "Löneansvarig" },
  { id: "project_manager", label: "Projektledare" },
  { id: "board_member", label: "Styrelseledamot" },
  { id: "auditor", label: "Revisor" },
];

export const ApprovalFlowConfig = ({ companyId }: ApprovalFlowConfigProps) => { const { user } = useAuth();
  const { flows, loading, createFlow, refreshFlows } = useApprovalFlows(companyId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFlow, setNewFlow] = useState({ name: "",
    module: "",
    action_type: "",
    min_amount: "",
    steps_count: 1,
    step_role: "owner",
  });

  const handleCreate = async () => { if (!user || !newFlow.name || !newFlow.module || !newFlow.action_type) { toast.error("Fyll i alla obligatoriska fält");
      return;
    }
    setSaving(true);
    try { await createFlow({ company_id: companyId,
        name: newFlow.name,
        module: newFlow.module,
        action_type: newFlow.action_type,
        conditions: newFlow.min_amount ? { min_amount: parseFloat(newFlow.min_amount) } : {},
        steps_count: newFlow.steps_count,
        is_active: true,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      });
      toast.success("Godkännandeflöde skapat");
      setOpen(false);
      setNewFlow({ name: "", module: "", action_type: "", min_amount: "", steps_count: 1, step_role: "owner" });
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa flöde");
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
              <GitBranch className="h-5 w-5" />
              Godkännandeflöden
            </CardTitle>
            <CardDescription>
              Konfigurera stegvisa godkännandekedjor för kritiska åtgärder
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Nytt flöde
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Skapa godkännandeflöde</DialogTitle>
                <DialogDescription>
                  Definiera vilka åtgärder som kräver godkännande och av vem
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Namn</Label>
                  <Input
                    placeholder="T.ex. Fakturaattest > 50 000 kr"
                    value={newFlow.name}
                    onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Modul</Label>
                    <Select value={newFlow.module} onValueChange={(v) => setNewFlow({ ...newFlow, module: v })}>
                      <SelectTrigger><SelectValue placeholder="Välj modul" /></SelectTrigger>
                      <SelectContent>
                        {moduleOptions.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Åtgärd</Label>
                    <Select value={newFlow.action_type} onValueChange={(v) => setNewFlow({ ...newFlow, action_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Välj åtgärd" /></SelectTrigger>
                      <SelectContent>
                        {actionOptions.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Belopp-tröskel (SEK)</Label>
                    <Input
                      type="number"
                      placeholder="Valfritt, t.ex. 50000"
                      value={newFlow.min_amount}
                      onChange={(e) => setNewFlow({ ...newFlow, min_amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Antal godkännandesteg</Label>
                    <Select
                      value={newFlow.steps_count.toString()}
                      onValueChange={(v) => setNewFlow({ ...newFlow, steps_count: parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 steg</SelectItem>
                        <SelectItem value="2">2 steg</SelectItem>
                        <SelectItem value="3">3 steg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Godkännarroll (steg 1)</Label>
                  <Select value={newFlow.step_role} onValueChange={(v) => setNewFlow({ ...newFlow, step_role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                  Skapa flöde
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {flows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Inga godkännandeflöden konfigurerade</p>
            <p className="text-xs mt-1">Skapa ett flöde för att kräva godkännande för kritiska åtgärder</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>Modul</TableHead>
                <TableHead>Åtgärd</TableHead>
                <TableHead>Villkor</TableHead>
                <TableHead>Steg</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flows.map((flow) => (
                <TableRow key={flow.id}>
                  <TableCell className="font-medium">{flow.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {moduleOptions.find((m) => m.id === flow.module)?.label || flow.module}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {actionOptions.find((a) => a.id === flow.action_type)?.label || flow.action_type}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {flow.conditions?.min_amount
                      ? `≥ ${Number(flow.conditions.min_amount).toLocaleString("sv-SE")} kr`
                      : "Alltid"}
                  </TableCell>
                  <TableCell>{flow.steps_count}</TableCell>
                  <TableCell>
                    <Badge variant={flow.is_active ? "default" : "secondary"}>
                      {flow.is_active ? "Aktiv" : "Inaktiv"}
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
