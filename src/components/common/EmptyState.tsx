import { type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface EmptyStateAction {
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: "default" | "outline";
}

interface EmptyStateProps {
  icon: LucideIcon;
  /** Why the area is empty — one short line. */
  title: string;
  /** Optional secondary line, e.g. what to do next. */
  description?: string;
  /** Up to two actions. The first is treated as primary. */
  actions?: EmptyStateAction[];
  /** Inline (smaller, no card) for inline use within other cards. */
  inline?: boolean;
  className?: string;
}

/**
 * Single source of truth for empty states across the app.
 * Rules: icon + one-line explanation + at least one clear next action.
 * Never use this with "Inga data att visa" — always explain *why* it's empty.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actions = [],
  inline = false,
  className = "",
}: EmptyStateProps) => {
  const Wrapper: React.ElementType = inline ? "div" : Card;
  const wrapperClass = inline
    ? `flex flex-col items-center text-center gap-3 py-8 px-4 ${className}`
    : `flex flex-col items-center text-center gap-3 p-10 border-slate-100 bg-white ${className}`;

  return (
    <Wrapper className={wrapperClass}>
      <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <div className="space-y-1 max-w-md">
        <p className="text-[14px] font-medium text-slate-900">{title}</p>
        {description && <p className="text-[13px] text-slate-500 leading-relaxed">{description}</p>}
      </div>
      {actions.length > 0 && (
        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          {actions.map((a, i) => {
            const variant = a.variant ?? (i === 0 ? "default" : "outline");
            const cls =
              variant === "default"
                ? "bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                : "border-slate-200";
            const inner = a.label;
            return a.to ? (
              <Button key={i} asChild size="sm" variant={variant} className={cls}>
                <Link to={a.to}>{inner}</Link>
              </Button>
            ) : (
              <Button key={i} size="sm" variant={variant} className={cls} onClick={a.onClick}>
                {inner}
              </Button>
            );
          })}
        </div>
      )}
    </Wrapper>
  );
};

export default EmptyState;
