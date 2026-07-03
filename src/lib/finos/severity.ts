/**
 * FinOS — Unified severity system.
 * Single source of truth for risk/priority levels across all 8 core modules.
 * Color tokens are semantic (HSL via Tailwind classes). Sort weights drive
 * deterministic ordering in `ranking.ts`.
 */
import { AlertOctagon, AlertTriangle, Eye, Info, CheckCircle2, type LucideIcon } from "lucide-react";

export type FinOSSeverity = "critical" | "warning" | "watch" | "info" | "positive";

export interface SeverityMeta {
  label: string;
  /** Tailwind classes for badge background + text */
  badge: string;
  /** Tailwind class for the left accent bar / dot */
  accent: string;
  /** Foreground text class for inline severity text */
  text: string;
  /** Lucide icon */
  icon: LucideIcon;
  /** Lower number = more urgent (sorted ascending) */
  weight: number;
}

export const SEVERITY: Record<FinOSSeverity, SeverityMeta> = {
  critical: {
    label: "Kritisk",
    badge: "bg-[#FCEBEB] text-[#501313] border-[0.5px] border-[#F09595] rounded-full text-[10px] font-medium px-[8px] py-px",
    accent: "bg-[#E24B4A]",
    text: "text-[#E24B4A]",
    icon: AlertOctagon,
    weight: 0,
  },
  warning: {
    label: "Varning",
    badge: "bg-[#FAEEDA] text-[#412402] border-[0.5px] border-[#EF9F27] rounded-full text-[10px] font-medium px-[8px] py-px",
    accent: "bg-[#EF9F27]",
    text: "text-[#EF9F27]",
    icon: AlertTriangle,
    weight: 1,
  },
  watch: {
    label: "Bevaka",
    badge: "bg-[#EFF6FF] text-[#0C447C] border-[0.5px] border-[#C8DDF5] rounded-full text-[10px] font-medium px-[8px] py-px",
    accent: "bg-[#1D4ED8]",
    text: "text-[#1D4ED8]",
    icon: Eye,
    weight: 2,
  },
  info: {
    label: "Info",
    badge: "bg-[#F1F5F9] text-[#475569] border-[0.5px] border-[#E2E8F0] rounded-full text-[10px] font-medium px-[8px] py-px",
    accent: "bg-[#94A3B8]",
    text: "text-[#475569]",
    icon: Info,
    weight: 3,
  },
  positive: {
    label: "Positivt",
    badge: "bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#BFE6D6] rounded-full text-[10px] font-medium px-[8px] py-px",
    accent: "bg-[#1D9E75]",
    text: "text-[#1D9E75]",
    icon: CheckCircle2,
    weight: 4,
  },
};

export function severityWeight(s: FinOSSeverity): number {
  return SEVERITY[s].weight;
}
