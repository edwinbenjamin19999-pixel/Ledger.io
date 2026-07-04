import * as React from "react";
import { cn } from "@/lib/utils";

export type DSBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "ai"
  | "beta"
  | "info";

interface DSBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: DSBadgeVariant;
  dot?: boolean;
}

const styles: Record<DSBadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  success: { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5", dot: "#0F6E56" },
  warning: { bg: "#FAEEDA", text: "#412402", border: "#EF9F27", dot: "#854F0B" },
  danger:  { bg: "#FCEBEB", text: "#501313", border: "#F09595", dot: "#791F1F" },
  ai:      { bg: "#EEEDFE", text: "#26215C", border: "#AFA9EC", dot: "#534AB7" },
  beta:    { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0", dot: "#94A3B8" },
  info:    { bg: "#EFF6FF", text: "#0C447C", border: "#85B7EB", dot: "#1074A0" },
};

export function DSBadge({ variant = "info", dot = true, className, children, ...rest }: DSBadgeProps) {
  const s = styles[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-[2px] rounded-ds-pill text-[10px] font-medium border-0.5",
        className
      )}
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
      {...rest}
    >
      {dot && (
        <span
          className="inline-block rounded-full"
          style={{ width: 5, height: 5, background: s.dot }}
        />
      )}
      {children}
    </span>
  );
}
