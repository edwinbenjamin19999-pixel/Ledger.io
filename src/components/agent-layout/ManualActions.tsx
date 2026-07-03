import { Play, ScrollText, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentManualActionsHandlers } from "./types";

interface Props {
  handlers?: AgentManualActionsHandlers;
}

export function ManualActions({ handlers }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        Manuella åtgärder
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handlers?.onRunNow}
          disabled={!handlers?.onRunNow}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" /> Kör nu
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handlers?.onOpenFullLog}
          disabled={!handlers?.onOpenFullLog}
        >
          <ScrollText className="mr-1.5 h-3.5 w-3.5" /> Visa fullständig logg
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handlers?.onTrainAgent}
          disabled={!handlers?.onTrainAgent}
        >
          <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Träna agenten
        </Button>
      </div>
    </div>
  );
}
