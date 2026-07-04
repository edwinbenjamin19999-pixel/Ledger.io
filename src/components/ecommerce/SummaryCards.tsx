import { LucideIcon } from "lucide-react";
import { GradientKPIStrip, GradientKPICardData } from "@/components/shared/GradientKPICard";

interface SummaryCard { label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color: string;
  alert?: boolean;
  gradient?: string;
}

const COLOR_TO_GRADIENT: Record<string, string> = { "text-muted-foreground": "bg-[#0F1F3D]",
  "text-[#1D9E75]": "bg-[#0F1F3D]",
  "text-[#085041]": "bg-[#0F1F3D]",
  "text-primary": "bg-[#0F1F3D]",
  "text-destructive": "bg-[#0F1F3D]",
  "text-blue-500": "bg-[#0F1F3D]",
  "text-[#7A5417]": "bg-[#0F1F3D]",
  "text-secondary": "bg-[#0F1F3D]",
};

export const SummaryCards = ({ cards }: { cards: SummaryCard[] }) => { const gradientCards: GradientKPICardData[] = cards.map((card) => ({ label: card.label,
    value: card.value,
    sub: card.sub,
    icon: card.icon,
    gradient: card.gradient || COLOR_TO_GRADIENT[card.color] || "bg-[#0F1F3D]",
  }));

  return <GradientKPIStrip cards={gradientCards} />;
};
