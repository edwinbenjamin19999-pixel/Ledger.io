/**
 * CommentBubble — small inline trigger that shows the open-comment count for
 * an entity (row, KPI, cell). Clicking opens the global <CommentsPanel>.
 *
 * Designed to live inside table cells / KPI cards. Renders nothing if there
 * is no FinancialOS provider available.
 */
import { MessageSquare, MessageSquarePlus } from "lucide-react";
import { useCommentCount } from "@/hooks/useCollabComments";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";
import { cn } from "@/lib/utils";

interface Props {
  entity: string;
  className?: string;
  compact?: boolean;
}

export function CommentBubble({ entity, className, compact }: Props) {
  const fos = useFinancialOSOptional();
  const { data: count = 0 } = useCommentCount(entity);

  if (!fos) return null;

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    fos.openComments(entity);
  };

  const hasComments = count > 0;
  const Icon = hasComments ? MessageSquare : MessageSquarePlus;

  return (
    <button
      type="button"
      onClick={handleOpen}
      title={hasComments ? `${count} kommentar${count === 1 ? "" : "er"}` : "Lägg till kommentar"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-transparent px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        hasComments
          ? "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5] hover:bg-[#EFF6FF]"
          : "text-muted-foreground/60 hover:text-foreground hover:bg-muted",
        compact && "px-1",
        className,
      )}
      aria-label={hasComments ? `Visa ${count} kommentarer` : "Skriv kommentar"}
    >
      <Icon className="h-3 w-3" />
      {hasComments && <span>{count}</span>}
    </button>
  );
}
