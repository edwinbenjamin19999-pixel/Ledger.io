import { AlertCircle, Check, ChevronRight } from "lucide-react";
import type { ComplianceCheck } from "@/lib/annual-report-compliance";
import { summarize } from "@/lib/annual-report-compliance";

export interface SidebarItem {
  id: string;
  label: string;
  indent?: 0 | 1;
  isHeader?: boolean;
  isDivider?: boolean;
  /** "Lägg till not"-style action row */
  isAction?: boolean;
  status?: "complete" | "incomplete" | "attention" | "missing_mandatory";
  k3Only?: boolean;
}

export interface ContentSidebarProps {
  activeId: string;
  framework: "K2" | "K3";
  items: SidebarItem[];
  checks: ComplianceCheck[];
  onSelect: (id: string) => void;
  onShowAllRequirements?: () => void;
}

export function ContentSidebar({
  activeId, framework, items, checks, onSelect, onShowAllRequirements,
}: ContentSidebarProps) {
  const sum = summarize(checks);
  return (
    <aside className="w-60 shrink-0 flex flex-col">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-[#64748B] uppercase px-2 mb-1">Innehåll</p>
      <nav className="space-y-0.5 flex-1">
        {items.map(item => {
          if (item.isDivider) return <div key={item.id} className="h-px bg-[#E2E8F0] my-2 mx-2" />;
          if (item.isHeader) {
            return (
              <p key={item.id} className="text-[10px] uppercase tracking-wider text-[#94A3B8] px-2 pt-2 pb-0.5">
                {item.label}
              </p>
            );
          }
          const k3Disabled = item.k3Only && framework === "K2";
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              disabled={k3Disabled}
              onClick={() => !k3Disabled && onSelect(item.id)}
              className={`group w-full text-left text-[12px] flex items-center justify-between gap-2 py-1.5 pr-2 transition-colors rounded-r ${
                active
                  ? "bg-[#EFF6FF] text-[#0C447C] font-medium border-l-[2px] border-[#0B4F6C]"
                  : k3Disabled
                  ? "text-[#CBD5E1] cursor-not-allowed border-l-[2px] border-transparent"
                  : item.status === "incomplete" || item.status === "missing_mandatory"
                  ? "text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] border-l-[2px] border-transparent"
                  : "text-[#0F172A] hover:bg-[#F8FAFC] border-l-[2px] border-transparent"
              }`}
              style={{ paddingLeft: `${10 + (item.indent ?? 0) * 14}px` }}
            >
              <span className="truncate flex items-center gap-1.5">
                {item.isAction && <span className="text-[#0B4F6C]">+</span>}
                {item.label}
                {k3Disabled && <span className="text-[9px]">(K3)</span>}
              </span>
              <StatusIcon status={item.status} />
            </button>
          );
        })}
      </nav>

      {/* Footer: compliance summary */}
      <div className="mt-3 pt-3 border-t border-[#E2E8F0] px-2">
        <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Regelverkskontroll</p>
        <p className="text-[12px] text-[#0F172A] mt-0.5">
          <span className="font-semibold">{sum.complete}</span> av <span className="font-semibold">{sum.total}</span> krav uppfyllda
        </p>
        <div className="mt-1.5 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
          <div className="h-full bg-[#0B4F6C] transition-all" style={{ width: `${sum.pct}%` }} />
        </div>
        {onShowAllRequirements && (
          <button
            onClick={onShowAllRequirements}
            className="mt-2 text-[11px] text-[#0B4F6C] hover:underline flex items-center gap-0.5"
          >
            Visa alla krav <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </aside>
  );
}

function StatusIcon({ status }: { status?: SidebarItem["status"] }) {
  if (status === "complete") return <Check className="w-3 h-3 text-[#1D9E75] shrink-0" />;
  if (status === "attention") return <AlertCircle className="w-3 h-3 text-[#EF9F27] shrink-0" />;
  if (status === "missing_mandatory") return <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />;
  return null;
}
