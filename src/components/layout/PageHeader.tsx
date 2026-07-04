import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { LucideIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelfFixButton } from "@/components/shared/SelfFixButton";

/**
 * Mappar URL-prefix till modulnamn som `self-fix` edge function förstår.
 * Lägg till fler vid behov — okända prefix renderar ingen knapp.
 */
const SELF_FIX_MODULE_MAP: Array<{ match: RegExp; module: string }> = [
  { match: /^\/accounting|^\/bokforing/, module: "bokföring" },
  { match: /^\/bankavstamning|^\/bank/, module: "bank" },
  { match: /^\/moms|^\/vat/, module: "moms" },
  { match: /^\/payroll|^\/lon|^\/hr/, module: "lön" },
  { match: /^\/periodisering/, module: "periodisering" },
  { match: /^\/arsavstamning|^\/closing|^\/annual/, module: "årsavstämning" },
  { match: /^\/audit/, module: "revision" },
  { match: /^\/expense/, module: "utlägg" },
  { match: /^\/inventory/, module: "lager" },
  { match: /^\/customer-ledger|^\/ar-/, module: "kundreskontra" },
  { match: /^\/registry|^\/customer-supplier/, module: "register" },
  { match: /^\/agi|^\/tax/, module: "skatt" },
];

function detectModule(pathname: string): string | null {
  const found = SELF_FIX_MODULE_MAP.find((entry) => entry.match.test(pathname));
  return found ? found.module : null;
}

interface TabItem { label: string;
  value: string;
  icon?: LucideIcon;
}

interface BadgeConfig { label: string;
  variant: "success" | "warning" | "error" | "info" | "ai";
}

interface PageHeaderProps { icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  actions?: ReactNode;
  badge?: BadgeConfig;
  /** Sätt explicit modulnamn för Självfix, eller `false` för att dölja knappen. Standard: auto-detektera från URL. */
  selfFixModule?: string | false;
}

const BADGE_STYLES: Record<string, string> = { success: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
  warning: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  error: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
  info: "bg-[#EFF6FF] text-blue-700 border-[#C8DDF5]",
  ai: "bg-[#F1F5F9] text-purple-700 border-[#E2E8F0]",
};

export const PageHeader = ({ icon: Icon,
  iconColor = "from-slate-700 to-slate-900",
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
  badge,
  selfFixModule,
}: PageHeaderProps) => { const hasTabs = tabs && tabs.length > 0;
  const location = useLocation();
  const resolvedModule =
    selfFixModule === false
      ? null
      : selfFixModule ?? detectModule(location.pathname);

  return (
    <div className="w-full">
      {/* Zone A — Title bar */}
      <div className={cn("px-8 pt-8", hasTabs ? "pb-4" : "pb-6")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[#0F172A] leading-tight truncate">
                  {title}
                </h1>
                {badge && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap",
                      BADGE_STYLES[badge.variant]
                    )}
                  >
                    {badge.variant === "ai" && <Sparkles className="w-3 h-3" />}
                    {badge.label}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[13px] text-[#475569] mt-[2px]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {(actions || resolvedModule) && (
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {resolvedModule && (
                <SelfFixButton
                  module={resolvedModule}
                  size="sm"
                  variant="outline"
                  label="Självfix"
                />
              )}
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Zone B — Tab bar (optional) */}
      {hasTabs && (
        <div className="px-8 pt-0 pb-0 border-b border-border">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => { const TabIcon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => onTabChange?.(tab.value)}
                  className={cn(
                    "pb-3 text-sm font-medium border-b-2 mr-6 transition-colors whitespace-nowrap flex items-center gap-1.5",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Zone C — Spacer */}
      <div className="mb-8" />
    </div>
  );
};
