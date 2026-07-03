/**
 * Financial OS — pure view suggester.
 * Aggregates view_usage_log entries and proposes saved views the user likely wants.
 */

export interface UsageLogEntry {
  route: string;
  payload: Record<string, unknown>;
  opened_at: string;
}

export interface ViewSuggestion {
  key: string;
  name: string;
  icon: string;
  route: string;
  payload: Record<string, unknown>;
  reason: string;
  weight: number;
}

const ROLE_PRESETS: ViewSuggestion[] = [
  {
    key: "preset:cfo-overview",
    name: "CFO översikt",
    icon: "Briefcase",
    route: "/financial-analysis",
    payload: { mode: "actual_vs_budget", period: "ytd" },
    reason: "Roll-preset för CFO",
    weight: 0.5,
  },
  {
    key: "preset:ceo-board",
    name: "CEO board pack",
    icon: "Trophy",
    route: "/follow-up",
    payload: { focus: "kpi", period: "month" },
    reason: "Roll-preset för CEO",
    weight: 0.5,
  },
  {
    key: "preset:controller-deep",
    name: "Controller deep-dive",
    icon: "SearchCode",
    route: "/financial-analysis",
    payload: { mode: "actual_vs_forecast", period: "month", dimension: "account" },
    reason: "Roll-preset för Controller",
    weight: 0.5,
  },
];

export function suggestViews(
  log: UsageLogEntry[],
  existingPayloadKeys: Set<string>,
): ViewSuggestion[] {
  if (!log?.length) return ROLE_PRESETS.filter((p) => !existingPayloadKeys.has(p.key));

  // Group by route + payload signature
  const buckets = new Map<string, { route: string; payload: Record<string, unknown>; count: number }>();
  for (const e of log) {
    const sig = `${e.route}::${JSON.stringify(e.payload || {})}`;
    const b = buckets.get(sig);
    if (b) b.count++;
    else buckets.set(sig, { route: e.route, payload: e.payload || {}, count: 1 });
  }

  const sorted = Array.from(buckets.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  const learned: ViewSuggestion[] = sorted
    .filter(([, b]) => b.count >= 3)
    .map(([sig, b]) => ({
      key: `learned:${hash(sig)}`,
      name: humanize(b.route, b.payload),
      icon: "Sparkles",
      route: b.route,
      payload: b.payload,
      reason: `Du öppnar denna vy ${b.count}× — spara som standard?`,
      weight: 0.5 + Math.min(0.5, b.count / 20),
    }))
    .filter((s) => !existingPayloadKeys.has(s.key));

  const presets = ROLE_PRESETS.filter((p) => !existingPayloadKeys.has(p.key));

  return [...learned, ...presets].slice(0, 4);
}

function humanize(route: string, payload: Record<string, unknown>): string {
  const r = route.replace(/^\//, "");
  const parts = [r];
  if (payload.mode) parts.push(String(payload.mode));
  if (payload.period) parts.push(String(payload.period).toUpperCase());
  return parts.join(" · ");
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
