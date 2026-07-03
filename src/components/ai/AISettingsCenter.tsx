import { useEffect, useState } from "react";
import { Brain, Shield, Sliders, Eye, BookOpen, Save, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AutomationLevel = "manual" | "high_confidence" | "fully_automated";

interface AISettings {
  level: AutomationLevel;
  autoBookThreshold: number; // 0-100
  suggestThreshold: number; // 0-100
  scope: {
    bookkeeping: boolean;
    vat: boolean;
    bankReconciliation: boolean;
    pos: boolean;
    customerReminders: boolean;
    supplierPayments: boolean;
  };
  learning: {
    learnFromEdits: boolean;
    suggestNewRules: boolean;
    autoApplyLearned: boolean;
    requireApprovalForRules: boolean;
  };
  transparency: {
    alwaysShowExplanation: boolean;
    auditModeDefault: boolean;
    showConfidenceEverywhere: boolean;
    fullChangeHistory: boolean;
  };
  safety: "no_post_without_approval" | "recurring_only" | "multi_signal_required";
}

const DEFAULTS: AISettings = {
  level: "high_confidence",
  autoBookThreshold: 95,
  suggestThreshold: 75,
  scope: {
    bookkeeping: true,
    vat: false,
    bankReconciliation: true,
    pos: true,
    customerReminders: false,
    supplierPayments: false,
  },
  learning: {
    learnFromEdits: true,
    suggestNewRules: true,
    autoApplyLearned: false,
    requireApprovalForRules: true,
  },
  transparency: {
    alwaysShowExplanation: true,
    auditModeDefault: false,
    showConfidenceEverywhere: true,
    fullChangeHistory: true,
  },
  safety: "multi_signal_required",
};

const STORAGE_KEY = "ai-settings:v1";

function loadSettings(): AISettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

/**
 * AI Settings Center — give users control over automation, confidence
 * thresholds, scope, learning, transparency and safety rules.
 *
 * Locally persisted (per browser). Server-side persistence can be added
 * by extending company settings later.
 */
export function AISettingsCenter() {
  const [settings, setSettings] = useState<AISettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
  };
  const updateNested = <P extends "scope" | "learning" | "transparency">(
    parent: P,
    key: keyof AISettings[P],
    value: boolean
  ) => {
    setSettings((s) => ({ ...s, [parent]: { ...s[parent], [key]: value } } as AISettings));
    setDirty(true);
  };

  const save = () => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setDirty(false);
    toast.success("AI-inställningar sparade");
  };

  const summary =
    settings.level === "manual"
      ? "Manuellt godkännande för allt"
      : settings.level === "fully_automated"
      ? "Helt automatiserad"
      : "Halvautomatiserad";

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-[#3b82f6]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI-inställningar</h1>
        </div>
        <p className="text-sm text-slate-500">Bestäm hur självständigt AI ska arbeta. Du kan när som helst ändra.</p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-blue-200/60 bg-[#0F1F3D] p-5">
        <p className="text-[11px] uppercase font-semibold text-[#3b82f6] tracking-wide">Nuvarande AI-läge</p>
        <h2 className="text-xl font-bold text-slate-900 mt-1">{summary}</h2>
        <ul className="text-sm text-slate-700 mt-3 space-y-1">
          <li>• Auto-bokför vid {settings.autoBookThreshold}%+ konfidens</li>
          <li>• Föreslår vid {settings.suggestThreshold}–{settings.autoBookThreshold}%</li>
          <li>• {settings.scope.bankReconciliation ? "Bankavstämning körs automatiskt" : "Bankavstämning manuell"}</li>
          <li>• {settings.scope.vat ? "Moms hanteras automatiskt" : "Moms kräver godkännande"}</li>
        </ul>
      </div>

      {/* A. Automation level */}
      <Section icon={Zap} title="Automatiseringsnivå" hint="Bestäm hur mycket AI får göra på egen hand.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            [
              { v: "manual", label: "Manuellt", desc: "Allt kräver ditt godkännande" },
              { v: "high_confidence", label: "Hög konfidens", desc: "Auto-bokför endast vid hög säkerhet" },
              { v: "fully_automated", label: "Helt automatiserad", desc: "AI hanterar hela flödet" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              onClick={() => update("level", opt.v)}
              className={cn(
                "text-left rounded-xl border p-3 transition-all",
                settings.level === opt.v
                  ? "border-[#3b82f6] bg-[#EFF6FF] ring-2 ring-blue-100"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* B. Confidence thresholds */}
      <Section icon={Sliders} title="Konfidensgränser" hint="Justera hur hög säkerhet AI behöver för olika åtgärder.">
        <div className="space-y-5">
          <ThresholdSlider
            label="Auto-bokför vid (eller över)"
            value={settings.autoBookThreshold}
            onChange={(v) => update("autoBookThreshold", v)}
            tone="emerald"
            helper="När alla signaler matchar bokförs transaktionen automatiskt."
          />
          <ThresholdSlider
            label="Föreslå (under auto-tröskel)"
            value={settings.suggestThreshold}
            onChange={(v) => update("suggestThreshold", v)}
            tone="amber"
            helper="Lägre konfidens — AI föreslår och du bekräftar."
            max={settings.autoBookThreshold - 1}
          />
          <p className="text-[11px] text-slate-500">
            Under {settings.suggestThreshold}% skickas transaktionen till granskning.
          </p>
        </div>
      </Section>

      {/* C. Scope */}
      <Section icon={Shield} title="Omfattning av automatisering" hint="Aktivera AI per område.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow
            label="Bokföring"
            checked={settings.scope.bookkeeping}
            onChange={(v) => updateNested("scope", "bookkeeping", v)}
          />
          <ToggleRow label="Moms" checked={settings.scope.vat} onChange={(v) => updateNested("scope", "vat", v)} />
          <ToggleRow
            label="Bankavstämning"
            checked={settings.scope.bankReconciliation}
            onChange={(v) => updateNested("scope", "bankReconciliation", v)}
          />
          <ToggleRow label="Kassaregister (POS)" checked={settings.scope.pos} onChange={(v) => updateNested("scope", "pos", v)} />
          <ToggleRow
            label="Kundpåminnelser"
            checked={settings.scope.customerReminders}
            onChange={(v) => updateNested("scope", "customerReminders", v)}
          />
          <ToggleRow
            label="Leverantörsbetalningar"
            checked={settings.scope.supplierPayments}
            onChange={(v) => updateNested("scope", "supplierPayments", v)}
          />
        </div>
      </Section>

      {/* D. Learning */}
      <Section icon={BookOpen} title="AI-inlärning" hint="Hur AI lär sig av dina rättelser.">
        <div className="space-y-2">
          <ToggleRow
            label="Lär av mina rättelser"
            checked={settings.learning.learnFromEdits}
            onChange={(v) => updateNested("learning", "learnFromEdits", v)}
          />
          <ToggleRow
            label="Föreslå nya regler"
            checked={settings.learning.suggestNewRules}
            onChange={(v) => updateNested("learning", "suggestNewRules", v)}
          />
          <ToggleRow
            label="Tillämpa inlärda mönster automatiskt"
            checked={settings.learning.autoApplyLearned}
            onChange={(v) => updateNested("learning", "autoApplyLearned", v)}
          />
          <ToggleRow
            label="Kräv godkännande innan ny regel aktiveras"
            checked={settings.learning.requireApprovalForRules}
            onChange={(v) => updateNested("learning", "requireApprovalForRules", v)}
          />
        </div>
      </Section>

      {/* E. Transparency */}
      <Section icon={Eye} title="Transparens & revision" hint="Hur tydligt AI ska visa sitt arbete.">
        <div className="space-y-2">
          <ToggleRow
            label="Visa alltid AI-förklaring"
            checked={settings.transparency.alwaysShowExplanation}
            onChange={(v) => updateNested("transparency", "alwaysShowExplanation", v)}
          />
          <ToggleRow
            label="Revisionsläge som standard"
            checked={settings.transparency.auditModeDefault}
            onChange={(v) => updateNested("transparency", "auditModeDefault", v)}
          />
          <ToggleRow
            label="Visa konfidensgrad överallt"
            checked={settings.transparency.showConfidenceEverywhere}
            onChange={(v) => updateNested("transparency", "showConfidenceEverywhere", v)}
          />
          <ToggleRow
            label="Spara fullständig ändringshistorik"
            checked={settings.transparency.fullChangeHistory}
            onChange={(v) => updateNested("transparency", "fullChangeHistory", v)}
          />
        </div>
      </Section>

      {/* F. Safety */}
      <Section icon={Shield} title="Säkerhetsregler" hint="Strikta gränser för när AI får posta.">
        <div className="space-y-2">
          {(
            [
              { v: "no_post_without_approval", label: "AI får aldrig posta utan godkännande" },
              { v: "recurring_only", label: "AI får auto-posta endast återkommande transaktioner" },
              {
                v: "multi_signal_required",
                label: "AI får auto-posta endast när bank + dokument + historik matchar",
              },
            ] as const
          ).map((opt) => (
            <label
              key={opt.v}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                settings.safety === opt.v ? "border-[#3b82f6] bg-[#EFF6FF]" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <input
                type="radio"
                name="safety"
                checked={settings.safety === opt.v}
                onChange={() => update("safety", opt.v)}
                className="accent-blue-600"
              />
              <span className="text-sm text-slate-800">{opt.label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-end gap-2 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <span className="text-xs text-slate-500 mr-auto">
          {dirty ? "Du har osparade ändringar" : "Alla ändringar sparade"}
        </span>
        <Button onClick={save} disabled={!dirty} className="gap-2">
          <Save className="w-4 h-4" />
          Spara inställningar
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Sub components ---------------- */

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Brain;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
      <span className="text-sm text-slate-800">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ThresholdSlider({
  label,
  value,
  onChange,
  tone,
  helper,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tone: "emerald" | "amber";
  helper: string;
  max?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-800">{label}</label>
        <span
          className={cn(
            "text-sm font-bold tabular-nums px-2 py-0.5 rounded-md",
            tone === "emerald" ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#FAEEDA] text-[#7A5417]"
          )}
        >
          {value}%
        </span>
      </div>
      <Slider value={[value]} min={50} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
      <p className="text-[11px] text-slate-500 mt-1.5">{helper}</p>
    </div>
  );
}
