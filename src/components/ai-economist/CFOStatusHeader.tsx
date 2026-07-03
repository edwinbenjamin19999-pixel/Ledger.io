import { useEffect, useState } from "react";
import { Bot, User, Sparkles, Hand, Handshake, Briefcase, Check } from "lucide-react";
import { useAIIdentity } from "@/hooks/useAIIdentity";
import type { AutomationMode, PersonaMode } from "@/hooks/useAIEconomistSettings";
import { cn } from "@/lib/utils";

interface Props {
  personaMode: PersonaMode;
  automationMode: AutomationMode;
  onPersonaChange: (m: PersonaMode) => void;
  onAutomationChange: (m: AutomationMode) => void;
  criticalCount: number;
  totalInsights: number;
  loading: boolean;
}

const modeIcons = { manual: Hand, assisted: Handshake, autonomous: Bot };
const modeLabels: Record<AutomationMode, string> = {
  manual: "Manuell — AI föreslår, du beslutar",
  assisted: "Assisterad — AI förbereder, ett klick utför",
  autonomous: "Autonom — AI utför säkra åtgärder",
};

export function CFOStatusHeader({
  personaMode, automationMode, onPersonaChange, onAutomationChange,
  criticalCount, totalInsights, loading,
}: Props) {
  const { name } = useAIIdentity();
  const [savedPing, setSavedPing] = useState<"persona" | "mode" | null>(null);

  useEffect(() => {
    if (!savedPing) return;
    const t = setTimeout(() => setSavedPing(null), 1200);
    return () => clearTimeout(t);
  }, [savedPing]);

  const handlePersona = (p: PersonaMode) => { onPersonaChange(p); setSavedPing("persona"); };
  const handleMode = (m: AutomationMode) => { onAutomationChange(m); setSavedPing("mode"); };

  const StatusPill = loading
    ? { text: "Analyserar…", color: "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5] dark:bg-[#EFF6FF] dark:text-[#3b82f6] dark:border-[#C8DDF5]" }
    : criticalCount > 0
    ? { text: `${criticalCount} kritiska`, color: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] dark:bg-[#FCE8E8] dark:text-rose-200 dark:border-[#F4C8C8]" }
    : totalInsights > 0
    ? { text: `${totalInsights} insikter`, color: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-[#FAEEDA] dark:text-amber-200 dark:border-[#F0DDB7]" }
    : { text: "Allt klart", color: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-[#E1F5EE] dark:text-emerald-200 dark:border-[#BFE6D6]" };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-[#0a1428] dark:via-[#0F1B2D] dark:to-[#1a1442] p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_0_60px_rgba(37,99,235,0.12)]">
      <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[#EFF6FF] dark:bg-[#EFF6FF] blur-3xl" />
      <div className="relative flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0F1F3D] flex items-center justify-center shadow-lg shadow-[#3b82f6]/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{name}</h1>
              <p className="text-sm text-muted-foreground">Proaktiv finansiell beslutsmotor</p>
            </div>
            <span className={cn("ml-3 px-3 py-1 rounded-full border text-xs font-medium", StatusPill.color)}>
              {StatusPill.text}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Persona toggle */}
          <div className="relative rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 flex">
            {(["business_owner", "accountant"] as PersonaMode[]).map((p) => {
              const PIcon = p === "accountant" ? Briefcase : User;
              return (
                <button
                  key={p}
                  onClick={() => handlePersona(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                    personaMode === p
                      ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm ring-1 ring-[#3b82f6]/50 dark:ring-[#3b82f6]/30"
                      : "text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/80"
                  )}
                >
                  <PIcon className="h-3 w-3" />
                  {p === "business_owner" ? "Företagare" : "Redovisare"}
                </button>
              );
            })}
            {savedPing === "persona" && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow animate-in fade-in zoom-in">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>

          {/* Automation mode */}
          <div className="relative rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 flex">
            {(["manual", "assisted", "autonomous"] as AutomationMode[]).map((m) => {
              const Icon = modeIcons[m];
              const active = automationMode === m;
              return (
                <button
                  key={m}
                  onClick={() => handleMode(m)}
                  title={modeLabels[m]}
                  className={cn(
                    "px-3 py-1.5 rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-all",
                    active
                      ? "bg-[#1D4ED8] text-[#E6F4FA] shadow-sm"
                      : "bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFB]"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {m === "manual" ? "Manuell" : m === "assisted" ? "Assisterad" : "Autonom"}
                </button>
              );
            })}
            {savedPing === "mode" && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow animate-in fade-in zoom-in">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
