import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, MessageCircle, Upload, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

interface ChannelModalsProps { companyId: string;
}

interface ChannelStatus { active: boolean;
  lastReceived: string | null;
}

export function ReceiptChannelModals({ companyId }: ChannelModalsProps) { const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<ChannelStatus>({ active: false, lastReceived: null });
  const [whatsappStatus, setWhatsappStatus] = useState<ChannelStatus>({ active: false, lastReceived: null });

  const emailAddress = `kvitton@${companyId.slice(0, 8)}.bokfy.se`;
  const whatsappNumber = "+46 70 123 45 67";
  const whatsappLink = "https://wa.me/46701234567";

  useEffect(() => { loadChannelStatus();
  }, [companyId]);

  const loadChannelStatus = async () => { try { const { data: emailDocs } = await supabase
        .from("documents")
        .select("created_at")
        .eq("company_id", companyId)
        .eq("document_category", "email")
        .order("created_at", { ascending: false })
        .limit(1);

      if (emailDocs && emailDocs.length > 0) { setEmailStatus({ active: true, lastReceived: emailDocs[0].created_at });
      }

      const { data: waDocs } = await supabase
        .from("documents")
        .select("created_at")
        .eq("company_id", companyId)
        .eq("document_category", "whatsapp")
        .order("created_at", { ascending: false })
        .limit(1);

      if (waDocs && waDocs.length > 0) { setWhatsappStatus({ active: true, lastReceived: waDocs[0].created_at });
      }
    } catch { // Columns might not exist yet, ignore
    }
  };

  const copyToClipboard = (text: string, label: string) => { navigator.clipboard.writeText(text);
    toast({ title: "Kopierat!", description: `${label} kopierad till urklipp` });
  };

  const formatLastReceived = (dateStr: string | null) => { if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin} min sedan`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h sedan`;
    return d.toLocaleDateString("sv-SE");
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Email channel */}
        <Card
          className="relative overflow-hidden cursor-pointer bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] hover:bg-[#F5F9FF] transition-all"
          onClick={() => setEmailOpen(true)}
        >
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#0B4F6C]" />
          <CardContent className="p-[14px] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-[#0B4F6C]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-medium text-[#0F172A]">E-post</p>
                <StatusDot active={emailStatus.active} />
                {emailStatus.active && <span className="bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#5DCAA5] rounded-full text-[10px] px-[7px] py-px">Aktiv</span>}
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-[2px] truncate">
                {emailStatus.lastReceived
                  ? `Senast: ${formatLastReceived(emailStatus.lastReceived)}`
                  : "Vidarebefordra kvitton automatiskt"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp channel */}
        <Card
          className="relative overflow-hidden cursor-pointer bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] hover:bg-[#F5F9FF] transition-all"
          onClick={() => setWhatsappOpen(true)}
        >
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#1D9E75]" />
          <CardContent className="p-[14px] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-[#085041]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-medium text-[#0F172A]">WhatsApp</p>
                <StatusDot active={whatsappStatus.active} />
                {whatsappStatus.active && <span className="bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#5DCAA5] rounded-full text-[10px] px-[7px] py-px">Aktiv</span>}
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-[2px] truncate">
                {whatsappStatus.lastReceived
                  ? `Senast: ${formatLastReceived(whatsappStatus.lastReceived)}`
                  : "Skicka bild direkt till boten"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upload channel */}
        <Card className="relative overflow-hidden bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] hover:bg-[#F5F9FF] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#0B4F6C]" />
          <CardContent className="p-[14px] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-[#0B4F6C]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-medium text-[#0F172A]">Ladda upp</p>
                <StatusDot active={true} />
                <span className="bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#5DCAA5] rounded-full text-[10px] px-[7px] py-px">Aktiv</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-[2px]">Dra och släpp eller välj filer ovan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Modal */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Kvitto via e-post
            </DialogTitle>
            <DialogDescription>
              Vidarebefordra kvitton och fakturor som bilagor -- de analyseras automatiskt inom 60 sekunder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Skicka till:</p>
              <p className="font-mono text-sm font-semibold select-all">{emailAddress}</p>
            </div>

            {/* Channel status */}
            <div className="flex items-center gap-2 text-sm">
              <StatusDot active={emailStatus.active} />
              <span className="text-muted-foreground">
                {emailStatus.active
                  ? `Aktiv -- senast mottaget ${formatLastReceived(emailStatus.lastReceived)}`
                  : "Inaktiv -- skicka första kvittot för att aktivera"}
              </span>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Alla bilagor (JPG, PNG, PDF) analyseras automatiskt</p>
              <p>AI extraherar belopp, datum, leverantör och moms</p>
              <p>Kvittot matchas mot banktransaktioner</p>
              <p>Du får en notifikation när det är klart</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(emailAddress, "E-postadress")} className="gap-1.5 flex-1">
                <Copy className="h-4 w-4" /> Kopiera adress
              </Button>
              <Button variant="outline" onClick={() => window.open(`mailto:${emailAddress}?subject=Kvitto`, "_blank")} className="gap-1.5">
                <ExternalLink className="h-4 w-4" /> Skicka testkvitto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Modal */}
      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[hsl(142,70%,49%)]" />
              Kvitto via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Fota kvittot och skicka bilden direkt -- ingen text behovs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-3">Skanna QR-koden eller klicka nedan:</p>
              <div className="flex justify-center mb-3">
                <div className="bg-white p-3 rounded-lg inline-block">
                  <QRCodeSVG value={whatsappLink} size={160} level="M" />
                </div>
              </div>
              <p className="font-mono text-sm font-semibold">{whatsappNumber}</p>
              <p className="text-xs text-muted-foreground mt-1">Bokfy Bot</p>
            </div>

            {/* Channel status */}
            <div className="flex items-center gap-2 text-sm">
              <StatusDot active={whatsappStatus.active} />
              <span className="text-muted-foreground">
                {whatsappStatus.active
                  ? `Aktiv -- senast mottaget ${formatLastReceived(whatsappStatus.lastReceived)}`
                  : "Inaktiv -- skicka första bilden för att aktivera"}
              </span>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. Lägg till numret i dina kontakter</p>
              <p>2. Oppna WhatsApp och skicka bara bilden</p>
              <p>3. AI:n analyserar och bokfor automatiskt</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => window.open(whatsappLink, "_blank")} className="gap-1.5 flex-1 bg-[hsl(142,70%,41%)] hover:bg-[hsl(142,70%,35%)] text-white">
                <ExternalLink className="h-4 w-4" /> Oppna WhatsApp
              </Button>
              <Button variant="outline" onClick={() => copyToClipboard(whatsappNumber, "Telefonnummer")} className="gap-1.5">
                <Copy className="h-4 w-4" /> Kopiera nr
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusDot({ active }: { active: boolean }) { return (
    <span
      className={`inline-block w-[7px] h-[7px] rounded-full shrink-0 ${active ? "" : ""}`}
      style={{ backgroundColor: active ? "#1D9E75" : "#94A3B8" }}
      title={active ? "Aktiv" : "Inaktiv"}
    />
  );
}
