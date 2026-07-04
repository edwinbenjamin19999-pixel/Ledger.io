import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  fromFramework: "K2" | "K3";
  toFramework: "K2" | "K3";
  onCancel: () => void;
  onConfirm: () => void;
}

export default function FrameworkSwitchDialog({ open, fromFramework, toFramework, onCancel, onConfirm }: Props) {
  const switchingToK3 = toFramework === "K3";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Byt regelverk: {fromFramework} → {toFramework}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Att byta regelverk från {fromFramework} till {toFramework} påverkar:
          </p>
          {switchingToK3 ? (
            <ul className="space-y-1.5">
              <li className="flex gap-2"><span className="text-rose-500">✗</span> Obeskattade reserver tas bort från BR (omklassas till EK och uppskjuten skatt)</li>
              <li className="flex gap-2"><span className="text-amber-500">+</span> Uppskjuten skatt tillkommer (på alla temporära skillnader)</li>
              <li className="flex gap-2"><span className="text-amber-500">+</span> Ny OCI-sektion i resultaträkningen</li>
              <li className="flex gap-2"><span className="text-amber-500">+</span> Leasingavtal aktiveras på balansräkningen (ROU-tillgång + leasingskuld)</li>
              <li className="flex gap-2"><span className="text-amber-500">+</span> 12 ytterligare obligatoriska noter tillkommer</li>
              <li className="flex gap-2"><span className="text-amber-500">+</span> Kassaflödesanalys blir obligatorisk</li>
            </ul>
          ) : (
            <ul className="space-y-1.5">
              <li className="flex gap-2"><span className="text-rose-500">✗</span> Uppskjuten skatt tas bort från BR</li>
              <li className="flex gap-2"><span className="text-rose-500">✗</span> Leasingredovisningen återgår till kostnadsföring (ROU-tillgång tas bort)</li>
              <li className="flex gap-2"><span className="text-rose-500">✗</span> OCI-sektionen i RR tas bort</li>
              <li className="flex gap-2"><span className="text-rose-500">✗</span> Kassaflödesanalys blir frivillig</li>
              <li className="flex gap-2"><span className="text-amber-500">+</span> Obeskattade reserver kan användas igen</li>
            </ul>
          )}
          <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded">
            Dina befintliga noter och text bevaras — men vissa avsnitt kan behöva uppdateras manuellt.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Avbryt</Button>
          <Button onClick={onConfirm}>Byt till {toFramework}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
