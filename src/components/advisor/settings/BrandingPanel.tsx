import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Building2, Save, Globe, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import type { FirmSettings } from "@/hooks/useFirmSettings";
import { LogoUploader } from "./LogoUploader";
import { contrastRatio } from "@/hooks/useBureauBranding";

interface Props {
  firm: FirmSettings;
  onSave: (patch: Partial<FirmSettings>) => void;
  isSaving: boolean;
}

const PRESETS: Array<{ hex: string; name: string }> = [
  { hex: "#0B4F6C", name: "Ledger.io Navy" },
  { hex: "#1B4332", name: "Forest" },
  { hex: "#3B1F5E", name: "Purple" },
  { hex: "#7B2D00", name: "Burgundy" },
  { hex: "#1A3A5C", name: "Deep Blue" },
  { hex: "#2D3748", name: "Charcoal" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function BrandingPanel({ firm, onSave, isSaving }: Props) {
  const [draft, setDraft] = useState<FirmSettings>(firm);
  useEffect(() => setDraft(firm), [firm]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(firm);
  const validHex = HEX_RE.test(draft.brand_primary_color || "");
  const contrast = validHex ? contrastRatio(draft.brand_primary_color, "#FFFFFF") : 0;
  const wcagOk = contrast >= 4.5;

  const set = <K extends keyof FirmSettings>(k: K, v: FirmSettings[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <div className="space-y-8">
      {/* === LOGOTYPE === */}
      <Section title="Logotyp" subtitle="Visas i sidebar, fakturor, e-post och PDF-rapporter.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LogoUploader
            firmId={firm.id}
            value={draft.logo_url}
            onChange={(url) => set("logo_url", url)}
          />
          <MockSidebarPreview
            name={draft.name}
            logoUrl={draft.logo_url}
            color={validHex ? draft.brand_primary_color : "#0B4F6C"}
            showPoweredBy={draft.show_powered_by}
          />
        </div>
      </Section>

      {/* === BRAND COLOR === */}
      <Section title="Primär varumärkesfärg" subtitle="Används för knappar, accenter och aktiva navigeringselement.">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.hex}
                type="button"
                onClick={() => set("brand_primary_color", p.hex)}
                className={`h-10 w-10 rounded-xl border-2 transition ${
                  draft.brand_primary_color.toLowerCase() === p.hex.toLowerCase()
                    ? "border-[#0F172A] scale-110"
                    : "border-white shadow-sm hover:scale-105"
                }`}
                style={{ background: p.hex }}
                title={p.name}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={validHex ? draft.brand_primary_color : "#0B4F6C"}
              onChange={(e) => set("brand_primary_color", e.target.value)}
              className="h-10 w-14 rounded-lg border border-[#E2E8F0] cursor-pointer"
            />
            <Input
              value={draft.brand_primary_color}
              onChange={(e) => set("brand_primary_color", e.target.value)}
              placeholder="#0B4F6C"
              className="font-mono text-sm max-w-[160px]"
            />
            {!validHex && (
              <span className="text-xs text-[#DC2626]">Ogiltigt hex-format</span>
            )}
          </div>
          {validHex && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              wcagOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}>
              {wcagOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              Kontrast mot vit text: {contrast.toFixed(2)}:1 — {wcagOk ? "uppfyller WCAG AA" : "uppfyller ej WCAG AA (4.5:1)"}
            </div>
          )}
        </div>
      </Section>

      {/* === NAME & SUBTITLE === */}
      <Section title="Byråns namn & undertitel">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Byråns namn</Label>
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Min Byrå AB"
            />
          </div>
          <div className="space-y-2">
            <Label>Undertitel</Label>
            <Input
              value={draft.subtitle ?? ""}
              onChange={(e) => set("subtitle", e.target.value || null)}
              placeholder="Din redovisningsbyrå"
            />
          </div>
        </div>
      </Section>

      {/* === POWERED BY === */}
      <Section title="Powered by Ledger.io">
        <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#0F172A]">
              Visa "Powered by Ledger.io" i sidebar-footer
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Kan stängas av i Premium White Label-plan
            </div>
          </div>
          <Switch
            checked={draft.show_powered_by}
            onCheckedChange={(v) => set("show_powered_by", v)}
          />
        </div>
      </Section>

      {/* === CUSTOM DOMAIN === */}
      <Section title="Egen domän" subtitle="Låt klienter besöka portalen via din egen domän.">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#94A3B8]" />
            <Input
              value={draft.custom_domain ?? ""}
              onChange={(e) => set("custom_domain", e.target.value || null)}
              placeholder="ekonomi.minbyra.se"
              className="max-w-md"
            />
            <DomainStatusBadge status={draft.custom_domain_status} />
          </div>
          {draft.custom_domain && draft.custom_domain_status === "verified" && (
            <div className="text-xs text-[#0F766E]">
              Aktiv URL: <a className="underline" href={`https://${draft.custom_domain}`} target="_blank" rel="noreferrer">{draft.custom_domain}</a>
            </div>
          )}
          <a
            href="https://supabase.com/docs/guides/platform/custom-domains"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B4F6C] hover:underline"
          >
            Konfigurera DNS <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Section>

      {/* === CLIENT PORTAL BRANDING === */}
      <Section title="Klientportal" subtitle="Separat varumärke för klienternas inloggningssida.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Portalnamn</Label>
            <Input
              value={draft.portal_name ?? ""}
              onChange={(e) => set("portal_name", e.target.value || null)}
              placeholder={draft.name}
            />
          </div>
          <div className="space-y-2">
            <Label>Support e-post</Label>
            <Input
              type="email"
              value={draft.support_email ?? ""}
              onChange={(e) => set("support_email", e.target.value || null)}
              placeholder="support@byrå.se"
            />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <Label>Portallogotyp (kan skilja sig från sidebar-logotyp)</Label>
          <LogoUploader
            firmId={firm.id}
            value={draft.portal_logo_url}
            onChange={(url) => set("portal_logo_url", url)}
            prefix="portal"
            label="Ladda upp portal-logotyp"
          />
        </div>
        <div className="space-y-2 mt-4">
          <Label>Välkomstmeddelande</Label>
          <textarea
            value={draft.portal_welcome_message ?? ""}
            onChange={(e) => set("portal_welcome_message", e.target.value || null)}
            rows={3}
            placeholder="Välkommen till din ekonomiportal …"
            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
          />
        </div>
      </Section>

      {/* === CLIENT PORTAL TOGGLES === */}
      <Section title="Åtkomst">
        <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-3">
          <Toggle
            label="Klientportal aktiv"
            hint="Klienter kan logga in och se sina rapporter"
            value={draft.client_portal_enabled}
            onChange={(v) => set("client_portal_enabled", v)}
          />
          <Toggle
            label="Tillåt själv-registrering"
            hint="Kräver godkännande från byråadmin"
            value={draft.allow_client_self_signup}
            onChange={(v) => set("allow_client_self_signup", v)}
          />
        </div>
      </Section>

      {/* === SAVE === */}
      <div className="sticky bottom-0 bg-white pt-4 border-t border-[#E2E8F0]">
        <Button
          onClick={() => onSave(draft)}
          disabled={!dirty || isSaving || !validHex}
          className="w-full h-11"
          style={{ background: validHex ? draft.brand_primary_color : undefined }}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Sparar…" : dirty ? "Spara ändringar" : "Inga ändringar"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
        {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label, hint, value, onChange,
}: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-[#0F172A]">{label}</div>
        <div className="text-xs text-[#64748B]">{hint}</div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function DomainStatusBadge({ status }: { status: FirmSettings["custom_domain_status"] }) {
  if (status === "verified")
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Aktiv ✓</span>;
  if (status === "pending")
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-700">Väntar DNS</span>;
  if (status === "failed")
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-red-100 text-red-700">Misslyckades</span>;
  return null;
}

function MockSidebarPreview({
  name, logoUrl, color, showPoweredBy,
}: { name: string; logoUrl: string | null; color: string; showPoweredBy: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white">
      <div className="text-[10px] uppercase tracking-widest font-bold text-[#94A3B8] px-3 pt-3">Förhandsvisning – sidebar</div>
      <div className="p-3">
        <div className="rounded-xl overflow-hidden" style={{ background: "#0B1929" }}>
          <div className="px-3 py-3 flex items-center gap-2 border-b border-white/5">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-7 w-7 rounded-lg object-contain bg-white/10 p-0.5" />
            ) : (
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-white/10">
                <Building2 className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div className="text-white text-xs font-semibold truncate">{name || "Byråns namn"}</div>
          </div>
          <div className="p-2 space-y-1">
            {["Översikt", "Klienter", "Insikter"].map((label, i) => (
              <div
                key={label}
                className={`relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${
                  i === 0 ? "text-white font-semibold" : "text-white/60"
                }`}
                style={i === 0 ? { background: "rgba(255,255,255,0.08)" } : undefined}
              >
                {i === 0 && <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full" style={{ background: color }} />}
                <div className="h-3 w-3 rounded-full" style={{ background: i === 0 ? color : "rgba(255,255,255,0.2)" }} />
                {label}
              </div>
            ))}
          </div>
          {showPoweredBy && (
            <div className="px-3 py-2 text-[8px] uppercase tracking-widest text-white/30 font-bold border-t border-white/5">
              Powered by Ledger.io
            </div>
          )}
        </div>
        <button
          className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white"
          style={{ background: color }}
        >
          Primär knapp
        </button>
      </div>
    </div>
  );
}
