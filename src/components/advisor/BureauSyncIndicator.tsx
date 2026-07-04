import { useBureauSync } from "@/hooks/useBureauSync";

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

/**
 * Compact sync indicator for the bureau topbar.
 *
 *  • Green pulsing dot + "Uppdaterad HH:mm" when realtime channel is live.
 *  • Amber dot + "Synkproblem — försöker igen" on connection trouble.
 *  • Neutral dot while bootstrapping.
 */
export const BureauSyncIndicator = () => {
  const { status, lastUpdated } = useBureauSync();

  const tone =
    status === "live"
      ? { dot: "bg-emerald-500", pulse: true, text: "text-[#0F172A]" }
      : status === "offline"
        ? { dot: "bg-amber-500", pulse: false, text: "text-[#7A5417]" }
        : { dot: "bg-slate-400", pulse: false, text: "text-[#64748B]" };

  const label =
    status === "live"
      ? lastUpdated
        ? `Uppdaterad ${fmtTime(lastUpdated)}`
        : "Live"
      : status === "offline"
        ? "Synkproblem — försöker igen"
        : "Synkar…";

  return (
    <div
      className="hidden md:flex items-center gap-2 rounded-full bg-white px-3 py-1.5"
      style={{ border: "1px solid #E2E8F0" }}
      title={label}
    >
      <span className="relative flex h-2 w-2">
        {tone.pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${tone.dot} opacity-60 animate-ping`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${tone.dot}`} />
      </span>
      <span className={`text-[11px] font-semibold ${tone.text}`}>{label}</span>
    </div>
  );
};
