import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";

/**
 * Stops WL → standard-shell leakage.
 *
 * When an advisor with an active tenant + active client lands on a standard
 * product route (/dashboard, /reports, /cfo, /invoices, etc.), redirect them
 * to the matching tab inside their WL client workspace so they never leave
 * the branded shell.
 */
const STANDARD_TO_WL_TAB: Record<string, string> = {
  "/dashboard": "overview",
  "/accounting": "accounting",
  "/verifikationer": "verifications",
  "/reports": "income",
  "/cash-flow-report": "cashflow",
  "/cashflow": "cashflow",
  "/cashflow-forecast": "forecast",
  "/periodisering": "periodisering",
  "/closing": "closing",
  "/vat-reports": "vat",
  "/moms": "vat",
  "/tax-calculation": "tax",
  "/hr": "payroll",
  "/agi": "agi",
  "/agi-submission": "agi",
  "/invoices": "invoices",
  "/supplier-invoices": "supplier-invoices",
  "/supplier-ledger": "supplier-ledger",
  "/bank": "bank",
  "/bank-integration": "bank",
  "/bankintegration": "bank",
  "/dokument": "documents",
  "/direct-payment": "payments",
  "/receipt-agent": "receipt-agent",
  "/ar-agent": "ar-agent",
  "/anomalies": "anomalies",
  "/ai-ekonom": "ai-ekonom",
  "/approvals": "approvals",
  "/cfo": "overview",
};

export const WLRouteGuard = () => {
  const { tenant } = useTenant();
  const { activeClient } = useAdvisorActiveClient();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tenant?.id || !activeClient?.id) return;
    if (location.pathname.startsWith("/wl")) return;

    const tab = STANDARD_TO_WL_TAB[location.pathname];
    if (tab !== undefined) {
      navigate(`/wl/app/clients/${activeClient.id}/${tab}`, { replace: true });
    }
  }, [tenant?.id, activeClient?.id, location.pathname, navigate]);

  return null;
};
