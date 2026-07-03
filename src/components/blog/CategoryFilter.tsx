import { CATEGORIES } from "@/data/blog/categories";
import type { CategoryId } from "@/data/blog/types";
import { cn } from "@/lib/utils";

interface Props {
  active: CategoryId | "all";
  onChange: (id: CategoryId | "all") => void;
}

export const CategoryFilter = ({ active, onChange }: Props) => (
  <div className="sticky top-[60px] z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
    <div className="container mx-auto max-w-6xl px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
      <Pill active={active === "all"} onClick={() => onChange("all")}>Alla</Pill>
      {CATEGORIES.map((c) => (
        <Pill key={c.id} active={active === c.id} onClick={() => onChange(c.id)}>{c.label}</Pill>
      ))}
    </div>
  </div>
);

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 border",
      active
        ? "bg-[#3b82f6] text-white border-[#3b82f6] shadow-sm"
        : "bg-white text-[#475569] border-slate-200 hover:border-[#3b82f6] hover:text-[#3b82f6]",
    )}
  >
    {children}
  </button>
);
