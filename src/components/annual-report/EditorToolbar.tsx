import { Check, ChevronRight, Eye, Loader2, Sparkles } from "lucide-react";

export type SaveState = "saved" | "saving" | "error" | "idle";

export interface EditorToolbarProps {
  /** Breadcrumb segments, last is current section */
  breadcrumb: string[];
  saveState: SaveState;
  /** Optional timestamp string e.g. "14:23" */
  savedAt?: string;
  onAIFill?: () => void;
  onPreview?: () => void;
  aiFillDisabled?: boolean;
}

export function EditorToolbar({
  breadcrumb, saveState, savedAt, onAIFill, onPreview, aiFillDisabled,
}: EditorToolbarProps) {
  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-between gap-3 px-3 py-2 bg-white/95 backdrop-blur rounded-[10px] mb-3"
      style={{ border: "0.5px solid #E2E8F0" }}
    >
      {/* Left: breadcrumb */}
      <nav className="flex items-center gap-1 text-[12px] min-w-0 text-[#64748B]">
        {breadcrumb.map((seg, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 text-[#CBD5E1]" />}
            <span className={i === breadcrumb.length - 1 ? "text-[#0F172A] font-medium truncate" : "truncate"}>{seg}</span>
          </span>
        ))}
      </nav>

      {/* Center: save status */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] shrink-0">
        {saveState === "saving" && (<><Loader2 className="w-3 h-3 animate-spin" /> Sparar…</>)}
        {saveState === "saved" && (<><Check className="w-3 h-3 text-[#1D9E75]" /> Sparad{savedAt ? ` ${savedAt}` : ""}</>)}
        {saveState === "error" && (<span className="text-[#DC2626]">Kunde inte spara</span>)}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {onAIFill && (
          <button
            onClick={onAIFill}
            disabled={aiFillDisabled}
            className="text-[11px] px-2.5 py-1 rounded-md bg-[#0B4F6C] hover:bg-[#08374b] disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> AI-fyll avsnitt
          </button>
        )}
        {onPreview && (
          <button
            onClick={onPreview}
            className="text-[11px] px-2.5 py-1 rounded-md border border-[#CBD5E1] text-[#0F172A] bg-white hover:bg-[#F8FAFC] flex items-center gap-1"
          >
            <Eye className="w-3 h-3" /> Förhandsvisning
          </button>
        )}
      </div>
    </div>
  );
}
