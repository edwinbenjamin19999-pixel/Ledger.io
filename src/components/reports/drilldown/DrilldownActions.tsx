/**
 * Sticky bottom action bar for the drilldown drawer.
 * Actions are level-aware — host decides which are enabled.
 */
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Bot,
  Flag,
  Sparkles,
  FileDown,
  Wand2,
} from "lucide-react";

interface DrilldownActionsProps {
  onOpenLedger?: () => void;
  onAskCfo?: () => void;
  onInvestigate?: () => void;
  onCreateAdjustment?: () => void;
  onExport?: () => void;
  onFlag?: () => void;
}

export function DrilldownActions(props: DrilldownActionsProps) {
  return (
    <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 flex flex-wrap gap-2 border-t border-border bg-card/95 px-6 py-3 backdrop-blur">
      {props.onOpenLedger && (
        <Button size="sm" variant="outline" onClick={props.onOpenLedger}>
          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
          Huvudboken
        </Button>
      )}
      {props.onAskCfo && (
        <Button size="sm" variant="outline" onClick={props.onAskCfo}>
          <Bot className="mr-1.5 h-3.5 w-3.5" />
          Fråga AI CFO
        </Button>
      )}
      {props.onInvestigate && (
        <Button size="sm" variant="outline" onClick={props.onInvestigate}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Undersök
        </Button>
      )}
      {props.onCreateAdjustment && (
        <Button size="sm" variant="outline" onClick={props.onCreateAdjustment}>
          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          Justering
        </Button>
      )}
      {props.onExport && (
        <Button size="sm" variant="outline" onClick={props.onExport}>
          <FileDown className="mr-1.5 h-3.5 w-3.5" />
          Exportera
        </Button>
      )}
      {props.onFlag && (
        <Button size="sm" variant="outline" onClick={props.onFlag}>
          <Flag className="mr-1.5 h-3.5 w-3.5" />
          Flagga
        </Button>
      )}
    </div>
  );
}
