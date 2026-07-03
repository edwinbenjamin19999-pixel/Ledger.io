import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { toast } from "sonner";

/**
 * Live count of journal entries that need user approval (status: draft or pending_approval)
 * for the currently active company. Subscribes to:
 *  - Postgres realtime INSERT events on journal_entries → fires a toast
 *  - Postgres realtime UPDATE/DELETE → silently refreshes the count
 *  - "company-changed" CustomEvent so the badge updates when the user switches company
 */
export function usePendingApprovalCount(explicitCompanyId?: string | null) {
  const [companyId, setCompanyId] = useState<string | null>(
    () => explicitCompanyId ?? getStoredActiveCompanyId(),
  );
  const [count, setCount] = useState(0);
  const initialLoadDoneRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Track active company switches via global event
  useEffect(() => {
    if (explicitCompanyId !== undefined) {
      setCompanyId(explicitCompanyId);
      return;
    }
    const handler = () => setCompanyId(getStoredActiveCompanyId());
    window.addEventListener("company-changed", handler as EventListener);
    window.addEventListener("active-company-changed", handler as EventListener);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("company-changed", handler as EventListener);
      window.removeEventListener("active-company-changed", handler as EventListener);
      window.removeEventListener("storage", handler);
    };
  }, [explicitCompanyId]);

  useEffect(() => {
    if (!companyId) {
      setCount(0);
      return;
    }

    let cancelled = false;
    initialLoadDoneRef.current = false;

    const load = async () => {
      const { count: c } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("status", ["draft", "pending_approval"]);
      if (!cancelled) {
        setCount(c || 0);
        initialLoadDoneRef.current = true;
      }
    };

    load();

    const channel = supabase
      .channel(`pending-approval-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "journal_entries",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          load();

          // Toast on new draft / pending_approval — only after initial load,
          // and only when user is NOT already on the verifications page.
          if (
            initialLoadDoneRef.current &&
            payload.eventType === "INSERT" &&
            payload.new &&
            ["draft", "pending_approval"].includes(
              (payload.new as { status?: string }).status ?? "",
            ) &&
            !locationRef.current.startsWith("/verifikationer")
          ) {
            const desc =
              (payload.new as { description?: string }).description ??
              "Nytt utkast skapat av AI";
            toast.info("Nytt verifikat väntar på godkännande", {
              description: desc,
              action: {
                label: "Granska",
                onClick: () => navigate("/verifikationer?filter=pending"),
              },
              duration: 8000,
            });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [companyId, navigate]);

  return count;
}
