import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import type { FixedAsset } from "@/hooks/useAssets";

interface QRCodeDialogProps { asset: FixedAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRCodeDialog = ({ asset, open, onOpenChange }: QRCodeDialogProps) => { if (!asset) return null;

  const assetId = `ANG-${String(asset.id).substring(0, 4).toUpperCase()}`;
  const qrValue = `${window.location.origin}/depreciation?asset=${asset.id}`;

  const handlePrint = () => { const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>QR-kod: ${assetId}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        .label { border: 2px solid #000; padding: 20px; display: inline-block; }
        h2 { margin: 0 0 5px; font-size: 18px; }
        p { margin: 3px 0; font-size: 12px; color: #666; }
      </style></head><body>
      <div class="label">
        <h2>${assetId}</h2>
        <p>${asset.asset_name}</p>
        <p>${asset.acquisition_date}</p>
        <div id="qr" style="margin: 15px 0;"></div>
        <p style="font-size: 10px;">Skanna för att öppna tillgångskortet i Bokfy</p>
      </div>
      <script>window.print();</script></body></html>
    `);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>QR-kod: {assetId}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="p-4 bg-white rounded-lg">
            <QRCodeSVG value={qrValue} size={180} />
          </div>
          <div className="text-sm space-y-0.5">
            <p className="font-medium">{asset.asset_name}</p>
            <p className="text-muted-foreground text-xs">{asset.acquisition_date} | {asset.acquisition_cost.toLocaleString("sv-SE")} kr</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Skanna med telefonen för att oppna tillgångskortet direkt
          </p>
        </div>
        <DialogFooter className="justify-center">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Skriv ut QR-etikett
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
