import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}

export function PremiumSegmentedControl<T extends string>({ options, value, onChange, size = 'md' }: Props<T>) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80",
      size === 'sm' && "p-0.5"
    )}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg font-medium transition-all duration-200 whitespace-nowrap",
            size === 'md' ? "px-3.5 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]",
            value === opt.value
              ? "bg-[#3b82f6] text-white shadow-[0_4px_12px_-4px_rgba(0,82,255,0.5)]"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
