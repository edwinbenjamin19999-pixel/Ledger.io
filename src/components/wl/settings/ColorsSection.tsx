import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { BrandDraft } from "@/hooks/useTenantBrandDraft";
import { assessColorQuality, deriveTenantTheme } from "@/lib/tenant/tenantTheme";

interface Props {
  draft: BrandDraft;
  update: <K extends keyof BrandDraft>(k: K, v: BrandDraft[K]) => void;
}

export function ColorsSection({ draft, update }: Props) {
  const quality = assessColorQuality(draft.primary_color);
  const theme = deriveTenantTheme(draft.primary_color, draft.accent_color);
  const wasClamped = theme.meta.primaryWasClamped;
  const lowContrast = theme.meta.contrastRatio < 4.5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Färger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Primärfärg</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={draft.primary_color}
              onChange={(e) => update("primary_color", e.target.value)}
              className="h-10 w-14 rounded-md border cursor-pointer"
            />
            <Input
              value={draft.primary_color}
              onChange={(e) => update("primary_color", e.target.value)}
              className="font-mono"
            />
          </div>

          {wasClamped && (
            <div className="flex items-start gap-2 text-xs text-[#7A5417] bg-[#FAEEDA] border border-[#F0DDB7] rounded-md p-2.5">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Färgen tonades ned för premium-standard</p>
                <p className="text-amber-700/90">
                  Original: <span className="font-mono">{quality.adjustedHex !== draft.primary_color ? draft.primary_color : theme.meta.originalPrimary}</span>
                  {" → "}
                  Använd: <span className="font-mono">{theme.meta.finalPrimaryHex}</span>
                </p>
                {quality.warnings.map((w, i) => (
                  <p key={i} className="text-amber-700/80">• {w}</p>
                ))}
              </div>
            </div>
          )}

          {lowContrast && (
            <div className="flex items-start gap-2 text-xs text-[#7A5417] bg-[#FAEEDA] border border-[#F0DDB7] rounded-md p-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Kontrast mot vit text är {theme.meta.contrastRatio}:1 — under WCAG AA. Mörk text används automatiskt på brand-färgen.</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Accentfärg (valfri)</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={draft.accent_color || "#000000"}
              onChange={(e) => update("accent_color", e.target.value)}
              className="h-10 w-14 rounded-md border cursor-pointer"
            />
            <Input
              value={draft.accent_color || ""}
              onChange={(e) => update("accent_color", e.target.value || null)}
              placeholder="#3b82f6"
              className="font-mono"
            />
          </div>
        </div>

        {/* ── Live preview: mini cockpit ─────────────────────────── */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Förhandsvisning</Label>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="relative overflow-hidden rounded-xl p-4 border border-white/[0.08] shadow-[0_10px_30px_rgba(2,6,23,0.25)]"
              style={{ backgroundImage: theme.gradients.revenue }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
              <div className="relative flex items-start justify-between">
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/55 font-semibold">Intäkter</span>
                <TrendingUp className="h-4 w-4 text-white/25" />
              </div>
              <p className="relative mt-2 text-xl font-bold text-white tabular-nums tracking-tight">1 240 800</p>
              <p className="relative mt-1 text-[10px] text-emerald-300">↑ +12.4%</p>
            </div>
            <div
              className="relative overflow-hidden rounded-xl p-4 border border-white/[0.08] shadow-[0_10px_30px_rgba(2,6,23,0.25)]"
              style={{ backgroundImage: theme.gradients.cash }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
              <div className="relative flex items-start justify-between">
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/55 font-semibold">Kassa</span>
                <Wallet className="h-4 w-4 text-white/25" />
              </div>
              <p className="relative mt-2 text-xl font-bold text-white tabular-nums tracking-tight">486 200</p>
              <p className="relative mt-1 text-[10px] text-emerald-300">↑ +3.1%</p>
            </div>
          </div>
          <button
            type="button"
            className="w-full rounded-md py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: `hsl(${theme.primaryHsl})`, color: theme.onPrimary }}
          >
            Exempel-knapp
          </button>
          <p className="text-[10px] text-muted-foreground">
            Ändringar sparas inte automatiskt — klicka <strong>Spara</strong> i toppen för att publicera.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
