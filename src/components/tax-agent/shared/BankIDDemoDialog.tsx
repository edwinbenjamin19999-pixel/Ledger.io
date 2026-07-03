import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Smartphone, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface BankIDDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onComplete?: () => void;
}

export const BankIDDemoDialog = ({ open, onOpenChange, title, description, onComplete }: BankIDDemoDialogProps) => {
  const [step, setStep] = useState<"ready" | "waiting" | "success">("ready");

  useEffect(() => {
    if (!open) setStep("ready");
  }, [open]);

  useEffect(() => {
    if (step === "waiting") {
      const timer = setTimeout(() => setStep("success"), 500);
      return () => clearTimeout(timer);
    }
    if (step === "success") {
      const timer = setTimeout(() => {
        onOpenChange(false);
        toast.success("Signering genomförd");
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>BankID-signering</DialogTitle>
          </div>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Signera med BankID
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Din signatur verifieras via BankID och dokumentet skickas till Skatteverket.
                </p>
              </div>
            </div>
          </div>

          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {step === "ready" && (
            <div className="text-center space-y-3 py-4">
              <div className="relative mx-auto w-fit">
                <Shield className="h-12 w-12 text-muted-foreground/40" strokeDasharray="4 4" />
              </div>
              <p className="text-sm">Klicka nedan för att simulera BankID-signering</p>
            </div>
          )}

          {step === "waiting" && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-[#085041]" />
              <p className="text-sm font-medium text-[#085041] dark:text-[#1D9E75]">Signerat (simulerat)</p>
              <p className="text-xs text-muted-foreground">Ingen riktig BankID-signatur skapades</p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-[#085041]" />
              <p className="text-sm font-medium text-[#085041] dark:text-[#1D9E75]">Signerat (simulerat)</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {step === "ready" && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Avbryt</Button>
              <Button onClick={() => setStep("waiting")} className="flex-1 gap-2">
                <Shield className="h-4 w-4" />
                Signera med BankID
              </Button>
            </div>
          )}
          <p className="text-xs text-center text-muted-foreground">
            För produktionssignering: <span className="font-medium">support@bokfy.se</span>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
