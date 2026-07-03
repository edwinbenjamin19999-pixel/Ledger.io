import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RiskKind =
  | "new_supplier"
  | "bg_changed"
  | "amount_anomaly"
  | "duplicate"
  | "duplicate_period"
  | "overbilling"
  | "unit_price_drift"
  | "missing_data"
  | "frequency_anomaly";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface RiskSignal {
  id: string;
  invoice_id: string;
  company_id: string;
  kind: RiskKind;
  severity: RiskSeverity;
  score_contribution: number;
  details: Record<string, unknown>;
  resolved_at: string | null;
  created_at: string;
}

export function useRiskSignals(invoiceId: string | null) {
  return useQuery({
    queryKey: ["risk-signals", invoiceId],
    enabled: !!invoiceId,
    queryFn: async (): Promise<RiskSignal[]> => {
      const { data, error } = await supabase
        .from("invoice_risk_signals" as never)
        .select("*")
        .eq("invoice_id", invoiceId!)
        .order("score_contribution", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RiskSignal[];
    },
  });
}

export function useCompanyRiskSignals(companyId: string | null) {
  return useQuery({
    queryKey: ["company-risk-signals", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<RiskSignal[]> => {
      const { data, error } = await supabase
        .from("invoice_risk_signals" as never)
        .select("*")
        .eq("company_id", companyId!)
        .is("resolved_at", null);
      if (error) throw error;
      return (data ?? []) as unknown as RiskSignal[];
    },
  });
}

export const RISK_KIND_LABELS: Record<RiskKind, string> = {
  new_supplier: "Ny leverantör",
  bg_changed: "BG/PG har ändrats",
  amount_anomaly: "Avvikande belopp",
  duplicate: "Möjlig dubblett",
  duplicate_period: "Dubblett i samma period",
  overbilling: "Möjlig överfakturering",
  unit_price_drift: "Avvikande enhetspris",
  missing_data: "Saknad data",
  frequency_anomaly: "Avvikande frekvens",
};
