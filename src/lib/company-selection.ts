export const ACTIVE_COMPANY_STORAGE_KEY = "dashboard:selectedCompanyId";

const LEGACY_COMPANY_KEYS = ["selectedCompanyId", "selected_company", "selected_company_id"];

const normalizeStoredCompanyId = (value: string | null) => value?.replace(/"/g, "") ?? null;

type CompanyLike = {
  id: string;
};

export const getStoredActiveCompanyId = () => {
  if (typeof window === "undefined") return null;
  const canonical = normalizeStoredCompanyId(window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY));
  if (canonical) return canonical;
  return LEGACY_COMPANY_KEYS
    .map((key) => normalizeStoredCompanyId(window.localStorage.getItem(key)))
    .find(Boolean) ?? null;
};

export const setStoredActiveCompanyId = (companyId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyId);
  LEGACY_COMPANY_KEYS.forEach((key) => window.localStorage.setItem(key, companyId));
};

export const broadcastActiveCompanyChange = (companyId: string | null) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("company-changed", { detail: { companyId } }));
  window.dispatchEvent(new CustomEvent("active-company-changed", { detail: { companyId } }));

  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: ACTIVE_COMPANY_STORAGE_KEY,
        newValue: companyId,
        storageArea: window.localStorage,
        url: window.location.href,
      }),
    );
  } catch {
    window.dispatchEvent(new Event("storage"));
  }
};

export const resolvePreferredCompanyId = <T extends CompanyLike>(
  companies: T[],
  ...preferredIds: Array<string | null | undefined>
) => {
  const companyIds = new Set(companies.map((company) => company.id));
  const preferredId = preferredIds.find((companyId) => companyId && companyIds.has(companyId));

  return preferredId ?? companies[0]?.id ?? "";
};

/**
 * Default selector for page-local company filters.
 *
 * Resolution order:
 *   1. Explicit caller-supplied id (e.g. URL param `?company=…`)
 *   2. Globally active company id from localStorage (set by header picker)
 *   3. Legacy keys (selectedCompanyId etc.)
 *   4. First company in the supplied list (alphabetical fallback)
 *
 * Use everywhere a page initializes its `selectedCompany` state from a fresh
 * `companies` fetch, so the per-page filter mirrors the header context instead
 * of always defaulting to the alphabetically first company.
 */
export const pickDefaultCompanyId = <T extends CompanyLike>(
  companies: T[],
  explicit?: string | null,
): string => {
  if (typeof window === "undefined") {
    return resolvePreferredCompanyId(companies, explicit);
  }
  const fromCanonical = window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY)?.replace(/"/g, "") ?? null;
  const fromLegacy = LEGACY_COMPANY_KEYS
    .map((k) => window.localStorage.getItem(k)?.replace(/"/g, "") ?? null)
    .find(Boolean) ?? null;
  return resolvePreferredCompanyId(companies, explicit, fromCanonical, fromLegacy);
};
