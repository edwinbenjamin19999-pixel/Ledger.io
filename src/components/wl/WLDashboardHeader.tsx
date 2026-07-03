import { useTenant } from "@/contexts/TenantContext";

interface Props {
  /** Optional — shown small next to tenant name (e.g. selected company). */
  companyName?: string;
}

/**
 * Institutional white-label dashboard header.
 * Replaces the generic personal greeting with a calm, executive identity layer:
 *
 *   FOKUS NORDIC — FINANSIELL ÖVERSIKT
 *   Operativ översikt och prioriterade åtgärder
 *
 * No avatar, no greeting, no emojis. Brand color used only as a thin accent
 * label color and a single 1px bottom divider — the rest is pure typography.
 */
export function WLDashboardHeader({ companyName }: Props) {
  const { tenant } = useTenant();
  if (!tenant) return null;

  const today = new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900 leading-tight tracking-tight truncate">
          Finansiell översikt
        </h1>
        <p className="text-sm text-slate-400 tabular-nums first-letter:uppercase shrink-0">
          {today}
        </p>
      </div>
    </header>
  );
}
