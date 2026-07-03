/**
 * Tenant-scoped localStorage cleanup.
 *
 * Run at signOut and when the active company is no longer in user_companies,
 * so the next session never inherits a stale companyId / dashboard layout / AI cache.
 */

const STATIC_KEYS = [
  "dashboard:selectedCompanyId",
  "selectedCompanyId",
  "selected_company",
  "selected_company_id",
  "system.context.v1",
];

const PREFIXES = ["dashboard:", "ai-ekonom:", "ai-cfo:", "cfo:", "finos:"];

export function clearTenantState() {
  if (typeof window === "undefined") return;
  try {
    STATIC_KEYS.forEach((k) => window.localStorage.removeItem(k));
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (PREFIXES.some((p) => key.startsWith(p))) toRemove.push(key);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
    window.dispatchEvent(new Event("company-changed"));
  } catch {
    /* no-op */
  }
}
