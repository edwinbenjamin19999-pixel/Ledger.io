import { Banknote, CalendarClock, FileEdit, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExecutionBarProps {
  onPayNow: () => void;
  onSchedule: () => void;
  onAdjust: () => void;
  onMarkPaid: () => void;
  disabled?: boolean;
}

export function ExecutionBar({
  onPayNow,
  onSchedule,
  onAdjust,
  onMarkPaid,
  disabled,
}: ExecutionBarProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Nästa åtgärd</div>
          <h3 className="text-base font-semibold text-slate-900 mt-1">Kör ditt skattearbete från en plats</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onPayNow} disabled={disabled}>
            <Banknote className="w-4 h-4" />
            Betala nu
          </Button>
          <Button variant="outline" onClick={onSchedule} disabled={disabled}>
            <CalendarClock className="w-4 h-4" />
            Schemalägg
          </Button>
          <Button variant="outline" onClick={onAdjust}>
            <FileEdit className="w-4 h-4" />
            Förbered jämkning
          </Button>
          <Button variant="ghost" onClick={onMarkPaid} disabled={disabled}>
            <CheckCircle2 className="w-4 h-4" />
            Markera som betald
          </Button>
        </div>
      </div>
    </Card>
  );
}
