import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BoardModeId } from "@/lib/board-mode/modeProfiles";
import { MODE_PROFILES } from "@/lib/board-mode/modeProfiles";

interface Props {
  summary: string;
  updatedAt: string;
  pulsing: boolean;
  loading: boolean;
  mode: BoardModeId;
  narrativeVariant: BoardModeId;
  onRegenerate: (variant: BoardModeId) => void;
  onUseInExport: (text: string) => void;
}

const VARIANT_BUTTONS: Array<{ id: BoardModeId; label: string }> = [
  { id: "BOARD", label: "Styrelsekommentar" },
  { id: "CEO", label: "Ledningskommentar" },
  { id: "INVESTOR", label: "Investerarsammanfattning" },
];

export const ExecutiveSummaryEngine = ({
  summary, updatedAt, pulsing, loading, mode, narrativeVariant, onRegenerate, onUseInExport,
}: Props) => {
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const text = edited ?? summary;

  const timeStr = (() => {
    if (!updatedAt) return "";
    const diff = Date.now() - new Date(updatedAt).getTime();
    if (diff < 60_000) return "Uppdaterad just nu";
    if (diff < 3600_000) return `Uppdaterad för ${Math.floor(diff / 60_000)} min sedan`;
    return `Uppdaterad ${new Date(updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Sammanfattning kopierad");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kunde inte kopiera");
    }
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
      {/* Label row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="uppercase text-gray-400 text-[11px] tracking-widest">
          {MODE_PROFILES[narrativeVariant].label}
        </span>
        <span className="text-gray-300">·</span>
        <span className="uppercase text-gray-400 text-[11px] tracking-widest">
          AI-Narrativ
        </span>
        <span className="text-gray-300">·</span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: "#10B981" }}
          />
          <span className="uppercase text-emerald-600 font-medium text-[11px] tracking-widest">
            Aktivt läge: {MODE_PROFILES[mode].shortLabel}
          </span>
        </span>
        <span className="ml-auto text-gray-300 text-xs">
          {timeStr}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-5 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-5 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-5 bg-gray-100 rounded animate-pulse w-2/3" />
        </div>
      ) : edited !== null ? (
        <Textarea
          value={text}
          onChange={(e) => setEdited(e.target.value)}
          className="min-h-[160px] bg-gray-50 border-gray-200 text-gray-700"
          style={{ fontSize: 16, lineHeight: 1.7 }}
        />
      ) : (
        <p
          className="cursor-text text-gray-700"
          style={{ fontSize: 16, lineHeight: 1.7 }}
          onClick={() => setEdited(summary)}
          title="Klicka för att redigera"
        >
          {summary || "Ingen sammanfattning tillgänglig."}
        </p>
      )}

      <div className="mt-7 flex items-center gap-2 flex-wrap pt-5 border-t border-gray-100">
        <span className="uppercase mr-2 text-gray-400 text-[11px] tracking-widest">
          Generera:
        </span>
        {VARIANT_BUTTONS.map(v => (
          <button
            key={v.id}
            type="button"
            disabled={loading}
            onClick={() => { setEdited(null); onRegenerate(v.id); }}
            className="inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 rounded-lg px-4 py-2 text-sm font-normal bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
          >
            {loading && narrativeVariant === v.id
              ? <Loader2 className="h-3 w-3 animate-spin text-gray-400 mr-1.5" />
              : <span aria-hidden className="text-gray-400 mr-1.5 text-xs">✦</span>}
            {v.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            Kopiera
          </button>
          <button
            type="button"
            onClick={() => onUseInExport(text)}
            className="bg-[#0052FF] text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-[#0040CC] transition-colors"
          >
            Använd i export
          </button>
        </div>
      </div>
    </div>
  );
};
