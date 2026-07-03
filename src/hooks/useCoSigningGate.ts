import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";

export interface PendingCoSigner {
  name: string;
  email: string;
  invitedAt?: string;
  remindedAt?: string;
}

export interface CoSigningGateState {
  loading: boolean;
  pending: boolean;
  coSigner: PendingCoSigner | null;
  coSignatureId: string | null;
  /** Modules that REQUIRE full signing before they can be used in production. */
  restrictedFeatures: string[];
}

const RESTRICTED = [
  "payments.outgoing",
  "skatteverket.submit",
  "bankid.mandate",
  "annual_report.submit",
];

/**
 * Reads companies.metadata.cosigning_pending and exposes a guard state used
 * by feature-level gates (DirectPayment, VAT submit, AGI submit, etc.) and
 * by the global "co-signering pending" banner.
 */
export const useCoSigningGate = (): CoSigningGateState => {
  const [state, setState] = useState<CoSigningGateState>({
    loading: true,
    pending: false,
    coSigner: null,
    coSignatureId: null,
    restrictedFeatures: RESTRICTED,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const companyId = getStoredActiveCompanyId();
      if (!companyId) {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
        return;
      }
      const { data } = await supabase
        .from("companies")
        .select("metadata")
        .eq("id", companyId)
        .maybeSingle();

      const meta = (data?.metadata ?? {}) as Record<string, unknown>;
      const pending = meta.cosigning_pending === true;
      const co = (meta.pending_cosigner ?? null) as PendingCoSigner | null;
      const csId = (meta.pending_cosignature_id ?? null) as string | null;

      if (!cancelled) {
        setState({
          loading: false,
          pending,
          coSigner: co,
          coSignatureId: csId,
          restrictedFeatures: RESTRICTED,
        });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};
