import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandDraft } from "@/hooks/useTenantBrandDraft";

interface Props {
  draft: BrandDraft;
  update: <K extends keyof BrandDraft>(k: K, v: BrandDraft[K]) => void;
}

export function AIPersonaSection({ draft, update }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-persona</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>AI-namn</Label>
          <Input value={draft.ai_name} onChange={(e) => update("ai_name", e.target.value)} placeholder="t.ex. AI Ekonom" />
          <p className="text-xs text-muted-foreground">Namnet AI:n använder när den pratar med dina användare.</p>
        </div>

        <div className="space-y-2">
          <Label>Ton</Label>
          <Select value={draft.ai_tone} onValueChange={(v) => update("ai_tone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formell — professionell, korrekt</SelectItem>
              <SelectItem value="advisory">Rådgivande — pedagogisk, förklarar</SelectItem>
              <SelectItem value="executive">Executive — kortfattat, beslutsorienterat</SelectItem>
              <SelectItem value="operational">Operativ — praktisk, handlingsinriktad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Introduktionstext (valfri)</Label>
          <Textarea
            value={draft.intro_text || ""}
            onChange={(e) => update("intro_text", e.target.value || null)}
            placeholder="Hej! Jag är din ekonomi-AI..."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
