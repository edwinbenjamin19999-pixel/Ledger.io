import { useState, type ReactNode } from "react";
import { ChevronDown, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentSettingsValue } from "./types";

interface Props {
  value: AgentSettingsValue;
  onChange: (next: AgentSettingsValue) => void;
  agentSpecific?: ReactNode;
}

export function SettingsPanel({ value, onChange, agentSpecific }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 p-4 text-left">
        <SettingsIcon className="h-4 w-4 text-slate-500" />
        <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          Inställningar
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-6 border-t border-slate-100 p-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Autonomi-nivå
          </label>
          <Select
            value={value.autonomy}
            onValueChange={(v) =>
              onChange({ ...value, autonomy: v as AgentSettingsValue["autonomy"] })
            }
          >
            <SelectTrigger className="w-full max-w-md text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">
                Full autonomi (agera utan input)
              </SelectItem>
              <SelectItem value="suggest">
                Föreslå först, vänta på godkännande
              </SelectItem>
              <SelectItem value="inform">
                Bara informera, gör inget
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">
              Konfidenströskel
            </label>
            <span className="text-xs tabular-nums text-slate-500">
              Agera bara när konfidens överstiger {value.confidenceThreshold}%
            </span>
          </div>
          <Slider
            min={50}
            max={100}
            step={1}
            value={[value.confidenceThreshold]}
            onValueChange={([v]) =>
              onChange({ ...value, confidenceThreshold: v ?? value.confidenceThreshold })
            }
            className="max-w-md"
          />
        </div>

        {agentSpecific && (
          <div className="space-y-4 border-t border-slate-100 pt-5">
            {agentSpecific}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
