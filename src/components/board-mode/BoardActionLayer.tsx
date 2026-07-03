import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MODE_PROFILES, type BoardModeId } from "@/lib/board-mode/modeProfiles";

export const BoardActionLayer = ({
  mode,
  onSpecialAction,
}: {
  mode: BoardModeId;
  onSpecialAction?: (key: string) => void;
}) => {
  const navigate = useNavigate();
  const profile = MODE_PROFILES[mode];

  const handle = (route: string) => {
    if (route.startsWith("#")) {
      onSpecialAction?.(route.slice(1));
      return;
    }
    navigate(route);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">
          Top-3 åtgärder — {profile.shortLabel}
        </span>
      </div>
      <p className="text-gray-400 text-xs mb-6">{profile.tone}</p>
      <div className="grid md:grid-cols-3 gap-3">
        {profile.actions.map((a, i) => (
          <button
            key={i}
            onClick={() => handle(a.route)}
            className={cn(
              "group text-left rounded-xl border border-gray-200 bg-gray-50 p-5",
              "hover:bg-white hover:border-[#3b82f6]/40 hover:-translate-y-0.5 transition-all",
              "hover:shadow-md"
            )}
          >
            <p className="text-gray-800 font-medium text-sm leading-snug mb-3">{a.title}</p>
            <p className="text-gray-400 text-[11px] mb-4">{a.impactHint}</p>
            <span className="inline-flex items-center gap-1 text-[#3b82f6] text-xs font-medium group-hover:gap-2 transition-all">
              {a.cta} <ArrowRight className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
