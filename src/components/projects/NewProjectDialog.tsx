import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props { open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string;
    client_name?: string;
    start_date: string;
    end_date?: string;
    budget_revenue?: number;
    budget_cost?: number;
    project_type: string;
  }) => void;
  isLoading: boolean;
}

export function NewProjectDialog({ open, onOpenChange, onCreate, isLoading }: Props) { const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [budgetRevenue, setBudgetRevenue] = useState("");
  const [budgetCost, setBudgetCost] = useState("");
  const [projectType, setProjectType] = useState("consulting");

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(),
      client_name: clientName.trim() || undefined,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      budget_revenue: budgetRevenue ? parseFloat(budgetRevenue) : undefined,
      budget_cost: budgetCost ? parseFloat(budgetCost) : undefined,
      project_type: projectType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nytt projekt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Projektnamn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. Webbplats Redesign" required />
          </div>
          <div>
            <Label>Kund</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Kundnamn" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startdatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "yyyy-MM-dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Slutdatum (estimerat)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "yyyy-MM-dd") : "Välj datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Budgetintäkt (kr)</Label>
              <Input type="number" value={budgetRevenue} onChange={(e) => setBudgetRevenue(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Budgetkostnad (kr)</Label>
              <Input type="number" value={budgetCost} onChange={(e) => setBudgetCost(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <Label>Projekttyp</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consulting">Konsulting</SelectItem>
                <SelectItem value="construction">Bygg/Installation</SelectItem>
                <SelectItem value="product">Produkt</SelectItem>
                <SelectItem value="other">Annat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-[#3b82f6] flex-shrink-0" />
            <span>AI skapar automatiskt projektkod, dimensionstaggar och kopplar framtida transaktioner.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button type="submit" disabled={isLoading || !name.trim()} className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
              {isLoading ? "Skapar..." : "Skapa projekt"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
