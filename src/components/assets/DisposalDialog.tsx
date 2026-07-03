import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Calculator, DollarSign, Trash2 } from "lucide-react";
import type { FixedAsset } from "@/hooks/useAssets";
import { toast } from "sonner";

interface DisposalDialogProps { asset: FixedAsset | null;
  bookValue: number;
  mode: "sell" | "scrap";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, updates: any) => void;
}

export const DisposalDialog = ({ asset, bookValue, mode, open, onOpenChange, onConfirm }: DisposalDialogProps) => { const [salePrice, setSalePrice] = useState("");
  if (!asset) return null;

  const price = parseFloat(salePrice) || 0;
  const gain = mode === "sell" ? price - bookValue : -bookValue;
  const isProfit = gain > 0;
  const taxEffect = Math.round(Math.max(0, gain) * 0.206);
  const accDepr = asset.acquisition_cost - bookValue;

  const handleConfirm = () => { onConfirm(asset.id, { status: mode === "sell" ? "sold" : "scrapped",
      disposal_date: new Date().toISOString().split("T")[0],
      disposal_amount: mode === "sell" ? price : 0,
      is_active: false,
    });
    toast.success(mode === "sell" ? "Tillgång avyttrad" : "Tillgång utrangerad");
    onOpenChange(false);
    setSalePrice("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "sell" ? <DollarSign className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            {mode === "sell" ? "Avyttra tillgång" : "Utrangera tillgång"}
          </DialogTitle>
          <DialogDescription>{asset.asset_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === "sell" && (
            <div className="space-y-2">
              <Label>Försäljningspris (kr)</Label>
              <Input
                type="number"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bokfört värde vid avyttring</span>
              <span className="font-medium">{bookValue.toLocaleString("sv-SE")} kr</span>
            </div>
            {mode === "sell" && price > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Försäljningspris</span>
                  <span className="font-medium">{price.toLocaleString("sv-SE")} kr</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">{isProfit ? "Realisationsvinst" : "Realisationsförlust"}</span>
                  <Badge variant={isProfit ? "default" : "destructive"} className="text-xs">
                    {gain > 0 ? "+" : ""}{gain.toLocaleString("sv-SE")} kr
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* Journal entry preview */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verifikation som skapas</p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs font-mono">
              {mode === "sell" && price > 0 ? (
                <>
                  <div className="flex justify-between"><span>Debet 1930 (Bank)</span><span>{price.toLocaleString("sv-SE")} kr</span></div>
                  <div className="flex justify-between"><span>Debet 1229 (Ack. avskr.)</span><span>{Math.round(accDepr).toLocaleString("sv-SE")} kr</span></div>
                  <div className="flex justify-between"><span>Kredit 1220 (Inventarier)</span><span>{asset.acquisition_cost.toLocaleString("sv-SE")} kr</span></div>
                  {isProfit ? (
                    <div className="flex justify-between text-[#085041]"><span>Kredit 3973 (Vinst avyttring)</span><span>{gain.toLocaleString("sv-SE")} kr</span></div>
                  ) : (
                    <div className="flex justify-between text-destructive"><span>Debet 7973 (Förlust avyttring)</span><span>{Math.abs(gain).toLocaleString("sv-SE")} kr</span></div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span>Debet 1229 (Ack. avskr.)</span><span>{Math.round(accDepr).toLocaleString("sv-SE")} kr</span></div>
                  <div className="flex justify-between text-destructive"><span>Debet 7973 (Förlust utrangering)</span><span>{bookValue.toLocaleString("sv-SE")} kr</span></div>
                  <div className="flex justify-between"><span>Kredit 1220 (Inventarier)</span><span>{asset.acquisition_cost.toLocaleString("sv-SE")} kr</span></div>
                </>
              )}
            </div>
          </div>

          {mode === "sell" && isProfit && taxEffect > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FAEEDA] dark:bg-amber-950/20 border border-[#F0DDB7] dark:border-amber-800 text-xs">
              <Calculator className="w-4 h-4 text-[#7A5417] mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-[#7A5417] dark:text-amber-300">
                  Realisationsvinst {gain.toLocaleString("sv-SE")} kr okar beskattningsbar inkomst.
                </p>
                <p className="text-[#7A5417] dark:text-[#C28A2B]">
                  Skatteeffekt: {taxEffect.toLocaleString("sv-SE")} kr extra bolagsskatt.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setSalePrice(""); }}>Avbryt</Button>
          <Button onClick={handleConfirm} variant={mode === "scrap" ? "destructive" : "default"}>
            {mode === "sell" ? "Bekräfta avyttring" : "Bekräfta utrangering"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
