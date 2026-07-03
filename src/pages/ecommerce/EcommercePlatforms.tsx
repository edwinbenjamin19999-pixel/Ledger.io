import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORM_CONFIGS, type PlatformCardInfo, type EcommercePlatform } from "@/lib/ecommerce/types";
import { RefreshCw, Settings, Plug } from "lucide-react";
import { toast } from "sonner";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { EcommerceStatusBadge } from "@/components/ecommerce/EcommerceStatusBadge";

const EcommercePlatforms = () => { const [connectDialog, setConnectDialog] = useState<PlatformCardInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const connectedPlatforms = new Set<EcommercePlatform>(['shopify', 'stripe']);

  const handleSave = async () => { setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success(`${connectDialog?.name} ansluten!`);
    setSaving(false);
    setConnectDialog(null);
    setFormData({});
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Plug}
        title="Plattformar & Integrationer"
        subtitle="Hantera dina anslutna e-handelsplattformar"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORM_CONFIGS.map((platform) => { const isConnected = connectedPlatforms.has(platform.platform);
          return (
            <Card key={platform.platform} className="bg-card/50 border-border/50 hover:border-border transition-colors">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-800 font-bold text-sm"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{platform.name}</p>
                      <EcommerceStatusBadge type={isConnected ? "bokford" : "vantande"} label={isConnected ? "Ansluten" : "Ej ansluten"} className="mt-0.5" />
                    </div>
                  </div>
                </div>
                {isConnected && (
                  <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
                    <p>Senaste synk: 5 min sedan</p>
                    <p>342 ordrar senaste 30 dagarna</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <ComingSoonButton className="flex-1 text-xs" tooltipText={`Inställningar för ${platform.name} lanseras snart`}>Inställningar</ComingSoonButton>
                      <ComingSoonButton className="flex-1 text-xs" tooltipText={`Synkronisering för ${platform.name} lanseras snart`}>Synkronisera</ComingSoonButton>
                    </>
                  ) : (
                    <Button size="sm" className="w-full text-xs gap-1" onClick={() => setConnectDialog(platform)}>
                      <Plug className="h-3 w-3" /> Anslut
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!connectDialog} onOpenChange={(o) => !o && setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anslut {connectDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {connectDialog?.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm">{field.label}</Label>
                {field.type === 'oauth' ? (
                  <ComingSoonButton tooltipText="OAuth2-koppling aktiveras snart" className="w-full">Öppna OAuth2-flöde</ComingSoonButton>
                ) : (
                  <Input
                    type={field.type === 'password' ? 'password' : 'text'}
                    placeholder={field.label}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Sparar…" : "Spara och synkronisera"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EcommercePlatforms;
