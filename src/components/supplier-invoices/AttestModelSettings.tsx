/**
 * AttestModelSettings — modal som låter användaren välja attestmodell per bolag.
 * Sparar i samma localStorage-nyckel som useInvoiceApproval läser:
 *   `supplier-invoice-settings-${companyId}`
 *
 *  - "two"            → 2-ögon (en attestant räcker)
 *  - "four_always"    → 4-ögon alltid (två olika attestanter)
 *  - "four_threshold" → 4-ögon vid belopp över tröskel
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export type FourEyesMode = "two" | "four_always" | "four_threshold";

interface Settings {
  fourEyesPrinciple: boolean;
  fourEyesMode: FourEyesMode;
  extraApprovalThreshold: number;
}

const DEFAULTS: Settings = {
  fourEyesPrinciple: true,
  fourEyesMode: "four_threshold",
  extraApprovalThreshold: 50000,
};

const KEY = (companyId: string) => `supplier-invoice-settings-${companyId}`;

export function loadAttestSettings(companyId: string): Settings {
  try {
    const raw = localStorage.getItem(KEY(companyId));
    if (!raw) return DEFAULTS;
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
    if (!parsed.fourEyesMode) {
      parsed.fourEyesMode = parsed.fourEyesPrinciple ? "four_threshold" : "two";
    }
    return parsed;
  } catch {
    return DEFAULTS;
  }
}

export function attestModeLabel(s: Settings): string {
  if (s.fourEyesMode === "two") return "2-ögon";
  if (s.fourEyesMode === "four_always") return "4-ögon (alltid)";
  return `4-ögon (≥ ${s.extraApprovalThreshold.toLocaleString("sv-SE")} kr)`;
}

interface Props {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function AttestModelSettings({ companyId, open, onOpenChange, onSaved }: Props) {
  const [mode, setMode] = useState<FourEyesMode>("four_threshold");
  const [threshold, setThreshold] = useState(50000);

  useEffect(() => {
    if (open) {
      const s = loadAttestSettings(companyId);
      setMode(s.fourEyesMode);
      setThreshold(s.extraApprovalThreshold);
    }
  }, [open, companyId]);

  const save = () => {
    const next: Settings = {
      fourEyesPrinciple: mode !== "two",
      fourEyesMode: mode,
      extraApprovalThreshold: Math.max(0, Math.round(threshold || 0)),
    };
    localStorage.setItem(KEY(companyId), JSON.stringify(next));
    toast.success("Attestmodell sparad");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attestmodell</DialogTitle>
          <DialogDescription>
            Bestäm hur många personer som krävs för att godkänna en leverantörsfaktura
            innan den kan ingå i ett betalförslag.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as FourEyesMode)}
          className="space-y-3 py-2"
        >
          <label
            htmlFor="mode-two"
            className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/40"
          >
            <RadioGroupItem value="two" id="mode-two" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">2-ögon</div>
              <div className="text-xs text-muted-foreground">
                En attestant räcker oavsett belopp.
              </div>
            </div>
          </label>

          <label
            htmlFor="mode-fourthreshold"
            className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/40"
          >
            <RadioGroupItem value="four_threshold" id="mode-fourthreshold" className="mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">4-ögon vid tröskel</div>
              <div className="text-xs text-muted-foreground">
                Två olika attestanter krävs när fakturan överstiger tröskelbeloppet.
              </div>
              {mode === "four_threshold" && (
                <div className="mt-2 flex items-center gap-2">
                  <Label htmlFor="threshold" className="text-xs">
                    Tröskel (kr):
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    min={0}
                    step={1000}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="h-8 w-32 text-xs"
                  />
                </div>
              )}
            </div>
          </label>

          <label
            htmlFor="mode-fouralways"
            className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/40"
          >
            <RadioGroupItem value="four_always" id="mode-fouralways" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">4-ögon alltid</div>
              <div className="text-xs text-muted-foreground">
                Två olika attestanter krävs på varje faktura, oavsett belopp.
              </div>
            </div>
          </label>
        </RadioGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={save}>Spara</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
