import { Check } from "lucide-react";

interface Props {
  label: string;
  value: string | null;
  onChange: (hex: string) => void;
  optional?: boolean;
  palette?: string[];
}

const DEFAULT_PALETTE = [
  "#3b82f6", // cyan
  "#4f46e5", // indigo
  "#10b981", // emerald
  "#0f172a", // slate
  "#7c3aed", // violet
  "#d97706", // amber
];

export function ColorPickerField({ label, value, onChange, optional, palette = DEFAULT_PALETTE }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
        {label}
        {optional && <span className="text-slate-400 font-normal">(valfritt)</span>}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {palette.map((c) => {
          const isActive = value?.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`h-8 w-8 rounded-full transition-all hover:scale-110 ${
                isActive ? "ring-2 ring-offset-2 ring-slate-900" : ""
              }`}
              style={{ background: c }}
              aria-label={`Välj färg ${c}`}
            >
              {isActive && <Check className="h-4 w-4 text-white mx-auto drop-shadow" />}
            </button>
          );
        })}
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="color"
            value={value || "#3b82f6"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 rounded-full border border-slate-200 cursor-pointer overflow-hidden p-0"
          />
          <input
            type="text"
            value={value || ""}
            onChange={(e) => {
              const v = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value;
              if (/^#[0-9a-f]{0,6}$/i.test(v)) onChange(v);
            }}
            placeholder="#3b82f6"
            className="h-8 w-24 rounded-md border border-slate-200 px-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 focus:border-[#3b82f6]"
          />
        </div>
      </div>
    </div>
  );
}
