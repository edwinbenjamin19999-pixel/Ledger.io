import { Shield, AlertTriangle, AlertOctagon, Ban } from "lucide-react";
import type { APRiskLevel } from "@/hooks/useAPInvoices";

interface Props {
  level: APRiskLevel;
  score?: number;
  blocked?: boolean;
  size?: "sm" | "md";
}

export function RiskBadge({ level, score, blocked, size = "sm" }: Props) {
  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1 px-[8px] py-px rounded-full border-[0.5px] border-[#F1A1A0] text-[10px] font-medium uppercase tracking-[0.07em] bg-[#FCE8E8] text-[#7A1F1E]">
        <Ban className="h-2.5 w-2.5" /> Blockerad
      </span>
    );
  }
  const map = {
    safe: {
      cls: "bg-[#E1F5EE] text-[#085041] border-[#5DCAA5]",
      icon: Shield,
      label: "Säker",
    },
    warning: {
      cls: "bg-[#FAEEDA] text-[#7A5417] border-[#E8C589]",
      icon: AlertTriangle,
      label: "Varning",
    },
    high: {
      cls: "bg-[#FCE8E8] text-[#7A1F1E] border-[#F1A1A0]",
      icon: AlertOctagon,
      label: "Hög risk",
    },
  };
  const c = map[level];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-[8px] py-px rounded-full border-[0.5px] text-[10px] font-medium uppercase tracking-[0.07em] ${c.cls} ${
        size === "md" ? "text-[11px] px-[10px] py-[2px]" : ""
      }`}
    >
      <Icon className="h-2.5 w-2.5" />
      {c.label}
      {typeof score === "number" && <span className="font-medium tabular-nums normal-case">· {score}</span>}
    </span>
  );
}
