import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";

/**
 * Tracks which client company an advisor is currently working in.
 *
 * When a client is activated we mirror the id into the canonical
 * `dashboard:selectedCompanyId` localStorage key (and legacy keys) and dispatch
 * the `company-changed` custom event so every existing `useCompanyId()` hook
 * across the platform automatically scopes its queries to that client.
 *
 * This is what lets the WL portal reuse the entire Ledger.io feature set
 * without duplicating any routes or queries.
 */

const ADVISOR_ACTIVE_CLIENT_KEY = "advisor:activeClientId";
const ADVISOR_ACTIVE_CLIENT_NAME_KEY = "advisor:activeClientName";
const ADVISOR_ACTIVE_CLIENT_ORG_KEY = "advisor:activeClientOrg";
const LEGACY_KEYS = ["selectedCompanyId", "selected_company", "selected_company_id"];

export interface AdvisorActiveClient {
  id: string;
  name: string;
  orgNumber?: string;
}

interface Ctx {
  activeClient: AdvisorActiveClient | null;
  setActiveClient: (client: AdvisorActiveClient | null) => void;
  clearActiveClient: () => void;
}

const AdvisorActiveClientContext = createContext<Ctx | null>(null);

function readPersisted(): AdvisorActiveClient | null {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(ADVISOR_ACTIVE_CLIENT_KEY);
  if (!id) return null;
  return {
    id,
    name: window.localStorage.getItem(ADVISOR_ACTIVE_CLIENT_NAME_KEY) ?? "Klient",
    orgNumber: window.localStorage.getItem(ADVISOR_ACTIVE_CLIENT_ORG_KEY) ?? undefined,
  };
}

export const AdvisorActiveClientProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeClient, setActiveClientState] = useState<AdvisorActiveClient | null>(readPersisted);

  const applyToCompanyContext = useCallback((id: string | null) => {
    if (typeof window === "undefined") return;
    if (id) {
      window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, id);
      LEGACY_KEYS.forEach((k) => window.localStorage.setItem(k, id));
    } else {
      // Don't wipe the user's normal company on clear — only stop overriding it.
      // (We intentionally leave canonical key as-is so the user keeps whatever
      // company they had selected before entering advisor mode.)
    }
    window.dispatchEvent(new Event("company-changed"));
    window.dispatchEvent(new Event("storage"));
  }, []);

  const setActiveClient = useCallback(
    (client: AdvisorActiveClient | null) => {
      if (typeof window !== "undefined") {
        if (client) {
          window.localStorage.setItem(ADVISOR_ACTIVE_CLIENT_KEY, client.id);
          window.localStorage.setItem(ADVISOR_ACTIVE_CLIENT_NAME_KEY, client.name);
          if (client.orgNumber) {
            window.localStorage.setItem(ADVISOR_ACTIVE_CLIENT_ORG_KEY, client.orgNumber);
          } else {
            window.localStorage.removeItem(ADVISOR_ACTIVE_CLIENT_ORG_KEY);
          }
        } else {
          window.localStorage.removeItem(ADVISOR_ACTIVE_CLIENT_KEY);
          window.localStorage.removeItem(ADVISOR_ACTIVE_CLIENT_NAME_KEY);
          window.localStorage.removeItem(ADVISOR_ACTIVE_CLIENT_ORG_KEY);
        }
      }
      setActiveClientState(client);
      applyToCompanyContext(client?.id ?? null);
    },
    [applyToCompanyContext],
  );

  const clearActiveClient = useCallback(() => setActiveClient(null), [setActiveClient]);

  // On mount, ensure CompanyContext mirrors persisted client (in case a refresh
  // landed before the bridge ran).
  useEffect(() => {
    if (activeClient) applyToCompanyContext(activeClient.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the user changes company via the global picker (which clears the
  // advisor:activeClient* keys), drop our in-memory client too so the
  // ActiveClientBanner disappears and pages stop scoping to the old client.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onCompanyChanged = () => {
      const stillActive = window.localStorage.getItem(ADVISOR_ACTIVE_CLIENT_KEY);
      if (!stillActive) {
        setActiveClientState(null);
      } else if (activeClient && stillActive !== activeClient.id) {
        setActiveClientState(readPersisted());
      }
    };
    window.addEventListener("company-changed", onCompanyChanged);
    window.addEventListener("storage", onCompanyChanged);
    return () => {
      window.removeEventListener("company-changed", onCompanyChanged);
      window.removeEventListener("storage", onCompanyChanged);
    };
  }, [activeClient]);

  const value = useMemo(
    () => ({ activeClient, setActiveClient, clearActiveClient }),
    [activeClient, setActiveClient, clearActiveClient],
  );

  return (
    <AdvisorActiveClientContext.Provider value={value}>
      {children}
    </AdvisorActiveClientContext.Provider>
  );
};

export function useAdvisorActiveClient(): Ctx {
  const ctx = useContext(AdvisorActiveClientContext);
  if (!ctx) {
    // Outside the provider (e.g. standard Ledger.io pages) — read-only fallback so
    // the ActiveClientBanner can still show on /dashboard etc.
    const persisted = readPersisted();
    return {
      activeClient: persisted,
      setActiveClient: () => {},
      clearActiveClient: () => {
        if (typeof window === "undefined") return;
        window.localStorage.removeItem(ADVISOR_ACTIVE_CLIENT_KEY);
        window.localStorage.removeItem(ADVISOR_ACTIVE_CLIENT_NAME_KEY);
        window.localStorage.removeItem(ADVISOR_ACTIVE_CLIENT_ORG_KEY);
        window.dispatchEvent(new Event("company-changed"));
      },
    };
  }
  return ctx;
}
