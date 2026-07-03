import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { BrandDraft } from "@/hooks/useTenantBrandDraft";

interface Props {
  draft: BrandDraft;
  update: <K extends keyof BrandDraft>(k: K, v: BrandDraft[K]) => void;
}

export function LoginPageSection({ draft, update }: Props) {
  const updateBullet = (i: number, v: string) => {
    const next = [...draft.trust_bullets];
    next[i] = v;
    update("trust_bullets", next);
  };
  const removeBullet = (i: number) => update("trust_bullets", draft.trust_bullets.filter((_, idx) => idx !== i));
  const addBullet = () => update("trust_bullets", [...draft.trust_bullets, ""]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inloggningssida</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Rubrik</Label>
          <Input value={draft.headline} onChange={(e) => update("headline", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Underrubrik</Label>
          <Textarea
            value={draft.subheadline || ""}
            onChange={(e) => update("subheadline", e.target.value || null)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Trust-punkter</Label>
          <div className="space-y-2">
            {draft.trust_bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={b} onChange={(e) => updateBullet(i, e.target.value)} />
                <Button variant="ghost" size="icon" onClick={() => removeBullet(i)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addBullet}><Plus className="h-4 w-4 mr-1" /> Lägg till</Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>BankID-knapp</Label>
            <p className="text-xs text-muted-foreground">Visa "Logga in med BankID" på inloggningen.</p>
          </div>
          <Switch checked={draft.show_bankid} onCheckedChange={(v) => update("show_bankid", v)} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>E-post + lösenord</Label>
            <p className="text-xs text-muted-foreground">Visa traditionell inloggning.</p>
          </div>
          <Switch checked={draft.show_password_login} onCheckedChange={(v) => update("show_password_login", v)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Support-email</Label>
            <Input
              value={draft.support_email || ""}
              onChange={(e) => update("support_email", e.target.value || null)}
              placeholder="support@..."
            />
          </div>
          <div className="space-y-2">
            <Label>Support-URL</Label>
            <Input
              value={draft.support_url || ""}
              onChange={(e) => update("support_url", e.target.value || null)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sidfotstext</Label>
          <Input
            value={draft.footer_attribution || ""}
            onChange={(e) => update("footer_attribution", e.target.value || null)}
            placeholder="Powered by Bokfy"
          />
        </div>
      </CardContent>
    </Card>
  );
}
