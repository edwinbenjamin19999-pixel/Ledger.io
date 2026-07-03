export type DashboardSettings = {
  defaultPeriod: "month" | "q1" | "q2" | "q3" | "q4" | "year";
  currency: "SEK" | "EUR" | "USD";
  showOnboarding: boolean;
  autoRefresh: boolean;
  showSparklines: boolean;
  animations: boolean;
  compactMode: boolean;
  showHeaders: boolean;
};

export const DASHBOARD_SETTINGS_KEY = "dashboard_settings";
export const DASHBOARD_SETTINGS_EVENT = "dashboard-settings-changed";

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  defaultPeriod: "month",
  currency: "SEK",
  showOnboarding: false,
  autoRefresh: true,
  showSparklines: true,
  animations: true,
  compactMode: false,
  showHeaders: true,
};

const normalizePeriod = (value: unknown): DashboardSettings["defaultPeriod"] => {
  if (value === "denna-manad" || value === "senaste-30") return "month";
  if (value === "detta-kvartal" || value === "quarter") return "q1";
  if (value === "detta-ar") return "year";
  if (value === "month" || value === "q1" || value === "q2" || value === "q3" || value === "q4" || value === "year") return value;
  return DEFAULT_DASHBOARD_SETTINGS.defaultPeriod;
};

export function loadDashboardSettings(): DashboardSettings {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_SETTINGS;
  try {
    const saved = window.localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (!saved) return DEFAULT_DASHBOARD_SETTINGS;
    const parsed = JSON.parse(saved) as Partial<DashboardSettings>;
    return { ...DEFAULT_DASHBOARD_SETTINGS, ...parsed, defaultPeriod: normalizePeriod(parsed.defaultPeriod) };
  } catch {
    return DEFAULT_DASHBOARD_SETTINGS;
  }
}

export function saveDashboardSettings(settings: DashboardSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT, { detail: settings }));
}