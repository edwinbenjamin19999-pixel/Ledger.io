import { useState } from "react";
import { Project } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckCircle, Circle, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

interface Milestone { id: string;
  name: string;
  description?: string;
  invoicePercent?: number;
  invoiceAmount?: number;
  completed: boolean;
  completedAt?: string;
}

interface Props { project: Project;
  totalRevenue: number;
}

export function ProjectMilestonesTab({ project, totalRevenue }: Props) { const budgetRev = project.budget_revenue || totalRevenue || 0;

  // Local state för milestones (would be persisted to DB in production)
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPercent, setNewPercent] = useState("50");

  const handleAdd = () => { if (!newName.trim()) return;
    const pct = parseFloat(newPercent) || 0;
    setMilestones((prev) => [
      ...prev,
      { id: Date.now().toString(),
        name: newName.trim(),
        invoicePercent: pct,
        invoiceAmount: budgetRev * (pct / 100),
        completed: false,
      },
    ]);
    setNewName("");
    setNewPercent("50");
    setShowAdd(false);
  };

  const toggleComplete = (id: string) => { setMilestones((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : undefined }
          : m
      )
    );
  };

  const completedCount = milestones.filter((m) => m.completed).length;
  const totalInvoiceable = milestones
    .filter((m) => m.completed)
    .reduce((s, m) => s + (m.invoiceAmount || 0), 0);

  return (
    <div className="space-y-6 mt-4">
      {/* AI suggestion */}
      <Card className="border-l-4 border-l-[#3b82f6] bg-[#3b82f6]/5">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-[#3b82f6] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">AI-rekommendation: Milstolpefakturering</p>
            <p className="mt-1">
              Projekt med fast pris minskar faktureringsglapp med 67% jamfort med lopande rakning.
              Dela upp projektet i milstolpar och koppla varje milstolpe till en delfaktura.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Milstolpar</p>
            <p className="text-xl font-bold">{completedCount} / {milestones.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Fakturerbart</p>
            <p className="text-xl font-bold text-[#085041]">{fmt(totalInvoiceable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Projektvardet</p>
            <p className="text-xl font-bold">{fmt(budgetRev)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Milstolpar</CardTitle>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Lägg till milstolpe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ny milstolpe</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Namn</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="T.ex. Fas 1 levererad" />
                </div>
                <div>
                  <Label>Faktureringsandel (%)</Label>
                  <Input type="number" value={newPercent} onChange={(e) => setNewPercent(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    = {fmt(budgetRev * ((parseFloat(newPercent) || 0) / 100))} av {fmt(budgetRev)}
                  </p>
                </div>
                <Button onClick={handleAdd} disabled={!newName.trim()} className="w-full bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
                  Lägg till
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Inga milstolpar ännu. Lägg till milstolpar för att spara faktureringsframsteg.
            </p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    m.completed ? "bg-emerald-50/50 border-[#BFE6D6] dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-background"
                  )}
                >
                  <button onClick={() => toggleComplete(m.id)} className="flex-shrink-0">
                    {m.completed ? (
                      <CheckCircle className="h-5 w-5 text-[#085041]" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", m.completed && "line-through text-muted-foreground")}>
                      {m.name}
                    </p>
                    {m.invoiceAmount && m.invoiceAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Faktureras: {fmt(m.invoiceAmount)} ({m.invoicePercent}%)
                      </p>
                    )}
                  </div>
                  {m.completed && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
                      <FileText className="h-3 w-3" />
                      Skapa faktura
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
