/**
 * FinOS — Severity badge. Single rendering primitive used by every insight
 * card, alert strip, and risk indicator across the platform.
 */
import { cn } from "@/lib/utils";
import { SEVERITY, type FinOSSeverity } from "@/lib/finos/severity";

interface Props {
  severity: FinOSSeverity;
  /** Show the icon next to the label. */
  withIcon?: boolean;
  className?: string;
}

export function SeverityBadge({ severity, withIcon = false, className }: Props) {
  const meta = SEVERITY[severity];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 uppercase",
        meta.badge,
        className,
      )}
    >
      {withIcon && <Icon className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}
