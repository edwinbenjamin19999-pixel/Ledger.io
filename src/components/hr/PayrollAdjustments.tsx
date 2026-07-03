import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface PayrollAdjustment { id: string;
  adjustment_type: string;
  description: string | null;
  amount: number;
  hours: number | null;
}

interface PayrollAdjustmentsProps { payrollLineId: string;
  employeeName: string;
  onUpdate: () => void;
}

const adjustmentTypes = [
  { value: "overtime_50", label: "Övertid 50%" },
  { value: "overtime_100", label: "Övertid 100%" },
  { value: "bonus", label: "Bonus" },
  { value: "sick_leave", label: "Sjukfrånvaro" },
  { value: "vacation_pay", label: "Semesterersättning" },
  { value: "other_addition", label: "Annat tillägg" },
  { value: "other_deduction", label: "Annat avdrag" },
];

export const PayrollAdjustments = ({ payrollLineId, employeeName, onUpdate }: PayrollAdjustmentsProps) => { const [showDialog, setShowDialog] = useState(false);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [newAdjustment, setNewAdjustment] = useState({ type: "",
    description: "",
    amount: "",
    hours: "",
  });

  const loadAdjustments = async () => { try { const { data, error } = await supabase
        .from("payroll_adjustments")
        .select("*")
        .eq("payroll_line_id", payrollLineId);

      if (error) throw error;
      setAdjustments(data || []);
    } catch (error: any) { console.error("Error loading adjustments:", error);
    }
  };

  const addAdjustment = async () => { if (!newAdjustment.type || !newAdjustment.amount) { toast.error("Fyll i typ och belopp");
      return;
    }

    try { const { error } = await supabase
        .from("payroll_adjustments")
        .insert({ payroll_line_id: payrollLineId,
          adjustment_type: newAdjustment.type,
          description: newAdjustment.description || null,
          amount: parseFloat(newAdjustment.amount),
          hours: newAdjustment.hours ? parseFloat(newAdjustment.hours) : null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast.success("Tillägg/avdrag lagt till");
      setNewAdjustment({ type: "", description: "", amount: "", hours: "" });
      loadAdjustments();
      onUpdate();
    } catch (error: any) { toast.error(error.message || "Kunde inte lägga till tillägg/avdrag");
    }
  };

  const deleteAdjustment = async (id: string) => { try { const { error } = await supabase
        .from("payroll_adjustments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Tillägg/avdrag borttaget");
      loadAdjustments();
      onUpdate();
    } catch (error: any) { toast.error(error.message || "Kunde inte ta bort tillägg/avdrag");
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open);
      if (open) loadAdjustments();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Tillägg/Avdrag
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tillägg & Avdrag - {employeeName}</DialogTitle>
          <DialogDescription>
            Lägg till övertid, bonusar, sjukdagar eller andra justeringar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="border-b pb-4">
            <h4 className="font-medium mb-4">Lägg till nytt</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ *</Label>
                <Select
                  value={newAdjustment.type}
                  onValueChange={(value) => setNewAdjustment({ ...newAdjustment, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj typ" />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Belopp (kr) *</Label>
                <Input
                  type="number"
                  value={newAdjustment.amount}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Timmar (valfritt)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newAdjustment.hours}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, hours: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Beskrivning (valfritt)</Label>
                <Input
                  value={newAdjustment.description}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, description: e.target.value })}
                  placeholder="T.ex. kvällsjobbstillägg"
                />
              </div>
            </div>
            <Button onClick={addAdjustment} className="w-full mt-4">
              Lägg till
            </Button>
          </div>

          <div>
            <h4 className="font-medium mb-4">Nuvarande tillägg/avdrag</h4>
            {adjustments.length > 0 ? (
              <div className="space-y-2">
                {adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {adjustmentTypes.find((t) => t.value === adj.adjustment_type)?.label}
                      </p>
                      {adj.description && (
                        <p className="text-sm text-muted-foreground">{adj.description}</p>
                      )}
                      {adj.hours && (
                        <p className="text-xs text-muted-foreground">{adj.hours} timmar</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {adj.amount.toLocaleString()} kr
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAdjustment(adj.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Inga tillägg/avdrag ännu
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
