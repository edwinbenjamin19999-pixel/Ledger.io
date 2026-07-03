import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ThemeOption = "blue" | "light" | "dark" | "system";

function resolveTheme(theme: ThemeOption): "blue" | "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "blue";
  }
  return theme;
}

function applyTheme(resolved: "blue" | "light" | "dark") { document.documentElement.setAttribute("data-theme", resolved);
}

interface ThemeContextValue { theme: ThemeOption;
  resolvedTheme: "blue" | "light" | "dark";
  setTheme: (t: ThemeOption) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "blue",
  resolvedTheme: "blue",
  setTheme: () => {},
  cycleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) { const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeOption>(() => { // Try localStorage för instant load (avoid flash)
    const stored = localStorage.getItem("northledger-theme") as ThemeOption | null;
    return stored || "blue";
  });

  const resolved = resolveTheme(theme);

  // Apply on mount and change
  useEffect(() => { applyTheme(resolved);
  }, [resolved]);

  // Listen för system theme changes
  useEffect(() => { if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(resolveTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Load from DB on login
  useEffect(() => { if (!user?.id) return;
    (async () => { try { const { data } = await supabase
          .from("user_preferences")
          .select("theme")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.theme) { const dbTheme = data.theme as ThemeOption;
          setThemeState(dbTheme);
          localStorage.setItem("northledger-theme", dbTheme);
        }
      } catch (e) { console.error("Error loading theme preference:", e);
      }
    })();
  }, [user?.id]);

  const setTheme = useCallback(async (t: ThemeOption) => { setThemeState(t);
    localStorage.setItem("northledger-theme", t);
    if (!user?.id) return;
    try { await supabase
        .from("user_preferences")
        .upsert(
          { user_id: user.id, theme: t, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    } catch (e) { console.error("Error saving theme preference:", e);
    }
  }, [user?.id]);

  const cycleTheme = useCallback(() => { const order: ThemeOption[] = ["blue", "light", "dark"];
    const idx = order.indexOf(theme === "system" ? resolved : theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  }, [theme, resolved, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext);
}
