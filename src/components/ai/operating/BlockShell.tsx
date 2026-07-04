import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BlockShellProps {
  label: string;          // monospace infrastructure label, e.g. "L2 · AGENT"
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  tone?: "neutral" | "alert";
  className?: string;
}

export function BlockShell({
  label, title, subtitle, icon: Icon, action, children, tone = "neutral", className,
}: BlockShellProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        tone === "alert" ? "border-rose-200/70 ring-1 ring-rose-100" : "border-slate-200/70",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">
            {label}
          </span>
          <div className="mt-1 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-slate-700" />}
            <h3 className="text-base font-semibold text-slate-900 tracking-tight truncate">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
