import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmVAT } from "@/hooks/useFirmVAT";
import { useFirmTax } from "@/hooks/useFirmTax";
import { useFirmAGI } from "@/hooks/useFirmAGI";
import { useFirmInvoices } from "@/hooks/useFirmInvoices";
import { useFirmSupplierInvoices } from "@/hooks/useFirmSupplierInvoices";

interface Props {
  /** Highlight which module's row is the current page. */
  module?: "vat" | "tax" | "agi" | "invoices" | "supplier-invoices";
}

/**
 * Temporary WL → real-data validation overlay (spec id="wl-real-data-bridge-v1" §10).
 *
 * Renders the SAME firm hooks the page lists below use, so that the counts here
 * always equal the rows on screen. If the count is 0 while Standard NorthLedger shows
 * data, the firm-scoped query is the bug — not the UI.
 *
 * Style intentionally subtle / monospace / dashed border = clearly temporary.
 */
/**
 * Developer-only flag. The debug bar is hidden in product UI by default.
 * Enable for a session via either:
 *   - URL query: `?debug=true`
 *   - localStorage: `localStorage.setItem('wl_debug', '1')`
 */
const isDebugEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "true") return true;
    return window.localStorage?.getItem("wl_debug") === "1";
  } catch {
    return false;
  }
};

export const WLDataDebugBar = ({ module }: Props) => {
  const { firmId, clients, isLoading: ctxLoading } = useAdvisorContext();
  const vat = useFirmVAT();
  const tax = useFirmTax();
  const agi = useFirmAGI();
  const ar = useFirmInvoices();
  const ap = useFirmSupplierInvoices();

  if (!isDebugEnabled()) return null;

  const rows: Array<{
    key: NonNullable<Props["module"]>;
    label: string;
    table: string;
    count: number;
    loading: boolean;
  }> = [
    { key: "vat", label: "Moms", table: "vat_periods", count: vat.data?.length ?? 0, loading: vat.isLoading },
    { key: "tax", label: "Skatt", table: "tax_declarations", count: tax.data?.length ?? 0, loading: tax.isLoading },
    { key: "agi", label: "AGI", table: "agi_periods", count: agi.data?.length ?? 0, loading: agi.isLoading },
    { key: "invoices", label: "Kundfakturor", table: "invoices (outgoing)", count: ar.data?.length ?? 0, loading: ar.isLoading },
    { key: "supplier-invoices", label: "Lev.fakturor", table: "invoices (incoming)", count: ap.data?.length ?? 0, loading: ap.isLoading },
  ];

  return (
    <div className="mx-6 my-3 rounded border border-dashed border-amber-400/70 bg-amber-50/40 px-3 py-2 font-mono text-[11px] leading-tight text-[#7A5417]">
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-0.5">
        <span className="font-semibold">WL DEBUG</span>
        <span>firm_id={firmId ?? "—"}</span>
        <span>clients={ctxLoading ? "…" : clients.length}</span>
        <span>
          client_ids=[
          {clients
            .slice(0, 3)
            .map((c) => c.id.slice(0, 8))
            .join(",")}
          {clients.length > 3 ? `,+${clients.length - 3}` : ""}]
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 md:grid-cols-3 lg:grid-cols-5">
        {rows.map((r) => (
          <div
            key={r.key}
            className={
              r.key === module
                ? "rounded bg-amber-200/60 px-1 font-semibold"
                : "px-1"
            }
          >
            {r.label}: {r.loading ? "…" : r.count} <span className="opacity-60">({r.table})</span>
          </div>
        ))}
      </div>
    </div>
  );
};
