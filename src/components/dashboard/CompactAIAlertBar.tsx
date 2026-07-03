import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Issue {
  text: string;
  href?: string;
}

interface Props {
  issues?: Issue[];
  actionHref?: string;
  actionLabel?: string;
}

/**
 * Compact single-line AI alert bar.
 * Replaces the large DailyAIBriefing card on the dashboard for higher density.
 */
export function CompactAIAlertBar({
  issues = [
    { text: "1 post kräver granskning", href: "/bookkeep" },
    { text: "2 fakturor förfallna", href: "/invoices" },
    { text: "Kassaflödet volatilt", href: "/cashflow-forecast" },
  ],
  actionHref = "/ai-ekonom",
  actionLabel = "Åtgärda",
}: Props) {
  const navigate = useNavigate();

  if (!issues.length) return null;

  return (
    <div className="bg-[#0F1B2D] border border-white/[0.08] rounded-xl px-5 py-3 flex items-center gap-3 mb-5">
      <Sparkles className="w-4 h-4 text-[#3b82f6] shrink-0" />
      <div className="text-white/70 text-sm flex-1 min-w-0 truncate">
        {issues.map((i, idx) => (
          <span key={idx}>
            {idx > 0 && <span className="text-white/30 mx-2">·</span>}
            {i.text}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => navigate(actionHref)}
        className="text-[#3b82f6] text-sm font-medium hover:text-[#3b82f6]/80 inline-flex items-center gap-1 shrink-0"
      >
        {actionLabel} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
