import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileCheck, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Signatory { name: string;
  email: string;
  personal_number?: string;
  role: string;
  use_bankid: boolean;
  sign_order: number;
}

interface Props { companyId: string;
  defaultTitle?: string;
  documentType?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  fileUrl?: string;
  onComplete?: () => void;
  triggerLabel?: string;
}

export const ScriveSigningButton = ({ companyId, defaultTitle = "", documentType = "agreement", 
  relatedEntityType, relatedEntityId, fileUrl, onComplete,
  triggerLabel = "Skicka för signering"
}: Props) => { const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [signatories, setSignatories] = useState<Signatory[]>([
    { name: "", email: "", role: "signatory", use_bankid: true, sign_order: 1 },
  ]);

  const addSignatory = () => { setSignatories(prev => [...prev, { name: "", email: "", role: "signatory", use_bankid: false, 
      sign_order: prev.length + 1 
    }]);
  };

  const removeSignatory = (index: number) => { setSignatories(prev => prev.filter((_, i) => i !== index));
  };

  const updateSignatory = (index: number, field: keyof Signatory, value: any) => { setSignatories(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => { if (!title.trim()) { toast.error("Ange dokumenttitel"); return; }
    if (signatories.some(s => !s.name || !s.email)) { toast.error("Fyll i namn och e-post för alla signatärer"); return; }

    setLoading(true);
    try { const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Ej inloggad");

      const res = await supabase.functions.invoke("scrive-signing", { body: { action: "create_envelope",
          company_id: companyId,
          document_title: title,
          document_type: documentType,
          signatories,
          file_url: fileUrl,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(res.data.message || "Signeringsärende skapat");
      setOpen(false);
      onComplete?.();
    } catch (err: any) { toast.error(err.message);
    } finally { setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-xs gap-1.5">
        <FileCheck className="w-3.5 h-3.5" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              Skicka för e-signering
            </DialogTitle>
            <DialogDescription>
              Skicka dokument för signering via Scrive med BankID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Dokumenttitel</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="T.ex. Konsultavtal 2026" className="h-8 text-sm" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Signatärer</Label>
                <Button variant="ghost" size="sm" onClick={addSignatory} className="text-xs h-7 gap-1">
                  <Plus className="w-3 h-3" />Lägg till
                </Button>
              </div>

              {signatories.map((s, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Signatär {i + 1}</span>
                    {signatories.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSignatory(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Namn</Label>
                      <Input value={s.name} onChange={e => updateSignatory(i, "name", e.target.value)} className="h-7 text-xs" placeholder="Anna Andersson" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">E-post</Label>
                      <Input value={s.email} onChange={e => updateSignatory(i, "email", e.target.value)} className="h-7 text-xs" type="email" placeholder="anna@foretag.se" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Roll</Label>
                      <Select value={s.role} onValueChange={v => updateSignatory(i, "role", v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="signatory">Signatär</SelectItem>
                          <SelectItem value="approver">Godkännare</SelectItem>
                          <SelectItem value="viewer">Mottagare (ej signering)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <Switch checked={s.use_bankid} onCheckedChange={v => updateSignatory(i, "use_bankid", v)} />
                      <Label className="text-[10px]">BankID</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Skicka för signering
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
