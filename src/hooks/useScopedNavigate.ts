import { useCallback } from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";

/**
 * WL-aware navigate helper.
 *
 * When the user is inside the WL advisor shell (`/wl/app/clients/:clientId/...`),
 * deep-links to standard product routes (`/direct-payment`, `/supplier-ledger`,
 * `/receipt-agent`, …) would tear them out of the branded chrome and into the
 * default `AppLayout`.
 *
 * `useScopedNavigate()` rewrites those targets into the matching WL tab so the
 * advisor stays inside the white-label workspace. Outside of `/wl/...` it
 * behaves exactly like `useNavigate()`.
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
};

export function useScopedNavigate() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to: string, opts?: { replace?: boolean }) => {
      // Only rewrite when we're currently inside the WL shell.
      const wlMatch = matchPath(
        { path: "/wl/app/clients/:clientId/*", end: false },
        location.pathname,
      );

      if (!wlMatch?.params?.clientId) {
        navigate(to, opts);
        return;
      }

      const clientId = wlMatch.params.clientId as string;

      // Split path + query.
      const [pathname, search = ""] = to.split("?");
      const tab = STANDARD_TO_WL_TAB[pathname];

      if (tab !== undefined) {
        const target = `/wl/app/clients/${clientId}/${tab}${search ? `?${search}` : ""}`;
        navigate(target, opts);
        return;
      }

      navigate(to, opts);
    },
    [navigate, location.pathname],
  );
}
