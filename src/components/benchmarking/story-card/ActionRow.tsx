import { Eye, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CFOEntryButton } from "@/components/cfo-workspace/CFOEntryButton";
import { cn } from "@/lib/utils";
import type { CFOContextPayload } from "@/hooks/useCFOContext";

interface Props {
  context: CFOContextPayload;
  onReview?: () => void;
  onSimulate?: () => void;
  onCreateAction?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function ActionRow({
  context,
  onReview,
  onSimulate,
  onCreateAction,
  expanded,
  onToggleExpand,
}: Props) {
  return (
    <div
      className={cn(
        "grid gap-2",
        "grid-cols-2 md:grid-cols-4",
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-1.5 text-xs h-9"
        onClick={onReview ?? onToggleExpand}
      >
        <Eye className="h-3.5 w-3.5" />
        {expanded ? "Dölj" : "Granska"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="justify-start gap-1.5 text-xs h-9"
        onClick={onSimulate}
        disabled={!onSimulate}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Simulera
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="justify-start gap-1.5 text-xs h-9"
        onClick={onCreateAction}
        disabled={!onCreateAction}
      >
        <Target className="h-3.5 w-3.5" />
        Skapa åtgärd
      </Button>
      <CFOEntryButton
        context={context}
        label="AI CFO"
        size="sm"
        className="h-9 text-xs"
      />
    </div>
  );
}
