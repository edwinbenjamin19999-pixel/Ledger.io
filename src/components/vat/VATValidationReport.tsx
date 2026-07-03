/**
 * Renders the 11-check eSKD compliance report inline in VATSubmitDialog.
 */
import { CheckCircle2, XCircle, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationResult } from "@/lib/vat/validateESKDXml";

export function VATValidationReport({ result }: { result: ValidationResult }) {
  const total = result.checks.length;
  const passed = result.checks.filter((c) => c.ok).length;

  return (
    <div className={cn(
      "rounded-xl border bg-slate-50 dark:bg-slate-900/50 p-3 space-y-2",
      result.ok ? "border-[#BFE6D6]" : "border-[#F4C8C8]"
    )}>
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        {result.ok ? (
          <ShieldCheck className="w-4 h-4 text-[#1D9E75]" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-[#C73838]" />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider">
          Compliance-validering
        </span>
        <span className={cn(
          "text-xs font-mono ml-auto",
          result.ok ? "text-[#085041]" : "text-[#7A1A1A]"
        )}>
          {passed}/{total} kontroller
        </span>
      </div>
      <ul className="space-y-1">
        {result.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-xs">
            {c.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-[#C73838] flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className={cn("font-medium", c.ok ? "text-slate-700 dark:text-slate-200" : "text-[#7A1A1A]")}>
                {c.label}
              </div>
              {!c.ok && c.message && (
                <div className="text-[11px] text-[#C73838] mt-0.5">{c.message}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
