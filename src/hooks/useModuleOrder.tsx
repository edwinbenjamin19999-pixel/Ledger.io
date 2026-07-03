import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildNavGroups } from "@/lib/sidebar-nav-config";

const LOCAL_KEY = "northledger_module_order";
const LOCAL_HIDDEN_KEY = "northledger_hidden_modules";
const LOCAL_HIDDEN_ITEMS_KEY = "northledger_hidden_items";

export interface ModuleGroup {
  label: string;
  id: string;
}

// Derive the canonical module order directly from the sidebar nav config —
// the sidebar is the single source of truth. Group labels do not depend on aiName.
const DEFAULT_ORDER: string[] = buildNavGroups("AI Ekonom").map((g) => g.label);

const EXTRA_MODULES: { id: string; label: string; description: string }[] = [];

// Map legacy/renamed module labels to the current sidebar group labels so users
// who previously saved a customized order keep their preferences.
const MIGRATION_MAP: Record<string, string> = {
  "AI & Automatisering": "Granska",
  "AI & Automation": "Granska",
  "Översikt": "Granska",
  "Kundreskontra": "Gör",
  "Försäljning": "Gör",
  "Försäljning & Kunder": "Gör",
  "Försäljning & kunder": "Gör",
  "Försäljning & Betalning": "Gör",
  "Kassaregister": "Gör",
  "Leverantörsreskontra": "Granska",
  "Inköp & Betalning": "Granska",
  "Inköp & Leverantörer": "Granska",
  "Inköp & leverantörer": "Granska",
  "Swish Business": "Granska",
  "Utlägg": "Gör",
  "Tidrapportering": "Gör",
  "Analys & Rapportering": "Förstå",
  "Rapporter & Analys": "Förstå",
  "Koncernkonsolidering": "Verksamhet",
  "Bank & Integrationer": "Bokföring",
  "Administration": "Bokföring",
  "Organisation": "Verksamhet",
  "Skatt & Bolagsform": "Skatt & deklaration",
  "Skatt & Deklaration": "Skatt & deklaration",
  "Skatt & Bokslut": "Skatt & deklaration",
  "RUT/ROT": "Skatt & deklaration",
  "Projektredovisning": "Verksamhet",
  "Lagerredovisning": "Verksamhet",
  "Lagerhantering": "Verksamhet",
  "Delägare & Utdelning": "Verksamhet",
  "Enskild firma": "Verksamhet",
  "Fåmansbolag (AB)": "Verksamhet",
  "Lön & Personal": "Lön & personal",
};

function migrateOrder(order: string[]): string[] {
  const migrated: string[] = [];
  for (const item of order) {
    const mapped = MIGRATION_MAP[item] || item;
    if (!migrated.includes(mapped)) migrated.push(mapped);
  }
  for (const def of DEFAULT_ORDER) {
    if (!migrated.includes(def)) migrated.push(def);
  }
  return migrated;
}

function migrateHidden(hidden: string[]): string[] {
  const migrated: string[] = [];
  for (const item of hidden) {
    const mapped = MIGRATION_MAP[item] || item;
    if (!migrated.includes(mapped) && DEFAULT_ORDER.includes(mapped)) migrated.push(mapped);
  }
  return migrated;
}

interface ModuleOrderContextValue {
  order: string[];
  hiddenModules: string[];
  hiddenItems: string[];
  loaded: boolean;
  updateOrder: (newOrder: string[]) => void;
  toggleModule: (moduleId: string) => void;
  addModule: (moduleId: string) => void;
  removeModule: (moduleId: string) => void;
  toggleItem: (itemPath: string) => void;
  resetAll: () => void;
  DEFAULT_ORDER: string[];
  EXTRA_MODULES: typeof EXTRA_MODULES;
}

const ModuleOrderContext = createContext<ModuleOrderContextValue | undefined>(undefined);

export function ModuleOrderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hiddenModules, setHiddenModules] = useState<string[]>([]);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const localOrder = localStorage.getItem(LOCAL_KEY);
    const localHidden = localStorage.getItem(LOCAL_HIDDEN_KEY);
    const localHiddenItems = localStorage.getItem(LOCAL_HIDDEN_ITEMS_KEY);
    if (localOrder) {
      try { setOrder(migrateOrder(JSON.parse(localOrder))); } catch {}
    }
    if (localHidden) {
      try { setHiddenModules(migrateHidden(JSON.parse(localHidden))); } catch {}
    }
    if (localHiddenItems) {
      try { setHiddenItems(JSON.parse(localHiddenItems)); } catch {}
    }

    if (user) {
      supabase
        .from("user_preferences")
        .select("module_order")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.module_order) {
            const mo = data.module_order as unknown as { order?: string[]; hidden?: string[]; hiddenItems?: string[] };
            const { order: o, hidden: h, hiddenItems: hi } = mo;
            if (Array.isArray(o)) {
              const migrated = migrateOrder(o);
              setOrder(migrated);
              localStorage.setItem(LOCAL_KEY, JSON.stringify(migrated));
            }
            if (Array.isArray(h)) {
              const migrated = migrateHidden(h);
              setHiddenModules(migrated);
              localStorage.setItem(LOCAL_HIDDEN_KEY, JSON.stringify(migrated));
            }
            if (Array.isArray(hi)) {
              setHiddenItems(hi);
              localStorage.setItem(LOCAL_HIDDEN_ITEMS_KEY, JSON.stringify(hi));
            }
          }
        });
    }
    setLoaded(true);
  }, [user]);

  const persist = useCallback(
    (newOrder: string[], newHidden: string[], newHiddenItems: string[]) => {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(newOrder));
      localStorage.setItem(LOCAL_HIDDEN_KEY, JSON.stringify(newHidden));
      localStorage.setItem(LOCAL_HIDDEN_ITEMS_KEY, JSON.stringify(newHiddenItems));

      if (user) {
        supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: user.id,
              module_order: { order: newOrder, hidden: newHidden, hiddenItems: newHiddenItems } as unknown as import('@/integrations/supabase/types').Json,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )
          .then(({ error }) => {
            if (error) {
              console.error("[useModuleOrder] Failed to persist module_order to Supabase:", error);
            }
          });
      }
    },
    [user]
  );

  const updateOrder = useCallback(
    (newOrder: string[]) => {
      setOrder(newOrder);
      persist(newOrder, hiddenModules, hiddenItems);
    },
    [hiddenModules, hiddenItems, persist]
  );

  const toggleModule = useCallback(
    (moduleId: string) => {
      let newHidden: string[];
      let newOrder: string[];
      if (hiddenModules.includes(moduleId)) {
        newHidden = hiddenModules.filter((m) => m !== moduleId);
        newOrder = order.includes(moduleId) ? order : [...order, moduleId];
      } else {
        newHidden = [...hiddenModules, moduleId];
        newOrder = order;
      }
      setHiddenModules(newHidden);
      setOrder(newOrder);
      persist(newOrder, newHidden, hiddenItems);
    },
    [order, hiddenModules, hiddenItems, persist]
  );

  const addModule = useCallback(
    (moduleId: string) => {
      const newOrder = order.includes(moduleId) ? order : [...order, moduleId];
      const newHidden = hiddenModules.filter((m) => m !== moduleId);
      setOrder(newOrder);
      setHiddenModules(newHidden);
      persist(newOrder, newHidden, hiddenItems);
    },
    [order, hiddenModules, hiddenItems, persist]
  );

  const removeModule = useCallback(
    (moduleId: string) => {
      const newHidden = [...hiddenModules, moduleId];
      setHiddenModules(newHidden);
      persist(order, newHidden, hiddenItems);
    },
    [order, hiddenModules, hiddenItems, persist]
  );

  const toggleItem = useCallback(
    (itemPath: string) => {
      const newHiddenItems = hiddenItems.includes(itemPath)
        ? hiddenItems.filter((p) => p !== itemPath)
        : [...hiddenItems, itemPath];
      setHiddenItems(newHiddenItems);
      persist(order, hiddenModules, newHiddenItems);
    },
    [order, hiddenModules, hiddenItems, persist]
  );

  const resetAll = useCallback(() => {
    setOrder(DEFAULT_ORDER);
    setHiddenModules([]);
    setHiddenItems([]);
    persist(DEFAULT_ORDER, [], []);
  }, [persist]);

  const value: ModuleOrderContextValue = {
    order,
    hiddenModules,
    hiddenItems,
    loaded,
    updateOrder,
    toggleModule,
    addModule,
    removeModule,
    toggleItem,
    resetAll,
    DEFAULT_ORDER,
    EXTRA_MODULES,
  };

  return <ModuleOrderContext.Provider value={value}>{children}</ModuleOrderContext.Provider>;
}

export function useModuleOrder(): ModuleOrderContextValue {
  const ctx = useContext(ModuleOrderContext);
  if (!ctx) {
    throw new Error("useModuleOrder must be used within a ModuleOrderProvider");
  }
  return ctx;
}
