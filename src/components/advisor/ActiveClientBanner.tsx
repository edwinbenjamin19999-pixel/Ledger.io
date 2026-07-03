import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";

/**
 * Cyan "← Byråöversikt · [klientnamn]" strip rendered at the very top of every
 * standard Ledger.io page whenever an advisor is operating inside a client.
 *
 * Clicking the strip clears the active client and returns the advisor to the
 * bureau overview at /wl/app/dashboard.
 *
 * Spec (do not restyle):
 *   bg cyan-600 · text white · py-[6px] · px-[16px] · text-[12px]
 */
export const ActiveClientBanner = () => {
  const { activeClient, clearActiveClient } = useAdvisorActiveClient();
  const navigate = useNavigate();

  if (!activeClient) return null;

  const handleBack = () => {
    clearActiveClient();
    navigate("/wl/app/dashboard");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="w-full flex items-center gap-2 bg-[#3b82f6] hover:bg-[#3b82f6] text-white font-medium transition-colors"
      style={{ padding: "6px 16px", fontSize: "12px" }}
      aria-label="Återgå till byråöversikt"
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        Byråöversikt · <span className="font-semibold">{activeClient.name}</span>
        {activeClient.orgNumber && (
          <span className="text-white/75 tabular-nums"> · {activeClient.orgNumber}</span>
        )}
      </span>
    </button>
  );
};
