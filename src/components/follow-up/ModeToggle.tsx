import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FollowUpMode } from "@/lib/follow-up/varianceEngine";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

interface Props {
  mode: FollowUpMode;
  onModeChange: (m: FollowUpMode) => void;
  monthIndex: number;
  onMonthChange: (i: number) => void;
  latestActualMonth: number;
}

export function ModeToggle({ mode, onModeChange, monthIndex, onMonthChange, latestActualMonth }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as FollowUpMode)}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="live" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white">
            Live
          </TabsTrigger>
          <TabsTrigger
            value="live_forecast"
            className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white"
          >
            Live Forecast
          </TabsTrigger>
          <TabsTrigger value="month" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white">
            Månad
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {mode === "month" && (
        <Select value={String(monthIndex)} onValueChange={(v) => onMonthChange(Number(v))}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_LABELS.map((m, i) => (
              <SelectItem key={m} value={String(i)} disabled={i > Math.max(0, latestActualMonth)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
