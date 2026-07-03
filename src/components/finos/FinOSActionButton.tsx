/**
 * FinOS — Action button bound to the canonical verb enum.
 * Same icon + label + intent styling regardless of which module renders it.
 * Use <FinOSActionBar> when rendering multiple actions in a row.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VERBS, type FinOSAction } from "@/lib/finos/actions";

const intentClasses = {
  primary:
    "bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA]",
  secondary:
    "bg-white border-[0.5px] border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFB]",
  danger:
    "bg-[#E24B4A] hover:bg-[#B83837] text-white",
  ghost:
    "text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]",
} as const;

interface Props {
  action: FinOSAction;
  size?: "sm" | "md";
  className?: string;
}

export function FinOSActionButton({ action, size = "md", className }: Props) {
  const meta = VERBS[action.verb];
  const Icon = meta.icon;
  const [busy, setBusy] = useState(false);
  const pending = action.pending || busy;

  const handle = async () => {
    if (action.disabled || pending) return;
    if (meta.requiresConfirm) {
      // Lightweight inline confirmation. Modules can wrap in their own dialog if needed.
      const ok = window.confirm(`${meta.label}: är du säker?`);
      if (!ok) return;
    }
    try {
      setBusy(true);
      await action.onClick();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={action.disabled || pending}
      onClick={handle}
      title={meta.shortcut ? `${meta.label} (${meta.shortcut})` : meta.label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[8px] font-medium transition-colors disabled:opacity-60",
        size === "sm" ? "px-[10px] h-[28px] text-[11px]" : "px-[12px] h-[32px] text-[12px]",
        intentClasses[meta.intent],
        className,
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      <span>{action.label ?? meta.label}</span>
    </button>
  );
}
