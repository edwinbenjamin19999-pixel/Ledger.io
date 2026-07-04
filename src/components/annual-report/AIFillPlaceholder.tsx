import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

export interface AIFillPlaceholderProps {
  label?: string;
  /** Returns text to insert. Throwing or returning empty cancels. */
  onAIFill: () => Promise<string> | string;
  onManual?: () => void;
}

export function AIFillPlaceholder({
  label = "Tomt",
  onAIFill,
  onManual,
}: AIFillPlaceholderProps) {
  const [loading, setLoading] = useState(false);

  const trigger = async () => {
    setLoading(true);
    try { await onAIFill(); }
    finally { setLoading(false); }
  };

  return (
    <div
      className="rounded-[10px] px-3 py-3 text-[12px] text-[#64748B] bg-[#FAFAFA] flex items-center gap-2 flex-wrap"
      style={{ border: "1px dashed #CBD5E1" }}
    >
      <span className="text-[#94A3B8]">{label} —</span>
      <button
        onClick={trigger}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[#0040CC] hover:underline font-medium disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        AI-fyll
      </button>
      {onManual && (
        <>
          <span className="text-[#CBD5E1]">eller</span>
          <button onClick={onManual} className="text-[#0040CC] hover:underline font-medium">
            skriv manuellt
          </button>
        </>
      )}
    </div>
  );
}
