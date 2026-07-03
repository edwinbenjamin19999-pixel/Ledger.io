import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

interface DSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  asChild?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-ds-btn font-medium " +
  "transition-colors duration-150 ease-out outline-none " +
  "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[color:var(--ds-brand-deep)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  md: "h-[34px] px-3.5 text-[12px]",
  sm: "h-[28px] px-3 text-[11px]",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[color:var(--ds-brand-deep)] text-[color:var(--ds-brand-tint)] " +
    "border-0.5 border-[color:var(--ds-brand-deep)] hover:bg-[color:var(--ds-brand-mid)] " +
    "hover:border-[color:var(--ds-brand-mid)]",
  secondary:
    "bg-[color:var(--ds-surface)] text-[color:var(--ds-text-1)] " +
    "border-0.5 border-[color:var(--ds-border)] hover:bg-[color:var(--ds-page-bg)]",
  ghost:
    "bg-transparent text-[color:var(--ds-text-2)] border-0.5 border-[color:var(--ds-border)] " +
    "hover:bg-[color:var(--ds-page-bg)] hover:text-[color:var(--ds-text-1)]",
  danger:
    "bg-[color:var(--ds-danger-bg)] text-[#791F1F] " +
    "border-0.5 border-[color:var(--ds-danger-border)] hover:bg-[#F9D9D9]",
};

export const DSButton = React.forwardRef<HTMLButtonElement, DSButtonProps>(
  ({ variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, sizes[size], variants[variant], className)}
        {...rest}
      >
        {Icon && <Icon size={14} strokeWidth={1.5} />}
        {children}
        {IconRight && <IconRight size={14} strokeWidth={1.5} />}
      </button>
    );
  }
);
DSButton.displayName = "DSButton";
