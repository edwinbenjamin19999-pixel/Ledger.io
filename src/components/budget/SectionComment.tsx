import { useState } from "react";
import { MessageSquare, StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SectionCommentProps {
  sectionKey: string;
  comment?: string;
  onSave: (sectionKey: string, text: string) => void;
}

export function SectionComment({ sectionKey, comment, onSave }: SectionCommentProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(comment || "");

  const hasComment = !!comment && comment.trim().length > 0;

  if (!open) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(true); setDraft(comment || ""); }}
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
            >
              {hasComment ? (
                <StickyNote className="w-3.5 h-3.5 text-[#C28A2B]" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5 text-slate-400 opacity-40 hover:opacity-100 transition-opacity" />
              )}
            </button>
          </TooltipTrigger>
          {hasComment && (
            <TooltipContent side="bottom" className="max-w-[240px] text-xs">
              {comment}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null; // The inline area is rendered separately
}

export function SectionCommentInline({
  sectionKey,
  comment,
  isOpen,
  onClose,
  onSave,
}: {
  sectionKey: string;
  comment?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sectionKey: string, text: string) => void;
}) {
  const [draft, setDraft] = useState(comment || "");

  if (!isOpen) return null;

  return (
    <div className="px-4 py-2 bg-amber-50/80 dark:bg-amber-900/10 border-b border-[#F0DDB7] dark:border-amber-800" onClick={e => e.stopPropagation()}>
      <Textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Lägg till kommentar för denna sektion..."
        className="text-xs min-h-[48px] bg-white dark:bg-slate-800 border-[#F0DDB7] dark:border-amber-700 resize-none"
        rows={2}
      />
      <div className="flex gap-2 mt-1.5 justify-end">
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onClose}>
          Avbryt
        </Button>
        <Button size="sm" className="h-6 text-xs px-3" onClick={() => { onSave(sectionKey, draft); onClose(); }}>
          Spara
        </Button>
      </div>
    </div>
  );
}
