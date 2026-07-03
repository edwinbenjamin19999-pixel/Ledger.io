import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

const DOC_TYPES = [
  { value: "kvitto", label: "Kvitto" },
  { value: "faktura", label: "Leverantörsfaktura" },
  { value: "kontoutdrag", label: "Kontoutdrag" },
  { value: "lonebesked", label: "Lönebesked" },
  { value: "ovrigt", label: "Övrigt underlag" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const RequestDocumentsDialog = ({ open, onOpenChange }: Props) => {
  const { clients } = useAdvisorContext();
  const [companyId, setCompanyId] = useState<string>("");
  const [docType, setDocType] = useState<string>(DOC_TYPES[0].value);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!companyId) {
      toast.error("Välj en klient");
      return;
    }
    setLoading(true);
    try {
      const docLabel = DOC_TYPES.find((d) => d.value === docType)?.label ?? docType;
      const client = clients.find((c) => c.id === companyId);
      const { error } = await supabase.from("admin_notifications").insert({
        company_id: companyId,
        notification_type: "document_request",
        severity: "info",
        title: `Begäran om ${docLabel}`,
        message: message || `Din rådgivare har begärt ${docLabel.toLowerCase()}. Vänligen ladda upp i dokumentmodulen.`,
        metadata: { doc_type: docType, client_name: client?.name },
      });
      if (error) throw error;
      toast.success("Förfrågan skickad", { description: `${client?.name ?? "Klient"} aviseras i appen.` });
      onOpenChange(false);
      setMessage("");
      setCompanyId("");
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte skicka förfrågan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Begär dokument</DialogTitle>
          <DialogDescription>Skicka en aviserad förfrågan till klienten.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Klient</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div>
            <Label className="text-xs">Meddelande (valfritt)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="T.ex. Vi behöver kontoutdrag för oktober…"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Avbryt</Button>
            <Button onClick={send} disabled={loading || !companyId}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Skicka
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
