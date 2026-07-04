import { useEffect } from "react";
import {
  ACTIVE_COMPANY_STORAGE_KEY,
  getStoredActiveCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";

const LEGACY_KEYS = ["selectedCompanyId", "selected_company", "selected_company_id"];

/**
 * Force the entire app's "active company" context to a specific id while a
 * scoped surface (e.g. the WL advisor client workspace) is mounted.
 *
 * - Mirrors the id into the canonical + legacy localStorage keys.
 * - Dispatches `company-changed`, `active-company-changed` and `storage`
 *   events so any standard Cogniq page (`Dashboard`, `Reports`, `Invoices`,
 *   `BankIntegration`, …) that reads `pickDefaultCompanyId()` immediately
 *   re-loads against the scoped client.
 * - Restores the previous active id on unmount.
 */
export function useScopedActiveCompany(scopedCompanyId: string | null | undefined) {
  useEffect(() => {
    if (!scopedCompanyId || typeof window === "undefined") return;

    const previous = getStoredActiveCompanyId();

    setStoredActiveCompanyId(scopedCompanyId);
    LEGACY_KEYS.forEach((k) => window.localStorage.setItem(k, scopedCompanyId));

    window.dispatchEvent(new Event("company-changed"));
    window.dispatchEvent(new Event("active-company-changed"));
    window.dispatchEvent(new Event("storage"));

    return () => {
      if (previous && previous !== scopedCompanyId) {
        window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, previous);
        LEGACY_KEYS.forEach((k) => window.localStorage.setItem(k, previous));
        window.dispatchEvent(new Event("company-changed"));
        window.dispatchEvent(new Event("active-company-changed"));
        window.dispatchEvent(new Event("storage"));
      }
    };
  }, [scopedCompanyId]);
}
