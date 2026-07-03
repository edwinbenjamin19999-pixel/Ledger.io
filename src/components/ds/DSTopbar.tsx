import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface DSTopbarProps {
  title: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function DSTopbar({ title, meta, status, onBack, actions, className }: DSTopbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 bg-[color:var(--ds-surface)] border-b-0.5 border-[color:var(--ds-border)]",
        className
      )}
      style={{ height: 48 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 rounded-ds-btn text-[color:var(--ds-text-3)] hover:text-[color:var(--ds-text-1)] hover:bg-[color:var(--ds-page-bg)]"
            aria-label="Tillbaka"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-medium tracking-[-0.01em] text-[color:var(--ds-text-1)] truncate">
              {title}
            </h1>
            {status}
          </div>
          {meta && (
            <div className="text-[11px] text-[color:var(--ds-text-3)] truncate mt-0.5">
              {meta}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
