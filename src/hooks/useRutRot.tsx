import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export interface RutRotSettings { id: string;
  company_id: string;
  rut_enabled: boolean;
  rot_enabled: boolean;
  f_skatt_confirmed: boolean;
  skv_registered_confirmed: boolean;
}

export interface RutRotInvoice { id: string;
  invoice_id: string;
  company_id: string;
  deduction_type: "rut" | "rot";
  labor_cost: number;
  material_cost: number;
  travel_cost: number;
  deduction_amount: number;
  customer_pays: number;
  customer_personal_id: string;
  property_designation: string | null;
  work_description: string | null;
  skv_status: string;
  skv_applied_at: string | null;
  skv_reference: string | null;
  skv_paid_at: string | null;
  skv_paid_amount: number | null;
  skv_rejection_reason: string | null;
  journal_entry_id: string | null;
  skv_payment_journal_id: string | null;
  created_at: string;
}

export interface CustomerLimit { id: string;
  company_id: string;
  customer_personal_id: string;
  customer_name: string | null;
  year: number;
  deduction_type: string;
  total_used: number;
}

function useCompanyId() { const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

export function useRutRotSettings() { const companyId = useCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["rut_rot_settings", companyId],
    queryFn: async () => { if (!companyId) return null;
      const { data, error } = await supabase
        .from("rut_rot_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data as RutRotSettings | null;
    },
    enabled: !!companyId,
  });

  const saveSettings = useMutation({ mutationFn: async (settings: { rut_enabled: boolean; rot_enabled: boolean; f_skatt_confirmed: boolean; skv_registered_confirmed: boolean }) => { if (!companyId) throw new Error("Inget företag valt");
      const { error } = await supabase
        .from("rut_rot_settings")
        .upsert({ company_id: companyId,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rut_rot_settings"] });
      toast.success("RUT/ROT-inställningar sparade");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { settings: query.data, isLoading: query.isLoading, saveSettings };
}

export function useRutRotInvoices() { const companyId = useCompanyId();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["rut_rot_invoices", companyId],
    queryFn: async () => { if (!companyId) return [];
      const { data, error } = await supabase
        .from("rut_rot_invoices")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RutRotInvoice[];
    },
    enabled: !!companyId,
  });

  const createRutRotInvoice = useMutation({ mutationFn: async (inv: Omit<RutRotInvoice, "id" | "created_at" | "updated_at" | "skv_status" | "skv_applied_at" | "skv_reference" | "skv_paid_at" | "skv_paid_amount" | "skv_rejection_reason" | "journal_entry_id" | "skv_payment_journal_id">) => { const { error } = await supabase.from("rut_rot_invoices").insert(inv);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rut_rot_invoices"] });
      toast.success("RUT/ROT-faktura registrerad");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({ mutationFn: async ({ id, ...updates }: { id: string; skv_status?: string; skv_applied_at?: string; skv_reference?: string; skv_paid_at?: string; skv_paid_amount?: number }) => { const { error } = await supabase
        .from("rut_rot_invoices")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rut_rot_invoices"] });
    },
    onError: (error: Error) => toast.error(error.message || "RUT/ROT-åtgärden misslyckades"),
  });

  return { invoices: query.data || [], isLoading: query.isLoading, createRutRotInvoice, updateStatus };
}

export function useCustomerLimits(deductionType?: string) { const companyId = useCompanyId();
  const year = new Date().getFullYear();

  const query = useQuery({ queryKey: ["rut_rot_customer_limits", companyId, year, deductionType],
    queryFn: async () => { if (!companyId) return [];
      let q = supabase
        .from("rut_rot_customer_limits")
        .select("*")
        .eq("company_id", companyId)
        .eq("year", year);
      if (deductionType) q = q.eq("deduction_type", deductionType);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CustomerLimit[];
    },
    enabled: !!companyId,
  });

  return { limits: query.data || [], isLoading: query.isLoading };
}

// Calculation helpers
export const ROT_RATE = 0.30;
export const RUT_RATE = 0.50;
export const ROT_MAX_PER_PERSON = 50000;
export const RUT_MAX_PER_PERSON = 75000;

export function calculateDeduction(
  type: "rut" | "rot",
  laborCost: number,
  usedSoFar: number = 0
): { deductionAmount: number; customerPays: number; maxAvailable: number; warning: string | null } { const rate = type === "rot" ? ROT_RATE : RUT_RATE;
  const maxPerPerson = type === "rot" ? ROT_MAX_PER_PERSON : RUT_MAX_PER_PERSON;
  const maxAvailable = Math.max(0, maxPerPerson - usedSoFar);
  const rawDeduction = laborCost * rate;
  const deductionAmount = Math.min(rawDeduction, maxAvailable);
  const customerPays = laborCost - deductionAmount; // customer pays labor minus deduction

  let warning: string | null = null;
  if (usedSoFar > 0 && maxAvailable < rawDeduction) { const fmt = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
    warning = `Kunden har redan utnyttjat ${fmt.format(usedSoFar)} kr av ${fmt.format(maxPerPerson)} kr i ${type.toUpperCase()}-avdrag i år. Max ${fmt.format(maxAvailable)} kr kvar.`;
  }

  return { deductionAmount, customerPays, maxAvailable, warning };
}
