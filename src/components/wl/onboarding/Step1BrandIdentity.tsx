import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OnboardingDraft, isValidSlug, slugify } from "@/hooks/useOnboardingDraft";
import { LogoDropzone } from "./LogoDropzone";
import { ColorPickerField } from "./ColorPickerField";
import { LivePreviewPane } from "@/components/wl/settings/LivePreviewPane";
import { useState } from "react";

interface Props {
  draft: OnboardingDraft;
  update: <K extends keyof OnboardingDraft>(k: K, v: OnboardingDraft[K]) => void;
  slugAvailable: boolean | null;
  checkingSlug: boolean;
}

export function Step1BrandIdentity({ draft, update, slugAvailable, checkingSlug }: Props) {
  const [previewView, setPreviewView] = useState<"sidebar" | "login">("sidebar");

  const slugValid = isValidSlug(draft.slug);
  const slugError =
    draft.slug.length > 0 && !slugValid
      ? "Endast a-z, 0-9 och bindestreck (3–50 tecken)."
      : slugAvailable === false
        ? "Den här adressen är upptagen."
        : null;

  // Build a synthetic BrandDraft for the preview pane
  const previewDraft = {
    name: draft.name || "Din byrå",
    logo_url: draft.logo_url,
    logo_dark_url: null,
    favicon_url: null,
    primary_color: draft.primary_color,
    accent_color: draft.accent_color,
    ai_name: draft.ai_name || "AI Ekonom",
    ai_tone: "advisory",
    intro_text: null,
    headline: `Välkommen till ${draft.name || "din plattform"}`,
    subheadline: "Din AI-drivna ekonomiplattform",
    trust_bullets: [],
    show_bankid: true,
    show_password_login: true,
    footer_attribution: "Powered by Ledger.io",
    support_email: null,
    support_url: null,
  };

  return (
    <div className="grid lg:grid-cols-[440px_1fr] gap-8 lg:gap-12">
      {/* LEFT: Form */}
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-cyan-100 text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider mb-3">
            <Sparkles className="h-3 w-3" /> Steg 1 · Brand identity
          </div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Sätt din identitet
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Detta är din plattform — inte Ledger.io. Allt uppdateras live till höger.
          </p>
        </div>

        <div className="space-y-5">
          <LogoDropzone
            logoUrl={draft.logo_url}
            onFile={(file, url) => {
              update("logo_file", file);
              update("logo_url", url);
            }}
            onClear={() => {
              update("logo_file", null);
              update("logo_url", null);
            }}
          />

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Workspace-namn</label>
            <Input
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="t.ex. Nordic Accounting"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Adress</label>
            <div className="flex items-stretch rounded-md border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#3b82f6]/30 focus-within:border-[#3b82f6]">
              <input
                value={draft.slug}
                onChange={(e) => update("slug", slugify(e.target.value))}
                placeholder="dittnamn"
                className="flex-1 px-3 py-2 text-sm font-mono outline-none"
              />
              <span className="bg-slate-50 border-l border-slate-200 px-3 py-2 text-xs text-slate-500 font-mono flex items-center">
                .northledger.se
              </span>
            </div>
            {slugError ? (
              <p className="text-xs text-[#7A1A1A]">{slugError}</p>
            ) : draft.slug && slugValid ? (
              <p className="text-xs text-[#085041]">
                {checkingSlug ? "Kontrollerar..." : slugAvailable ? "✓ Tillgänglig" : ""}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Genereras från workspace-namnet</p>
            )}
          </div>

          <ColorPickerField
            label="Primärfärg"
            value={draft.primary_color}
            onChange={(c) => update("primary_color", c)}
          />

          <ColorPickerField
            label="Accentfärg"
            value={draft.accent_color}
            onChange={(c) => update("accent_color", c)}
            optional
          />

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              AI-assistentens namn
              <span className="text-slate-400 font-normal">(valfritt)</span>
            </label>
            <Input
              value={draft.ai_name}
              onChange={(e) => update("ai_name", e.target.value)}
              placeholder="AI Ekonom"
              className="bg-white"
            />
            <p className="text-xs text-slate-400">
              Visas som "Hej, jag är {draft.ai_name || "AI Ekonom"}"
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT: Live preview */}
      <div className="lg:sticky lg:top-24 lg:self-start space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Live preview
          </div>
          <div className="inline-flex items-center bg-slate-100 rounded-full p-0.5">
            {(["sidebar", "login"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setPreviewView(v)}
                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
                  previewView === v
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {v === "sidebar" ? "App" : "Login"}
              </button>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${previewView}-${draft.primary_color}-${draft.logo_url}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <LivePreviewPane draft={previewDraft as any} view={previewView} />
          </motion.div>
        </AnimatePresence>
        <p className="text-[11px] text-slate-400 text-center">
          Allt går att finjustera senare i Brand Settings.
        </p>
      </div>
    </div>
  );
}
