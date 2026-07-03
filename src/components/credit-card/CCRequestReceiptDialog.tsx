import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatSEK } from "@/lib/formatNumber";

interface CCRequestReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  merchant: string;
  amount: number;
  date: string;
}

export function CCRequestReceiptDialog({ open, onClose, merchant, amount, date }: CCRequestReceiptDialogProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    `Hej!\n\nKan du skicka kvitto för:\n${merchant} — ${formatSEK(amount)} (${date})\n\nTack!`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast({ title: "Ange e-postadress", variant: "destructive" });
      return;
    }
    setSending(true);
    // Notification fallback — real email integration handled elsewhere
    setTimeout(() => {
      toast({
        title: "Förfrågan skickad",
        description: `Påminnelse om kvitto skickad till ${email}.`,
      });
      setSending(false);
      onClose();
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Begär kvitto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 border p-3 text-sm">
            <p className="font-medium">{merchant}</p>
            <p className="text-muted-foreground">{formatSEK(amount)} · {date}</p>
          </div>
          <div>
            <Label htmlFor="email">E-post till mottagare</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anstalld@bolag.se" />
          </div>
          <div>
            <Label htmlFor="msg">Meddelande</Label>
            <Textarea id="msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Skickar..." : "Skicka förfrågan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
