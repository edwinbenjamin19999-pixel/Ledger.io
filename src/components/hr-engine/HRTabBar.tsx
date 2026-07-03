import { cn } from "@/lib/utils";

interface Tab {
  value: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  value: string;
  onChange: (v: string) => void;
}

export function HRTabBar({ tabs, value, onChange }: Props) {
  return (
    <div className="border-b-[0.5px] border-[#E2E8F0] flex gap-0 bg-white px-4">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "px-[14px] py-[8px] text-[12px] -mb-px border-b-2 transition-colors",
              active
                ? "text-[#1D4ED8] font-medium border-[#1D4ED8]"
                : "text-[#475569] border-transparent hover:text-[#0F172A]",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
