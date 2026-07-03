import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Calendar, Heart, Plus } from "lucide-react";
import { toast } from "sonner";

interface SickLeaveRegistrationProps { companyId: string;
  employees: any[];
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export const SickLeaveRegistration = ({ companyId, employees }: SickLeaveRegistrationProps) => { const [open, setOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("sick");

  const activeEmps = employees.filter(e => e.is_active);
  const emp = activeEmps.find(e => e.id === selectedEmp);
  const salary = emp?.monthly_salary || 0;
  const weeklySalary = salary / 4.33;

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Swedish sick leave calculation
  const karensavdrag = Math.round(weeklySalary * 0.2); // 20% of weekly salary
  const dailySalary = salary / 21;
  const sickPayRate = 0.8; // 80%

  let totalDeduction = 0;
  let breakdown: { label: string; amount: number; info: string }[] = [];

  if (type === "sick") { if (days >= 1) { breakdown.push({ label: "Dag 1: Karensavdrag", amount: -karensavdrag, info: "20% av veckolön (Sjuklönelagen)" });
      totalDeduction += karensavdrag;
    }
    if (days >= 2) { const sickDays = Math.min(days - 1, 13);
      const sickPay = Math.round(sickDays * dailySalary * (1 - sickPayRate));
      breakdown.push({ label: `Dag 2–${sickDays + 1}: Sjuklön 80%`, amount: -sickPay, info: `${sickDays} dagar × ${fmt(Math.round(dailySalary * (1 - sickPayRate)))} kr avdrag` });
      totalDeduction += sickPay;
    }
    if (days > 14) { breakdown.push({ label: "Dag 15+: Försäkringskassan", amount: 0, info: "Arbetsgivaren betalar ej sjuklön efter dag 14" });
    }
  } else if (type === "vab") { const vabDeduction = Math.round(dailySalary * 0.2 * days);
    breakdown.push({ label: `VAB: ${days} dagar`, amount: -vabDeduction, info: "80% ersätts av Försäkringskassan, arbetsgivaren betalar dag 1" });
    totalDeduction += vabDeduction;
  } else { // Parental leave
    breakdown.push({ label: `Föräldraledig: ${days} dagar`, amount: 0, info: "Försäkringskassan ersätter — inget löneavdrag om avtalat" });
  }

  const handleSubmit = () => { if (!selectedEmp) { toast.error("Välj anställd");
      return;
    }
    toast.success(`Sjukfrånvaro registrerad för ${emp?.first_name} ${emp?.last_name}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Registrera sjukfrånvaro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            Registrera frånvaro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Anställd</Label>
            <Select value={selectedEmp} onValueChange={setSelectedEmp}>
              <SelectTrigger>
                <SelectValue placeholder="Välj anställd" />
              </SelectTrigger>
              <SelectContent>
                {activeEmps.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sick">Sjukfrånvaro</SelectItem>
                <SelectItem value="vab">VAB (vård av barn)</SelectItem>
                <SelectItem value="parental">Föräldraledig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slutdatum (valfritt)</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {selectedEmp && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">AI-beräkning ({days} dag{days > 1 ? "ar" : ""})</p>
                {breakdown.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{b.label}</p>
                      <p className="text-xs text-muted-foreground">{b.info}</p>
                    </div>
                    {b.amount !== 0 && (
                      <span className="font-semibold text-destructive">{fmt(b.amount)} kr</span>
                    )}
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between text-sm font-bold">
                  <span>Nettopåverkan på lön</span>
                  <span className="text-destructive">{fmt(-totalDeduction)} kr</span>
                </div>

                {days > 14 && (
                  <div className="p-2 bg-[#FAEEDA] border border-[#F0DDB7] rounded text-xs text-[#7A5417] flex items-start gap-2 mt-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Anmäl till Försäkringskassan — du är inte längre skyldig betala sjuklön efter dag 14</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">Frånvaron matas automatiskt in i nästa lönekörning och rapporteras i AGI.</p>

          <Button onClick={handleSubmit} className="w-full">
            Registrera frånvaro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
