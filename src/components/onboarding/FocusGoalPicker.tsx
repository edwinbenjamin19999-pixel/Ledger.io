import { Sparkles, BarChart3, Receipt, Brain, LucideIcon } from "lucide-react";

export type FocusGoal = "automate" | "control" | "tax" | "insights";

interface Option {
  id: FocusGoal;
  icon: LucideIcon;
  title: string;
  description: string;
}

const OPTIONS: Option[] = [
  { id: "automate", icon: Sparkles,   title: "Automatisera bokföring", description: "Låt AI bokföra automatiskt" },
  { id: "control",  icon: BarChart3,  title: "Få bättre kontroll",     description: "Realtids-KPI och kassaflöde" },
  { id: "tax",      icon: Receipt,    title: "Sköta skatt & moms",     description: "Moms, AGI och deklarationer" },
  { id: "insights", icon: Brain,      title: "Få AI-insikter",         description: "Proaktiva förslag och varningar" },
];

interface FocusGoalPickerProps {
  value: FocusGoal | null;
  onChange: (value: FocusGoal) => void;
}

export const FocusGoalPicker = ({ value, onChange }: FocusGoalPickerProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {OPTIONS.map(({ id, icon: Icon, title, description }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`group relative text-left p-4 rounded-xl border transition-all duration-150 ${
              active
                ? "border-[#3b82f6] bg-[#3b82f6]/[0.04] shadow-[0_2px_12px_rgba(37,99,235,0.12)]"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors ${
              active ? "bg-[#3b82f6] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
            }`}>
              <Icon className="w-[18px] h-[18px]" />
            </div>
            <div className="text-[14px] font-semibold text-[#0F1B2D] leading-tight">{title}</div>
            <div className="text-[12px] text-slate-500 mt-1">{description}</div>
          </button>
        );
      })}
    </div>
  );
};
