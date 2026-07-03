import { useState } from "react";
import { useFirmSettings } from "@/hooks/useFirmSettings";
import { BrandingPanel } from "@/components/advisor/settings/BrandingPanel";
import { RolesPanel } from "@/components/advisor/settings/RolesPanel";
import { StaffPanel } from "@/components/advisor/settings/StaffPanel";
import { Palette, Users, Settings as SettingsIcon, UserPlus } from "lucide-react";

const CARD_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(15,23,42,0.06)",
  boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
};

type Tab = "branding" | "staff" | "roles";

const AdvisorSettings = () => {
  const { firm, isLoading, update } = useFirmSettings();
  const [tab, setTab] = useState<Tab>("branding");

  const tabs: Array<{ key: Tab; label: string; icon: typeof Palette }> = [
    { key: "branding", label: "Varumärke & White Label", icon: Palette },
    { key: "staff",    label: "Medarbetare",             icon: UserPlus },
    { key: "roles",    label: "Roller & åtkomst",        icon: Users },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
          Kontrollpanel
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1 flex items-center gap-3">
          <SettingsIcon className="h-7 w-7" style={{ color: "hsl(var(--brand-primary))" }} />
          Byråinställningar
        </h1>
        <p className="text-[#64748B] mt-1.5">
          Anpassa varumärke, hantera teamroller och konfigurera klientåtkomst — allt på ett ställe.
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              tab === t.key ? "text-[#0F172A]" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
            }`}
            style={tab === t.key ? { borderColor: "hsl(var(--brand-primary))" } : undefined}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl p-6" style={CARD_STYLE}>
        {isLoading || !firm ? (
          <div className="py-12 text-center text-sm text-[#94A3B8]">Laddar inställningar…</div>
        ) : tab === "branding" ? (
          <BrandingPanel firm={firm} onSave={(p) => update.mutate(p)} isSaving={update.isPending} />
        ) : tab === "staff" ? (
          <StaffPanel />
        ) : (
          <RolesPanel />
        )}
      </div>
    </div>
  );
};

export default AdvisorSettings;
