import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { RealismResult } from "@/lib/budget/realismEngine";

interface Props {
  result: RealismResult;
}

export function RealismBanner({ result }: Props) {
  if (result.status === "ok") return null;

  const isCrit = result.status === "critical";
  const Icon = isCrit ? AlertCircle : AlertTriangle;
  const cls = isCrit
    ? "border-[#F4C8C8] bg-[#FCE8E8] text-[#7A1A1A]"
    : "border-[#F0DDB7] bg-[#FAEEDA] text-[#7A5417]";

  return (
    <div className={cn("rounded-2xl border p-3 space-y-2", cls)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="w-4 h-4" />
        {result.summary}
      </div>
      <ul className="space-y-1 text-xs">
        {result.warnings.slice(0, 3).map(w => (
          <li key={w.id} className="flex items-start justify-between gap-3">
            <div>
              <span className="font-medium">{w.title}</span>
              <span className="text-slate-600"> — {w.detail}</span>
            </div>
            {w.cta && (
              <Link to={w.cta.href} className="underline text-xs whitespace-nowrap">
                {w.cta.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
