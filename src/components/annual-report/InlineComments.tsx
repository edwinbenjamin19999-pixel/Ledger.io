import { MessageSquare, Check, X } from "lucide-react";
import { useState } from "react";

export interface InlineComment {
  id: string;
  author: string;
  createdAt: string;
  body: string;
  resolved?: boolean;
}

export interface CommentMarginProps {
  comments: InlineComment[];
  showResolved?: boolean;
  onResolve?: (id: string) => void;
}

/**
 * Renders a colored margin indicator + expandable inline comment list.
 * Place absolutely-positioned next to a section. Caller controls layout.
 */
export function CommentMargin({ comments, showResolved = false, onResolve }: CommentMarginProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = comments.filter(c => showResolved || !c.resolved);
  if (!visible.length) return null;

  const tone = visible.some(c => !c.resolved) ? "bg-[#EF9F27]" : "bg-[#1D9E75]";

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(e => !e)}
        className={`flex items-center gap-1 text-white text-[10px] px-1.5 py-0.5 rounded-r-md ${tone}`}
        aria-label="Visa kommentarer"
      >
        <MessageSquare className="w-3 h-3" /> {visible.length}
      </button>
      {expanded && (
        <div
          className="absolute left-7 top-0 z-10 w-[260px] rounded-md bg-white shadow-lg p-2 space-y-2"
          style={{ border: "0.5px solid #E2E8F0" }}
        >
          {visible.map(c => (
            <div key={c.id} className="text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#0F172A]">{c.author}</span>
                <span className="text-[#94A3B8]">{c.createdAt}</span>
              </div>
              <p className={`mt-0.5 leading-snug ${c.resolved ? "line-through text-[#94A3B8]" : "text-[#334155]"}`}>{c.body}</p>
              {!c.resolved && onResolve && (
                <button
                  onClick={() => onResolve(c.id)}
                  className="mt-1 text-[10px] text-[#0B4F6C] hover:underline flex items-center gap-0.5"
                >
                  <Check className="w-3 h-3" /> Markera som löst
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-1 right-1 text-[#94A3B8] hover:text-[#0F172A]"
            aria-label="Stäng"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function ResolvedCommentsToggle({
  hasResolved, value, onChange,
}: { hasResolved: boolean; value: boolean; onChange: (v: boolean) => void }) {
  if (!hasResolved) return null;
  return (
    <label className="text-[11px] text-[#64748B] flex items-center gap-1.5 cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="rounded" />
      Visa lösta kommentarer
    </label>
  );
}
