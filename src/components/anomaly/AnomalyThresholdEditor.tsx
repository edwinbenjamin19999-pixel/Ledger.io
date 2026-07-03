import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { toast } from "sonner";

interface Thresholds { duplicateTimeDays: number;
  duplicateAmountDiffPct: number;
  unusualAmountMultiplier: number;
  roundNumberMinAmount: number;
  personalKeywords: string;
}

const DEFAULT: Thresholds = { duplicateTimeDays: 7,
  duplicateAmountDiffPct: 5,
  unusualAmountMultiplier: 200,
  roundNumberMinAmount: 5000,
  personalKeywords: "ica, coop, hemköp, willys, systembolaget, gym, sats, spotify, netflix, hm, zara, stadium, apoteket",
};

interface Props { onSave: (t: Thresholds) => void;
}

export function AnomalyThresholdEditor({ onSave }: Props) { const [open, setOpen] = useState(false);
  const [thresholds, setThresholds] = useState<Thresholds>(() => { try { const saved = localStorage.getItem("anomaly_thresholds");
      return saved ? JSON.parse(saved) : DEFAULT;
    } catch { return DEFAULT; }
  });

  const update = (key: keyof Thresholds, val: number | string) => { setThresholds(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => { localStorage.setItem("anomaly_thresholds", JSON.stringify(thresholds));
    onSave(thresholds);
    toast.success("Anomalinivåer sparade");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anomalinivåer</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div>
            <Label className="text-sm">Dubblettbetalning — flagga inom <strong>{thresholds.duplicateTimeDays} dagar</strong></Label>
            <Slider
              value={[thresholds.duplicateTimeDays]}
              onValueChange={([v]) => update("duplicateTimeDays", v)}
              min={1} max={30} step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm">Dubblettbelopp — max differens <strong>{thresholds.duplicateAmountDiffPct}%</strong></Label>
            <Slider
              value={[thresholds.duplicateAmountDiffPct]}
              onValueChange={([v]) => update("duplicateAmountDiffPct", v)}
              min={0} max={20} step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm">Ovanligt belopp — flagga om &gt; <strong>{thresholds.unusualAmountMultiplier}%</strong> av median</Label>
            <Slider
              value={[thresholds.unusualAmountMultiplier]}
              onValueChange={([v]) => update("unusualAmountMultiplier", v)}
              min={100} max={1000} step={10}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm">Rundade belopp — minimibelopp <strong>{thresholds.roundNumberMinAmount} kr</strong></Label>
            <Slider
              value={[thresholds.roundNumberMinAmount]}
              onValueChange={([v]) => update("roundNumberMinAmount", v)}
              min={1000} max={50000} step={1000}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm">Privat kostnad — nyckelord</Label>
            <Input
              value={thresholds.personalKeywords}
              onChange={e => update("personalKeywords", e.target.value)}
              placeholder="ica, coop, netflix..."
              className="mt-1 text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Komma-separerade</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">Spara nivåer</Button>
            <Button variant="outline" onClick={() => { setThresholds(DEFAULT); }}>Återställ</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
