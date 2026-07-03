import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isIframeEnvironment, safariDebugError, safariDebugLog } from "@/lib/safe-browser";
import { setPreviewAuthSkipped, setPreviewRenderStep } from "@/lib/preview-debug";

async function getSupabaseClient() { const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

interface AuthContextType { user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => { const context = useContext(AuthContext);
  if (!context) { throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => { const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const applySession = (nextSession: Session | null, source: string) => { if (!isMounted) return;

      // If a *different* user is now authenticated, purge tenant-scoped local
      // state so we don't carry the previous user's selectedCompanyId etc.
      const nextUserId = nextSession?.user?.id;
      if (nextUserId) {
        import("@/lib/auth-user-tracking").then(({ syncLastAuthenticatedUser }) => {
          if (syncLastAuthenticatedUser(nextUserId)) {
            import("@/lib/auth-cleanup").then(({ clearTenantState }) => clearTenantState());
          }
        }).catch(() => {});
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      setPreviewRenderStep(nextSession?.user ? "Auth session ready" : `Auth session ready (${source})`);
      safariDebugLog("3. auth/session init", { hasUser: Boolean(nextSession?.user),
        source,
      });
    };

    const initializeAuth = async () => { setPreviewRenderStep("Auth provider starting");

      // White-label routes (/wl/...) must run real auth even inside the preview iframe,
      // otherwise login succeeds at Supabase but the AuthProvider never receives the session
      // and users get stuck on the login screen.
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isWhiteLabelRoute = path.startsWith("/wl/") || path === "/wl";

      if (isIframeEnvironment() && !isWhiteLabelRoute) { setPreviewAuthSkipped(true);
        setPreviewRenderStep("Auth skipped in preview iframe");
        applySession(null, "skipped-iframe-preview");
        return;
      }

      setPreviewAuthSkipped(false);
      safariDebugLog("3. auth/session init", { source: "start" });

      try { const supabase = await getSupabaseClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, nextSession) => { safariDebugLog("auth state change", { event, hasUser: Boolean(nextSession?.user) });
            applySession(nextSession, `event:${event}`);
          }
        );

        unsubscribe = () => subscription.unsubscribe();

        const { data: { session: nextSession }, error } = await supabase.auth.getSession();
        if (error) { throw error;
        }

        applySession(nextSession, "getSession");
      } catch (error) { safariDebugError("auth getSession failed", error);
        setPreviewRenderStep("Auth initialization failed");
        if (isMounted) { setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => { isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const signOut = async () => { try {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isWhiteLabel = path.startsWith("/wl/") || path === "/wl";
      let wlSlug: string | null = null;
      if (isWhiteLabel) {
        try {
          const { getActiveTenantSlug } = await import("@/hooks/useUserTenants");
          wlSlug = getActiveTenantSlug();
        } catch {}
      }
      const wlLoginPath = wlSlug ? `/wl/${wlSlug}/login` : "/wl/beta/login";

      // Always purge tenant-scoped local state so the next session starts clean.
      const { clearTenantState } = await import("@/lib/auth-cleanup");
      clearTenantState();

      if (isIframeEnvironment()) { setPreviewAuthSkipped(true);
        setUser(null);
        setSession(null);
        navigate(isWhiteLabel ? wlLoginPath : "/auth");
        return;
      }

      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      // "Auth session missing" betyder att sessionen redan är borta server-side – det är OK, fortsätt logga ut lokalt.
      if (error && !/session/i.test(error.message)) throw error;
      setUser(null);
      setSession(null);
      try { localStorage.removeItem("sb-gvlzltcwdsglmkiijlie-auth-token"); } catch {}
      toast.success("Du har loggats ut");
      navigate(isWhiteLabel ? wlLoginPath : "/auth");
    } catch (error: any) {
      // Fallback: rensa lokalt och navigera även om något oväntat händer
      setUser(null);
      setSession(null);
      try { localStorage.removeItem("sb-gvlzltcwdsglmkiijlie-auth-token"); } catch {}
      try {
        const { clearTenantState } = await import("@/lib/auth-cleanup");
        clearTenantState();
      } catch {}
      navigate("/auth");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
