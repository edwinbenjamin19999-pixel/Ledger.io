import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Loader2, AlertTriangle, Gavel, Clock, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { invoiceId: string;
  companyId: string;
  invoiceNumber: string;
  totalAmount: number;
  customerName: string;
  dueDate: string;
  reminderCount: number;
  onComplete?: () => void;
}

export const InkassogramButton = ({ invoiceId, companyId, invoiceNumber, totalAmount, customerName, dueDate, reminderCount, onComplete }: Props) => { const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const daysPastDue = Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000));
  const annualRate = 10.75;
  const interestAmount = Math.round(totalAmount * (annualRate / 100) * (daysPastDue / 365));
  const collectionFee = 180;
  const totalClaim = totalAmount + interestAmount + collectionFee;

  const handleSubmit = async () => { setLoading(true);
    try { const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Ej inloggad");

      const res = await supabase.functions.invoke("inkassogram-collection", { body: { action: "submit_collection", company_id: companyId, invoice_id: invoiceId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(res.data.message || "Inkassoärende skapat");
      setOpen(false);
      onComplete?.();
    } catch (err: any) { toast.error(err.message);
    } finally { setLoading(false);
    }
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)} className="text-xs gap-1.5">
        <Gavel className="w-3.5 h-3.5" />
        Skicka till inkasso
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Skicka till inkasso
            </DialogTitle>
            <DialogDescription>
              Eskalera till Inkassogram för professionell kravhantering.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Faktura</span>
                <span className="font-medium">#{invoiceNumber}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Kund</span>
                <span>{customerName}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Förfallen</span>
                <span className="text-destructive">{daysPastDue} dagar sedan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Påminnelser skickade</span>
                <span>{reminderCount}</span>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <Calculator className="w-3.5 h-3.5" />Kravberäkning (Räntelagen)
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kapitalbelopp</span>
                <span>{totalAmount.toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dröjsmålsränta ({annualRate}%, {daysPastDue} dagar)</span>
                <span>{interestAmount.toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inkassoavgift</span>
                <span>{collectionFee} kr</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total fordran</span>
                <span>{totalClaim.toLocaleString("sv-SE")} kr</span>
              </div>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Ärendet skickas till Inkassogram för professionell kravhantering. Kunden kommer att kontaktas med kravbrev.
                {reminderCount < 2 && " OBS: Minst 2 påminnelser rekommenderas innan inkasso."}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Bekräfta inkasso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
