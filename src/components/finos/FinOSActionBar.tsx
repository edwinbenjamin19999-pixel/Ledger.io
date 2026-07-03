/**
 * FinOS — Renders a list of FinOSActions with consistent spacing and overflow.
 * First action is always primary, rest follow as secondary/ghost.
 */
import { cn } from "@/lib/utils";
import type { FinOSAction } from "@/lib/finos/actions";
import { FinOSActionButton } from "./FinOSActionButton";

interface Props {
  actions: FinOSAction[];
  size?: "sm" | "md";
  className?: string;
}

export function FinOSActionBar({ actions, size = "md", className }: Props) {
  if (!actions?.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {actions.map((a, i) => (
        <FinOSActionButton key={`${a.verb}-${i}`} action={a} size={size} />
      ))}
    </div>
  );
}
