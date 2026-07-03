import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, FileSpreadsheet, LucideIcon, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CASHFLOW_MODULE_META,
  type CashflowModuleKey,
} from "@/lib/cashflow/shared";

const ICON_FOR: Record<CashflowModuleKey, LucideIcon> = {
  report: FileSpreadsheet,
  live: Activity,
  command: Zap,
};

const ICON_TINT: Record<CashflowModuleKey, string> = {
  report: "from-slate-700/20 to-slate-700/5 border-slate-300/50 text-slate-700 dark:text-slate-300",
  live: "from-[#3b82f6]/20 to-[#3b82f6]/5 border-[#C8DDF5] text-[#3b82f6]",
  command: "from-violet-500/20 to-violet-500/5 border-[#E2E8F0] text-violet-600",
};

const BRIDGE_ICON: Record<CashflowModuleKey, LucideIcon> = {
  report: FileSpreadsheet,
  live: Wallet,
  command: Zap,
};

interface Props {
  /** Which module is rendering this header. The bridge buttons exclude this one. */
  self: CashflowModuleKey;
  /** Optional override for which bridge buttons appear (default: the other two). */
  links?: CashflowModuleKey[];
  /** Optional status pill (e.g. LIVE / OFFLINE / RECONNECTING) rendered right of the title. */
  statusPill?: ReactNode;
  /** Optional additional controls (company picker, period chips, etc.) on the right. */
  rightSlot?: ReactNode;
  /** Override title/subtitle if needed. */
  title?: string;
  subtitle?: string;
  className?: string;
}

export function CashflowModuleHeader({
  self,
  links,
  statusPill,
  rightSlot,
  title,
  subtitle,
  className,
}: Props) {
  const navigate = useNavigate();
  const meta = CASHFLOW_MODULE_META[self];
  const Icon = ICON_FOR[self];
  const bridge = (links ?? (Object.keys(CASHFLOW_MODULE_META) as CashflowModuleKey[]).filter((k) => k !== self));

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "p-2 rounded-xl border bg-gradient-to-br flex-shrink-0",
            ICON_TINT[self],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 truncate">
            {title ?? meta.title}
            {statusPill}
          </h1>
          <p className="text-xs text-muted-foreground truncate">{subtitle ?? meta.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {rightSlot}
        {bridge.length > 0 && rightSlot && <span className="mx-1 h-5 w-px bg-border hidden sm:block" />}
        {bridge.map((key) => {
          const target = CASHFLOW_MODULE_META[key];
          const BIcon = BRIDGE_ICON[key];
          return (
            <Button
              key={key}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate(target.path)}
            >
              <BIcon className="h-3.5 w-3.5 mr-1.5" />
              {target.shortLabel}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
