import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTimeEntries, useTimeRates } from "@/hooks/useTimeTracking";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props { open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualEntryDialog({ open, onOpenChange }: Props) { const { user } = useAuth();
  const { createEntry } = useTimeEntries();
  const { rates } = useTimeRates();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

  const [date, setDate] = useState<Date>(new Date());
  const [selectedProject, setSelectedProject] = useState("");
  const [clientName, setClientName] = useState("");
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [rateOverride, setRateOverride] = useState("");

  const { data: projects } = useQuery({ queryKey: ["projects_for_time_manual", companyId],
    queryFn: async () => { if (!companyId) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name, client_name")
        .eq("company_id", companyId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const handleProjectChange = (val: string) => { setSelectedProject(val);
    const proj = projects?.find((p) => p.id === val);
    if (proj) setClientName(proj.client_name || "");
  };

  const handleSubmit = () => { if (!companyId || !user) return;
    const mins = Math.round(parseFloat(hours || "0") * 60);
    if (mins <= 0) return;

    const clientRate = rates.find((r) => r.client_name === clientName);
    const defaultRate = rates.find((r) => r.is_default);
    const rate = rateOverride ? parseFloat(rateOverride) : clientRate?.hourly_rate || defaultRate?.hourly_rate || 0;

    createEntry.mutate(
      { company_id: companyId,
        user_id: user.id,
        project_id: selectedProject || null,
        client_name: clientName || null,
        description: description || null,
        entry_date: format(date, "yyyy-MM-dd"),
        start_time: null,
        end_time: null,
        duration_minutes: mins,
        is_billable: isBillable,
        hourly_rate: rate,
        rate_id: (clientRate || defaultRate)?.id || null,
      },
      { onSuccess: () => { onOpenChange(false);
          setHours("");
          setDescription("");
          setSelectedProject("");
          setClientName("");
          setRateOverride("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lägg till tid</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "yyyy-MM-dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Kund / Projekt</Label>
            <Select value={selectedProject} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Välj..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.client_name ? `— ${p.client_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedProject && (
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Eller ange kund" className="mt-2" />
            )}
          </div>

          <div>
            <Label>Antal timmar</Label>
            <Input type="number" step="0.25" min="0.25" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="T.ex. 2,5" />
          </div>

          <div>
            <Label>Beskrivning</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Vad gjordes?" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={isBillable} onCheckedChange={setIsBillable} id="manual-billable" />
              <Label htmlFor="manual-billable" className="text-sm cursor-pointer">Fakturerbar</Label>
            </div>
            {isBillable && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Timpris</Label>
                <Input type="number" value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder="Auto" className="w-24 h-8 text-sm" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={handleSubmit} disabled={createEntry.isPending || !hours} className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
              {createEntry.isPending ? "Sparar..." : "Spara"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
