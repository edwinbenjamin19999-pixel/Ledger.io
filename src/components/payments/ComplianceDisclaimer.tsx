import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "inline" | "banner";
  className?: string;
}

/**
 * PSD2-säker formulering. Visas i export-modaler och relevanta vyer för att
 * göra tydligt att NorthLedger inte agerar betalningsinitierare.
 */
export function ComplianceDisclaimer({ variant = "inline", className }: Props) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs",
        variant === "banner"
          ? "p-3 rounded-md bg-[#EFF6FF] dark:bg-sky-900/30 text-sky-900 dark:text-sky-100 border border-[#C8DDF5] dark:border-sky-800"
          : "text-muted-foreground",
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <span>
        NorthLedger förbereder endast betalningsdata och betalningsfiler. Betalningar godkänns och utförs av dig
        i din egen bank.
      </span>
    </div>
  );
}
