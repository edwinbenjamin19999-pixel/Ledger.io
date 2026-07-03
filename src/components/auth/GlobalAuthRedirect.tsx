import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isIframeEnvironment } from "@/lib/safe-browser";

/**
 * Lightweight session listener for PUBLIC routes (/, /auth).
 *
 * After a Google OAuth callback the browser lands on `window.location.origin`
 * (typically `/`) — not on `/auth`. Without this listener the user sees the
 * landing page even though Supabase has set their session, and has to click
 * "Logga in" to be routed to the dashboard.
 *
 * This component subscribes to onAuthStateChange and, when a SIGNED_IN event
 * fires (or a session is already present at mount), it redirects to either
 * /quick-onboarding (new users < 60s old) or /ai-ekonom (returning users).
 *
 * Renders nothing.
 */
export const GlobalAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip entirely inside the Lovable preview iframe — auth is intentionally
    // disabled there to avoid Safari cross-site tracking issues.
    if (isIframeEnvironment()) return;

    let active = true;
    let unsub: (() => void) | undefined;

    const routeUser = async (createdAt?: string, userMetadata?: Record<string, unknown>) => {
      // Don't bounce users already deep inside the app.
      const path = window.location.pathname;
      if (path !== "/" && path !== "/auth") return;
      const createdMs = createdAt ? new Date(createdAt).getTime() : 0;
      const isNew = createdMs > 0 && Date.now() - createdMs < 60_000;
      const isTestAccount = userMetadata?.test_account === true || userMetadata?.is_test_account === true;
      if (isTestAccount) {
        const { resolveDefaultLanding } = await import("@/lib/auth/resolveDefaultLanding");
        const dest = await resolveDefaultLanding();
        navigate(dest, { replace: true });
        return;
      }
      if (isNew) { navigate("/quick-onboarding", { replace: true }); return; }
      const { resolveDefaultLanding } = await import("@/lib/auth/resolveDefaultLanding");
      const dest = await resolveDefaultLanding();
      navigate(dest, { replace: true });
    };

    const init = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          if (event === "SIGNED_IN" && session?.user) {
            routeUser(session.user.created_at, session.user.user_metadata as Record<string, unknown>);
          }
        });
        unsub = () => sub.subscription.unsubscribe();

        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session?.user) routeUser(session.user.created_at, session.user.user_metadata as Record<string, unknown>);
      } catch {
        // Non-blocking — landing page still works without auth.
      }
    };

    init();
    return () => { active = false; unsub?.(); };
  }, [navigate, location.pathname]);

  return null;
};

export default GlobalAuthRedirect;
