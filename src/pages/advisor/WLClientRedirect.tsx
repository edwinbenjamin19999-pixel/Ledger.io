import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";

/**
 * Legacy /wl/app/clients/:clientId(/*) deep links — switch the advisor's
 * active client context to that company and redirect into the standard
 * Cogniq surface. The optional :tab segment maps 1:1 to a top-level
 * Cogniq route (e.g. "vat", "tax", "invoices", "dashboard").
 */
const TAB_TO_PATH: Record<string, string> = {
  overview: "/dashboard",
  dashboard: "/dashboard",
  vat: "/vat",
  moms: "/vat",
  tax: "/tax",
  agi: "/agi",
  invoices: "/invoices",
  "supplier-invoices": "/supplier-invoices",
  documents: "/documents",
  reports: "/reports",
  workspace: "/dashboard",
  closing: "/closing",
};

export default function WLClientRedirect() {
  const { clientId, tab } = useParams<{ clientId: string; tab?: string }>();
  const { setActiveClient, activeClient } = useAdvisorActiveClient();

  useEffect(() => {
    if (!clientId) return;
    if (activeClient?.id === clientId) return;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, org_number")
        .eq("id", clientId)
        .maybeSingle();
      setActiveClient({
        id: clientId,
        name: (data as { name?: string } | null)?.name ?? "Klient",
        orgNumber: (data as { org_number?: string } | null)?.org_number ?? undefined,
      });
    })();
  }, [clientId, activeClient?.id, setActiveClient]);

  if (!clientId) return <Navigate to="/wl/app/dashboard" replace />;
  const target = (tab && TAB_TO_PATH[tab]) || "/dashboard";
  return <Navigate to={target} replace />;
}
