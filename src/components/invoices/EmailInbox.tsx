import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Paperclip, Clock, CheckCircle2, AlertTriangle, Loader2,
  Eye, FileText, RefreshCw, Settings2, Copy
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface IncomingEmail { id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  attachments: any[];
  status: string;
  created_at: string;
  processed_at: string | null;
  invoice_id: string | null;
  document_ids: string[];
  error_message: string | null;
}

interface EmailInboxProps { companyId: string;
  companyName?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = { new: { label: "Ny", color: "text-blue-600", icon: Mail },
  processing: { label: "Bearbetas", color: "text-[#7A5417]", icon: Loader2 },
  processed: { label: "Behandlad", color: "text-[#085041]", icon: CheckCircle2 },
  failed: { label: "Misslyckad", color: "text-destructive", icon: AlertTriangle },
};

export const EmailInbox = ({ companyId, companyName }: EmailInboxProps) => { const [emails, setEmails] = useState<IncomingEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<IncomingEmail | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [inboxAddress, setInboxAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => { if (companyId) { loadEmails();
      loadInboxAddress();
    }
  }, [companyId]);

  const loadEmails = async () => { setLoading(true);
    try { const { data, error } = await supabase
        .from("incoming_emails")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setEmails((data || []).map(d => ({ ...d, attachments: Array.isArray(d.attachments) ? d.attachments : [] })));
    } catch (err: any) { toast.error("Kunde inte ladda inkorgen");
    } finally { setLoading(false);
    }
  };

  const loadInboxAddress = async () => { const { data } = await supabase
      .from("companies")
      .select("email_inbox_address")
      .eq("id", companyId)
      .maybeSingle();
    if (data?.email_inbox_address) { setInboxAddress(data.email_inbox_address);
    }
  };

  const saveInboxAddress = async () => { if (!inboxAddress.trim()) return;
    setSavingAddress(true);
    try { const { error } = await supabase
        .from("companies")
        .update({ email_inbox_address: inboxAddress.trim() })
        .eq("id", companyId);
      if (error) throw error;
      toast.success("E-postadress sparad!");
      setShowSettings(false);
    } catch (err: any) { toast.error(err.message || "Kunde inte spara");
    } finally { setSavingAddress(false);
    }
  };

  const processEmail = async (emailId: string) => { setProcessingId(emailId);
    try { const email = emails.find(e => e.id === emailId);
      if (!email || !email.document_ids?.length) { toast.error("Inga bilagor att bearbeta");
        return;
      }

      // Update status to processing
      await supabase
        .from("incoming_emails")
        .update({ status: "processing" })
        .eq("id", emailId);

      // Process each document with AI
      let success = true;
      for (const docId of email.document_ids) { const { error } = await supabase.functions.invoke("ai-process-document", { body: { documentId: docId, companyId, source: "email" },
        });
        if (error) { console.error("AI processing error:", error);
          success = false;
        }
      }

      await supabase
        .from("incoming_emails")
        .update({ status: success ? "processed" : "failed",
          processed_at: new Date().toISOString(),
          error_message: success ? null : "AI-bearbetning misslyckades för en eller flera bilagor",
        })
        .eq("id", emailId);

      toast.success(success ? "Mejl bearbetat! Kontrollera leverantörsfakturor." : "Delvis bearbetat – kontrollera manuellt");
      loadEmails();
    } catch (err: any) { toast.error(err.message || "Kunde inte bearbeta mejlet");
    } finally { setProcessingId(null);
    }
  };

  const copyAddress = () => { if (inboxAddress) { navigator.clipboard.writeText(inboxAddress);
      toast.success("E-postadress kopierad!");
    }
  };

  const newCount = emails.filter(e => e.status === "new").length;

  return (
    <div className="space-y-4">
      {/* Inbox header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">E-postinkorg</h3>
            <p className="text-xs text-muted-foreground">
              Leverantörsfakturor skickade via e-post
              {inboxAddress && (
                <span className="ml-1">
                  till <button onClick={copyAddress} className="text-primary hover:underline inline-flex items-center gap-0.5">{inboxAddress}<Copy className="h-3 w-3" /></button>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings2 className="h-4 w-4 mr-1" />Inställningar
          </Button>
          <Button variant="outline" size="sm" onClick={loadEmails}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* No address configured */}
      {!inboxAddress && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center space-y-3">
            <Mail className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">Konfigurera e-postadress</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ange en unik e-postadress för att ta emot leverantörsfakturor via mejl.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowSettings(true)}>
              <Settings2 className="h-4 w-4 mr-1" />Konfigurera
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI badges */}
      {inboxAddress && (
        <div className="flex items-center gap-3">
          <Badge variant={newCount > 0 ? "default" : "secondary"} className="gap-1">
            <Mail className="h-3 w-3" />{newCount} nya
          </Badge>
          <Badge variant="outline" className="gap-1 text-[#085041]">
            <CheckCircle2 className="h-3 w-3" />{emails.filter(e => e.status === "processed").length} behandlade
          </Badge>
          <Badge variant="outline" className="gap-1 text-destructive">
            <AlertTriangle className="h-3 w-3" />{emails.filter(e => e.status === "failed").length} misslyckade
          </Badge>
        </div>
      )}

      {/* Email list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : emails.length === 0 && inboxAddress ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Inga inkomna mejl ännu</p>
            <p className="text-xs text-muted-foreground mt-1">
              Skicka leverantörsfakturor till <span className="font-mono text-primary">{inboxAddress}</span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => { const st = STATUS_MAP[email.status] || STATUS_MAP.new;
            const Icon = st.icon;
            const attachCount = email.attachments?.length || 0;
            return (
              <Card key={email.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`gap-1 ${st.color} border-current/30 text-xs`}>
                          <Icon className={`h-3 w-3 ${email.status === "processing" ? "animate-spin" : ""}`} />
                          {st.label}
                        </Badge>
                        {attachCount > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Paperclip className="h-3 w-3" />{attachCount}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(email.created_at).toLocaleDateString("sv-SE")} {new Date(email.created_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {email.subject || "(Inget ämne)"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Från: {email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
                      </p>
                      {email.error_message && (
                        <p className="text-xs text-destructive mt-1">{email.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedEmail(email)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {email.status === "new" && attachCount > 0 && (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => processEmail(email.id)}
                          disabled={processingId === email.id}
                        >
                          {processingId === email.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <FileText className="h-3 w-3 mr-1" />
                          )}
                          Behandla
                        </Button>
                      )}
                      {(email.status === "failed" || (email.status === "new" && attachCount === 0)) && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {attachCount === 0 ? "Inga bilagor" : "Försök igen"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Email detail dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(o) => !o && setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {selectedEmail?.subject || "(Inget ämne)"}
            </DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Från</Label>
                  <p>{selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_email}>` : selectedEmail.from_email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mottaget</Label>
                  <p>{new Date(selectedEmail.created_at).toLocaleString("sv-SE")}</p>
                </div>
              </div>
              <Separator />
              {selectedEmail.attachments?.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Bilagor ({selectedEmail.attachments.length})</Label>
                  <div className="space-y-1">
                    {selectedEmail.attachments.map((att: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{att.filename}</span>
                        {att.file_url && (
                          <Button variant="ghost" size="sm" asChild className="h-7">
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer">Öppna</a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEmail.body_text && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Meddelande</Label>
                  <div className="p-3 rounded bg-muted/50 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selectedEmail.body_text}
                  </div>
                </div>
              )}
              {selectedEmail.status === "new" && (selectedEmail.attachments?.length || 0) > 0 && (
                <Button
                  className="w-full"
                  onClick={() => { processEmail(selectedEmail.id); setSelectedEmail(null); }}
                >
                  <FileText className="h-4 w-4 mr-2" />Behandla bilagor med AI
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-postinkorg – Inställningar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-postadress för inkommande fakturor</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Leverantörer skickar fakturor till denna adress. Den bör vara unik per bolag.
              </p>
              <Input
                value={inboxAddress}
                onChange={(e) => setInboxAddress(e.target.value)}
                placeholder={`faktura-${(companyName || "bolag").toLowerCase().replace(/\s+/g, "-")}@inbox.cogniq.se`}
              />
            </div>
            <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground space-y-1">
              <p><strong>Så fungerar det:</strong></p>
              <p>1. Ange en unik e-postadress ovan (t.ex. faktura-ertbolag@inbox.cogniq.se)</p>
              <p>2. Be era leverantörer skicka fakturor till den adressen</p>
              <p>3. Bifogade PDF-fakturor dyker upp här i inkorgen</p>
              <p>4. Klicka "Behandla" för att låta AI läsa av och skapa leverantörsfakturor</p>
            </div>
            <Button onClick={saveInboxAddress} disabled={savingAddress || !inboxAddress.trim()} className="w-full">
              {savingAddress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Spara
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};