import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 25 * 60 * 1000; // Warn at 25 minutes

export const useSessionTimeout = () => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      toast.warning("Du loggas snart ut", {
        description: "Din session löper ut om 5 minuter på grund av inaktivitet. Klicka var som helst för att stanna inloggad.",
        duration: 10000,
      });
    }, WARNING_MS);

    timeoutRef.current = setTimeout(async () => {
      toast.info("Sessionen har gått ut — logga in igen", { duration: 6000 });
      const { clearTenantState } = await import("@/lib/auth-cleanup");
      clearTenantState();
      await supabase.auth.signOut();
      window.location.href = "/auth";
    }, TIMEOUT_MS);
  }, []);

  useEffect(() => {
    // Listen on capture phase so modals/dialogs that stopPropagation still reset the timer.
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click", "pointerdown"];
    events.forEach((e) =>
      document.addEventListener(e, resetTimer, { passive: true, capture: true })
    );

    // Auth events also reset the idle timer (token refresh = activity proof).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        resetTimer();
      }
    });

    resetTimer();

    return () => {
      events.forEach((e) =>
        document.removeEventListener(e, resetTimer, { capture: true } as any)
      );
      sub.subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer]);
};
