import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check } from "lucide-react";
import { formatHours } from "@/hooks/useTimeTracking";

interface Props { open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  currentClient: string;
  currentProject: string;
  durationMinutes: number;
  onConfirm: (data: { client: string; projectId: string; description: string; billable: boolean }) => void;
  onSkip: () => void;
}

interface AISuggestion { project: string;
  confidence: number;
  activityType: string;
  billable: boolean;
  invoiceNote: string;
}

function analyzeDescription(desc: string, client: string): AISuggestion { const lower = desc.toLowerCase();
  let activityType = "Utveckling";
  let billable = true;

  if (lower.includes("möte") || lower.includes("meeting") || lower.includes("samtal")) { activityType = "Kundmöte";
  } else if (lower.includes("mail") || lower.includes("e-post")) { activityType = "E-post & kommunikation";
    billable = lower.includes("kund") || !!client;
  } else if (lower.includes("admin") || lower.includes("intern")) { activityType = "Administration";
    billable = false;
  } else if (lower.includes("faktura") || lower.includes("offert")) { activityType = "Administration";
    billable = false;
  } else if (lower.includes("utveckl") || lower.includes("kod") || lower.includes("program")) { activityType = "Utveckling";
  } else if (lower.includes("design") || lower.includes("layout")) { activityType = "Design";
  } else if (lower.includes("test") || lower.includes("qa")) { activityType = "Testning/QA";
  }

  const confidence = client ? 95 : 70;

  const invoiceNote = activityType === "Kundmöte"
    ? `Projektmöte — ${desc}`
    : `${activityType} — ${desc}`;

  return { project: client || "Okänd kund",
    confidence,
    activityType,
    billable,
    invoiceNote,
  };
}

export function AICategorizeDialog({ open,
  onOpenChange,
  description,
  currentClient,
  currentProject,
  durationMinutes,
  onConfirm,
  onSkip,
}: Props) { const suggestion = useMemo(
    () => analyzeDescription(description, currentClient),
    [description, currentClient]
  );

  const [editedClient, setEditedClient] = useState(currentClient);
  const [editedDesc, setEditedDesc] = useState(description);
  const [editedBillable, setEditedBillable] = useState(suggestion.billable);
  const [accepted, setAccepted] = useState(false);

  // Reset on open
  useMemo(() => { if (open) { setEditedClient(currentClient || suggestion.project);
      setEditedDesc(suggestion.invoiceNote);
      setEditedBillable(suggestion.billable);
      setAccepted(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            AI-kategorisering
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20 space-y-2">
            <p className="text-xs text-muted-foreground">Du skrev: "{description}"</p>
            <p className="text-xs text-muted-foreground">
              Tid: {formatHours(durationMinutes)}h
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">AI-förslag</Label>
              <Badge variant="outline" className="bg-[#3b82f6]/10 text-[#3b82f6] text-[10px]">
                {suggestion.confidence}% konfidens
              </Badge>
            </div>

            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Kund/Projekt</Label>
                <Input value={editedClient} onChange={(e) => setEditedClient(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Aktivitetstyp</Label>
                <Input value={suggestion.activityType} disabled className="bg-muted/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fakturanot</Label>
                <Input value={editedDesc} onChange={(e) => setEditedDesc(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editedBillable} onCheckedChange={setEditedBillable} id="ai-billable" />
                <Label htmlFor="ai-billable" className="text-sm cursor-pointer">
                  Fakturerbar
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={onSkip}>
              Hoppa över
            </Button>
            <Button
              onClick={() =>
                onConfirm({ client: editedClient,
                  projectId: currentProject,
                  description: editedDesc,
                  billable: editedBillable,
                })
              }
              className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground gap-1.5"
            >
              <Check className="h-4 w-4" />
              Bekräfta och spara
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
