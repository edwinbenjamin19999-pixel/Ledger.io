import { cn } from "@/lib/utils";
import type { ConfidenceBreakdown as CB } from "@/lib/vat/vatReviewEngine";

interface ConfidenceBreakdownProps {
  breakdown: CB;
  hasHistory: boolean;
}

const DIMENSIONS = [
  { key: "completeness", label: "Fullständighet" },
  { key: "rate_consistency", label: "Momssatskonsistens" },
  { key: "historical", label: "Historisk konsistens" },
  { key: "classification", label: "Kontoklassificering" },
  { key: "manual_adjustment", label: "Manuella justeringar" },
] as const;

function colorFor(score: number) {
  if (score >= 85) return { bar: "bg-[#1D9E75]", text: "text-[#085041] dark:text-[#1D9E75]" };
  if (score >= 60) return { bar: "bg-[#C28A2B]", text: "text-[#7A5417] dark:text-[#C28A2B]" };
  return { bar: "bg-[#C73838]", text: "text-[#7A1A1A] dark:text-[#C73838]" };
}

export function ConfidenceBreakdown({ breakdown, hasHistory }: ConfidenceBreakdownProps) {
  const dims = hasHistory ? DIMENSIONS : DIMENSIONS.filter((d) => d.key !== "historical");

  return (
    <div className="space-y-3">
      {dims.map((d) => {
        const score = breakdown[d.key as keyof CB] ?? 0;
        const c = colorFor(score);
        return (
          <div key={d.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/80 font-medium">{d.label}</span>
              <span className={cn("font-mono tabular-nums font-semibold", c.text)}>{score}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full transition-all duration-500", c.bar)} style={{ width: `${score}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
