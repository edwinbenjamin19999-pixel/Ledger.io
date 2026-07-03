import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye } from "lucide-react";
import type { DuplicateCheckResult, DuplicateMatch } from "@/lib/invoices/duplicateCheck";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: DuplicateCheckResult | null;
  invoiceType: "incoming" | "outgoing";
  onViewExisting?: (match: DuplicateMatch) => void;
  onConfirmSoft?: () => void;
  onCancel?: () => void;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

export function DuplicateInvoiceDialog({ open, onOpenChange, result, invoiceType, onViewExisting, onConfirmSoft, onCancel }: Props) {
  if (!result) return null;
  const party = invoiceType === "incoming" ? "leverantör" : "kund";

  const blocking = result.blocking;
  const isBlock = !!blocking;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${isBlock ? "text-destructive" : "text-amber-500"}`} />
            {isBlock ? "Möjlig dubblett – blockerad" : "Liknande faktura senaste 30 dagarna"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              {isBlock ? (
                <>
                  <p>
                    {result.blockingReason === "same_number"
                      ? `En faktura med detta nummer finns redan för denna ${party}.`
                      : `En faktura med samma belopp och datum (±3 dagar) finns redan för denna ${party}.`}
                  </p>
                  <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40">
                    <div><span className="text-muted-foreground">Fakturanr:</span> <strong>{blocking!.invoice_number || "-"}</strong></div>
                    <div><span className="text-muted-foreground">Datum:</span> {blocking!.invoice_date || "-"}</div>
                    <div><span className="text-muted-foreground">Belopp:</span> {fmt(blocking!.total_amount)} kr</div>
                    <div><span className="text-muted-foreground">Status:</span> {blocking!.status || "-"}</div>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Samma belopp har {invoiceType === "incoming" ? "fakturerats från" : "fakturerats till"} denna {party} de senaste 30 dagarna. Bekräfta att detta inte är en dubblett.
                  </p>
                  <div className="rounded-md border divide-y bg-muted/40 max-h-48 overflow-auto">
                    {result.softMatches.map((m) => (
                      <div key={m.id} className="p-2 text-sm flex items-center justify-between gap-2">
                        <div>
                          <div><strong>{m.invoice_number || "(utan nr)"}</strong> – {m.invoice_date}</div>
                          <div className="text-xs text-muted-foreground">{fmt(m.total_amount)} kr · {m.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isBlock && onViewExisting && (
            <Button variant="outline" onClick={() => { onViewExisting(blocking!); onOpenChange(false); }}>
              <Eye className="h-4 w-4 mr-1" /> Visa befintlig faktura
            </Button>
          )}
          <AlertDialogCancel onClick={() => onCancel?.()}>Avbryt</AlertDialogCancel>
          {!isBlock && onConfirmSoft && (
            <AlertDialogAction onClick={() => onConfirmSoft()}>Skapa ändå</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
