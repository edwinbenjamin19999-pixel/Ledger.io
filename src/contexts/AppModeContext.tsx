import { createContext, useContext, useMemo, ReactNode } from "react";
import { useLocation } from "react-router-dom";

export type AppMode = "standard" | "advisor";

interface AppModeContextValue {
  mode: AppMode;
  isAdvisorRoute: boolean;
}

const AppModeContext = createContext<AppModeContextValue>({
  mode: "standard",
  isAdvisorRoute: false,
});

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const value = useMemo<AppModeContextValue>(() => {
    const isAdvisorRoute = location.pathname.startsWith("/wl");
    return {
      mode: isAdvisorRoute ? "advisor" : "standard",
      isAdvisorRoute,
    };
  }, [location.pathname]);

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
};

export const useAppMode = () => useContext(AppModeContext);
