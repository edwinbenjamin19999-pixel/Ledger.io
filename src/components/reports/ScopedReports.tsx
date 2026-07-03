import { useEffect } from "react";
import Reports from "@/pages/Reports";

type Lens = "RR" | "BR";

/**
 * Lightweight wrapper around the standard Reports page used by the WL advisor
 * workspace to render a specific lens (Resultaträkning / Balansräkning) as
 * its own tab. We piggyback on `Reports`' existing `?lens=` query param
 * support so we don't have to fork the report engine.
 */
export const ScopedReports = ({ lens }: { lens: Lens }) => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("lens") !== lens) {
      url.searchParams.set("lens", lens);
      window.history.replaceState({}, "", url.toString());
    }
  }, [lens]);

  return <Reports key={`reports-${lens}`} initialLens={lens} />;
};

export default ScopedReports;
