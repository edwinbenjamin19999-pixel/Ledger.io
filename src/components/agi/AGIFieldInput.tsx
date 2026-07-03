// DEPRECATED: Use src/components/tax-agent/forms/AGIForm.tsx instead
// Kept for reference — do not import this component
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { AGI_FIELD_TOOLTIPS } from "./types";

interface AGIFieldInputProps {
  code: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export const AGIFieldInput = ({ code, label, value, onChange, readOnly }: AGIFieldInputProps) => {
  const tooltip = AGI_FIELD_TOOLTIPS[code];

  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm text-foreground">{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="text-xs text-muted-foreground font-mono w-8 text-right">{code}</span>
      {readOnly ? (
        <span className="w-36 text-right text-sm font-mono font-semibold text-foreground">{fmt(value)} kr</span>
      ) : (
        <div className="relative">
          <Input
            type="number"
            value={value || ""}
            onChange={e => onChange(Number(e.target.value) || 0)}
            className="w-36 h-9 text-sm text-right font-mono pr-8 rounded-lg border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-background [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">kr</span>
        </div>
      )}
    </div>
  );
};
