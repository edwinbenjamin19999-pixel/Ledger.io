import * as React from "react";
import { cn } from "@/lib/utils";

export type DSCardVariant = "default" | "lifted" | "dark" | "ai" | "warning";

interface DSCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: DSCardVariant;
  padding?: "none" | "sm" | "md";
}

const variants: Record<DSCardVariant, string> = {
  default: "bg-[color:var(--ds-surface)] border-0.5 border-[color:var(--ds-border)] text-[color:var(--ds-text-1)]",
  lifted:  "bg-[color:var(--ds-page-bg)] border-0.5 border-[color:var(--ds-border)] text-[color:var(--ds-text-1)]",
  dark:    "bg-[color:var(--ds-dark-card)] border-0.5 border-white/10 text-white",
  ai:      "bg-[color:var(--ds-ai-panel-bg)] border-0.5 border-[color:var(--ds-ai-panel-border)] text-[color:var(--ds-text-1)]",
  warning: "bg-[color:var(--ds-warning-bg)] border-0.5 border-[color:var(--ds-warning-border)] text-[color:var(--ds-warning-text)]",
};

const paddings = { none: "", sm: "p-3", md: "p-4" };

export function DSCard({ variant = "default", padding = "md", className, ...rest }: DSCardProps) {
  return (
    <div
      className={cn("rounded-ds-card", variants[variant], paddings[padding], className)}
      {...rest}
    />
  );
}
