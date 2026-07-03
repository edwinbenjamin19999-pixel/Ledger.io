import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InitiatePaymentInput, InitiatePaymentResult } from "@/lib/payments/providers/pis";

interface State {
  loading: boolean;
  result: InitiatePaymentResult | null;
  error: string | null;
}

export function useInitiateBankPayment() {
  const [state, setState] = useState<State>({ loading: false, result: null, error: null });

  const initiate = useCallback(async (input: InitiatePaymentInput): Promise<InitiatePaymentResult | null> => {
    setState({ loading: true, result: null, error: null });
    try {
      const { data, error } = await supabase.functions.invoke<InitiatePaymentResult>(
        "initiate-bank-payment",
        {
          body: {
            companyId: input.companyId,
            paymentBatchId: input.paymentBatchId ?? null,
            amount: input.amount,
            currency: input.currency,
            debtorIban: input.debtorIban ?? null,
            creditorName: input.creditorName,
            creditorIban: input.creditorIban ?? null,
            reference: input.reference ?? null,
            returnUrl: input.returnUrl,
          },
        },
      );
      if (error) throw error;
      if (!data) throw new Error("Tomt svar från betalningsinitieringen");

      setState({ loading: false, result: data, error: null });
      toast.success("Betalning initierad — du omdirigeras till banken");
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState({ loading: false, result: null, error: msg });
      toast.error(`Kunde inte initiera betalning: ${msg}`);
      return null;
    }
  }, []);

  return { ...state, initiate };
}
