import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Smartphone,
  Send,
  Loader2,
  CheckCircle2,
  Copy,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  companyId: string;
  documentType: "vat_filing" | "agi_filing";
  documentTitle: string;
  periodLabel: string;
  /** XML payload that will be submitted to Skatteverket after the recipient signs. */
  xmlPayload: string;
  /** Disabled when validation hasn't passed yet. */
  disabled?: boolean;
  triggerLabel?: string;
}

/**
 * Lets a logged-in accountant generate a one-time mobile signing link for a
 * VAT or AGI filing, e-mail it to the firmatecknare/VD, and let them sign
 * with BankID on their own phone — no app login required. After signing,
 * the filing is automatically posted to Skatteverket.
 */
export const SendMobileSignLinkButton = ({
  companyId,
  documentType,
  documentTitle,
  periodLabel,
  xmlPayload,
  disabled,
  triggerLabel = "Skicka signeringslänk till mobil",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const reset = () => {
    setSigningUrl(null);
    setEmailSent(false);
    setName("");
    setEmail("");
    setPhone("");
  };

  const handleSend = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Namn och e-post krävs");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("send-mobile-sign-link", {
        body: {
          companyId,
          documentType,
          documentTitle,
          periodLabel,
          xmlPayload,
          recipient: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
          siteOrigin: window.location.origin,
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if (!data?.signing_url) throw new Error(data?.error ?? "Inget URL returnerat");
      setSigningUrl(data.signing_url);
      setEmailSent(!!data.email_sent);
      toast.success(
        data.email_sent
          ? `Signeringslänk skickad till ${email}`
          : "Länk skapad — kopiera och dela manuellt"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte skapa signeringslänk");
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async () => {
    if (!signingUrl) return;
    await navigator.clipboard.writeText(signingUrl);
    toast.success("Länk kopierad");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Smartphone className="w-3.5 h-3.5" />
        {triggerLabel}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#3b82f6]" />
              Skicka signeringslänk till mobil
            </DialogTitle>
            <DialogDescription>
              VD eller firmatecknare får en e-postlänk, signerar med BankID på
              sin egen telefon, och deklarationen skickas automatiskt till
              Skatteverket direkt efteråt.
            </DialogDescription>
          </DialogHeader>

          {!signingUrl ? (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Mottagarens namn</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anna Andersson"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-post</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vd@foretaget.se"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mobilnummer (valfritt)</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="070-1234567"
                  className="h-9"
                />
              </div>
              <Alert className="bg-cyan-50 border-cyan-200">
                <AlertDescription className="text-[12px] text-[#3b82f6]">
                  Länken är personlig, krypterad och fungerar bara en gång.
                  XML-deklarationen lagras säkert tills mottagaren signerat.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <Alert className="bg-emerald-50 border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <AlertDescription className="text-[12px] text-emerald-900">
                  {emailSent ? (
                    <>
                      <Mail className="w-3 h-3 inline mr-1" />
                      Länk skickad via e-post till <strong>{email}</strong>
                    </>
                  ) : (
                    <>Länken skapad. E-postutskick är inte konfigurerat — kopiera och dela manuellt nedan.</>
                  )}
                </AlertDescription>
              </Alert>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Signeringslänk
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    readOnly
                    value={signingUrl}
                    className="h-9 text-xs font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button size="sm" variant="outline" onClick={copyUrl} className="shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!signingUrl ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Avbryt
                </Button>
                <Button onClick={handleSend} disabled={loading} className="gap-1.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Skicka länk
                </Button>
              </>
            ) : (
              <Button onClick={() => setOpen(false)}>Klart</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
