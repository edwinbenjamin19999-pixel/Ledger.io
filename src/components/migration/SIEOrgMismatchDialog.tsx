import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  fileOrgNumber?: string | null;
  fileCompanyName?: string | null;
  expectedOrgNumber?: string | null;
  expectedCompanyName?: string | null;
  onCancel: () => void;
}

export const SIEOrgMismatchDialog = ({
  open,
  fileOrgNumber,
  fileCompanyName,
  expectedOrgNumber,
  expectedCompanyName,
  onCancel,
}: Props) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Org-nummer matchar inte</DialogTitle>
          </div>
          <DialogDescription className="pt-2 space-y-3 text-sm">
            <p className="text-foreground">
              Filen tillhör ett annat företag än det valda. Importen är blockerad för att
              skydda mot datakorruption mellan bolag.
            </p>
            <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">I filen:</span>
                <span className="font-mono font-medium">
                  {fileCompanyName ?? "(okänt)"} · {fileOrgNumber ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valt bolag:</span>
                <span className="font-mono font-medium">
                  {expectedCompanyName ?? "(ej angivet)"} · {expectedOrgNumber ?? "—"}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={onCancel}>
            Avbryt
          </Button>
          <Button variant="outline" onClick={() => navigate("/companies")}>
            Byt bolag
          </Button>
          <Button onClick={() => navigate("/companies/new")}>Skapa nytt bolag</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
