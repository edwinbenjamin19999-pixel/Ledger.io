import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Send, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoSubmitButtonProps {
  label: string;
  authority: string;
  onDemoSubmit?: () => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Real submission button — confirms before invoking the actual submission flow.
 * Named DemoSubmitButton for backwards compatibility with existing imports.
 */
export const DemoSubmitButton = ({
  label,
  authority,
  onDemoSubmit,
  disabled,
  className,
  size = "default",
  icon,
  children,
}: DemoSubmitButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size={size}
        disabled={disabled}
        className={cn("gap-1.5", className)}
        onClick={() => setOpen(true)}
      >
        {icon}
        {children || label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>Bekräfta inlämning</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-left">
              Du är på väg att skicka in till {authority}. Kontrollera att uppgifterna stämmer innan du fortsätter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm">
                Inlämningen skickas direkt till <strong>{authority}</strong> via säker API-anslutning.
              </p>
              <p className="text-xs text-muted-foreground">
                En bekräftelse med referensnummer sparas i din revisionslogg.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => {
                setOpen(false);
                onDemoSubmit?.();
              }}
            >
              <Send className="h-3.5 w-3.5" />
              Skicka in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
