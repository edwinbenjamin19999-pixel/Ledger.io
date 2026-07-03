import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  selectedNames: string[];
  mode: "reminder" | "task" | "documents";
}

const DOC_TYPES = [
  { value: "kvitto", label: "Kvitto" },
  { value: "faktura", label: "Leverantörsfaktura" },
  { value: "kontoutdrag", label: "Kontoutdrag" },
  { value: "lonebesked", label: "Lönebesked" },
  { value: "ovrigt", label: "Övrigt underlag" },
];

const MODE_LABELS = {
  reminder: { title: "Skicka påminnelse", desc: "Skickas till valda klienter via in-app-notis." },
  task: { title: "Tilldela uppgift", desc: "Skapar en uppgift i klientens vy." },
  documents: { title: "Begär dokument", desc: "Klienten aviseras att ladda upp underlag." },
} as const;

export const BulkActionDialog = ({ open, onOpenChange, selectedIds, selectedNames, mode }: Props) => {
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (selectedIds.length === 0) {
      toast.error("Inga klienter valda");
      return;
    }
    setLoading(true);
    try {
      const docLabel = DOC_TYPES.find((d) => d.value === docType)?.label ?? docType;
      const rows = selectedIds.map((companyId) => {
        if (mode === "documents") {
          return {
            company_id: companyId,
            notification_type: "document_request",
            severity: "info",
            title: `Begäran om ${docLabel}`,
            message: message || `Din rådgivare har begärt ${docLabel.toLowerCase()}.`,
            metadata: { doc_type: docType },
          };
        }
        if (mode === "reminder") {
          return {
            company_id: companyId,
            notification_type: "reminder",
            severity: "warning",
            title: "Påminnelse från din rådgivare",
            message: message || "Vi behöver din uppmärksamhet på pågående ärenden.",
            metadata: {},
          };
        }
        return {
          company_id: companyId,
          notification_type: "task",
          severity: "info",
          title: "Ny uppgift tilldelad",
          message: message || "Din rådgivare har tilldelat dig en uppgift.",
          metadata: {},
        };
      });
      const { error } = await supabase.from("admin_notifications").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} klienter aviserade`);
      onOpenChange(false);
      setMessage("");
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte skicka");
    } finally {
      setLoading(false);
    }
  };

  const labels = MODE_LABELS[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground max-h-24 overflow-auto">
            <span className="font-semibold text-foreground">{selectedIds.length} klienter:</span>{" "}
            {selectedNames.slice(0, 6).join(", ")}
            {selectedNames.length > 6 && ` +${selectedNames.length - 6}`}
          </div>
          {mode === "documents" && (
            <div>
              <Label className="text-xs">Dokumenttyp</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Meddelande {mode !== "documents" && "(valfritt)"}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Skriv ett kort meddelande…"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Avbryt</Button>
            <Button onClick={send} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Skicka till {selectedIds.length}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
