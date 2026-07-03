import { Calculator, FileText, Sparkles, BarChart3, Palette, Users, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { OnboardingDraft } from "@/hooks/useOnboardingDraft";

interface Module {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
  comingSoon?: boolean;
}

const MODULES: Module[] = [
  { id: "bookkeeping", name: "Bokföring", desc: "AI-driven kontering, BAS-kontoplan, momsregler.", icon: Calculator, recommended: true },
  { id: "invoicing", name: "Fakturering", desc: "Skapa, skicka och påminn — automatiskt.", icon: FileText },
  { id: "ai_assistant", name: "AI-assistent", desc: "Din finansiella copilot — alltid på.", icon: Sparkles, recommended: true },
  { id: "reporting", name: "Rapportering", desc: "Resultat, balans och kassaflöde i realtid.", icon: BarChart3 },
  { id: "white_label", name: "White Label-verktyg", desc: "Brand, domän och logos under ditt namn.", icon: Palette },
  { id: "payroll", name: "Lön", desc: "Lönehantering och AGI-rapportering.", icon: Users, comingSoon: true },
];

interface Props {
  draft: OnboardingDraft;
  toggleModule: (id: string) => void;
}

export function Step2Modules({ draft, toggleModule }: Props) {
  const enabledCount = Object.entries(draft.modules).filter(([, v]) => v).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-blue-100 text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider mb-3">
          Steg 2 · Plattform
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
          Välj vad din plattform innehåller
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">
          Vi har förvalt en balanserad uppsättning — du kan ändra när som helst. {enabledCount} av {MODULES.length} aktiverade.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => {
          const enabled = draft.modules[m.id] ?? false;
          const Icon = m.icon;
          const disabled = m.comingSoon;
          return (
            <div
              key={m.id}
              className={`relative rounded-2xl border bg-white p-5 transition-all overflow-hidden ${
                disabled
                  ? "opacity-60 border-slate-100"
                  : enabled
                    ? "border-[#C8DDF5] shadow-[0_4px_16px_rgba(37,99,235,0.08)]"
                    : "border-slate-100 hover:border-blue-200/60 hover:-translate-y-0.5 hover:shadow-md"
              }`}
              onClick={() => !disabled && toggleModule(m.id)}
              role="button"
              tabIndex={disabled ? -1 : 0}
            >
              {/* Active strip */}
              {enabled && !disabled && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: draft.primary_color }}
                />
              )}

              <div className="flex items-start justify-between mb-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                    enabled && !disabled ? "" : "bg-slate-50"
                  }`}
                  style={
                    enabled && !disabled
                      ? { background: `${draft.primary_color}14`, color: draft.primary_color }
                      : { color: "#94a3b8" }
                  }
                >
                  {disabled ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                {disabled ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    Snart
                  </span>
                ) : (
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => toggleModule(m.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{m.name}</h3>
                {m.recommended && !disabled && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#3b82f6] bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                    Rek.
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{m.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-slate-400 pt-2">
        Alla moduler kan aktiveras eller inaktiveras i settings när din plattform är live.
      </div>
    </div>
  );
}
