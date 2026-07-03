import { Home, FileText, ClipboardCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingApprovalCount } from "@/hooks/usePendingApprovalCount";

export type MobileTab =
  | "home"
  | "invoices"
  | "approvals"
  | "more"
  // Sub-destinations reachable via "Mer" sheet (kept for routing compatibility)
  | "receipts"
  | "expenses"
  | "documents"
  | "chat";

const tabs: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Hem", icon: Home },
  { id: "invoices", label: "Fakturor", icon: FileText },
  { id: "approvals", label: "Granska", icon: ClipboardCheck },
  { id: "more", label: "Mer", icon: Menu },
];

interface MobileNavBarProps {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
}

export const MobileNavBar = ({ active, onChange }: MobileNavBarProps) => {
  const pending = usePendingApprovalCount();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-[0.5px] border-[#E2E8F0]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primär navigering"
    >
      <div className="flex h-[64px]">
        {tabs.map((t) => {
          const isActive = active === t.id;
          const showBadge = t.id === "approvals" && pending > 0;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[44px] active:bg-slate-50 transition-colors relative"
              )}
            >
              <div className="relative">
                <t.icon
                  size={24}
                  strokeWidth={isActive ? 2 : 1.5}
                  color={isActive ? "#3b82f6" : "#94A3B8"}
                  fill={isActive ? "#3b82f6" : "none"}
                  fillOpacity={isActive ? 0.12 : 0}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-[3px] rounded-full bg-[#E24B4A] text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                    {pending > 9 ? "9+" : pending}
                  </span>
                )}
              </div>
              {isActive ? (
                <span className="text-[11px] leading-tight text-[#3b82f6] font-medium">
                  {t.label}
                </span>
              ) : (
                <span className="text-[11px] leading-tight text-[#94A3B8]">
                  {t.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
