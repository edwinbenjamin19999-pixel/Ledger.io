// NOTE: Denna hook använder 'service_contracts'-tabellen i Supabase.
// Routens namn är /contracts men databastabellen heter service_contracts.
// Detta är avsiktligt — ändra INTE tabellnamnet utan att migrera data.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ServiceContract { id: string;
  company_id: string;
  customer_id: string | null;
  contract_number: string;
  title: string;
  description: string | null;
  status: string;
  billing_interval: string;
  currency: string;
  total_amount: number;
  start_date: string;
  end_date: string | null;
  next_invoice_date: string | null;
  last_invoice_date: string | null;
  renewal_type: string;
  notice_period_days: number | null;
  indexation_enabled: boolean | null;
  indexation_type: string | null;
  indexation_percent: number | null;
  indexation_applied_at: string | null;
  churn_risk_score: number | null;
  churn_risk_factors: any;
  ai_pricing_suggestion: any;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  customer?: { name: string; org_number: string } | null;
}

export interface ContractItem { id: string;
  contract_id: string;
  description: string;
  unit_price: number;
  quantity: number;
  discount_percent: number | null;
  vat_code: string | null;
  account_number: string | null;
  line_total: number;
  sort_order: number;
}

export interface ContractInvoice { id: string;
  contract_id: string;
  invoice_id: string | null;
  company_id: string;
  period_start: string;
  period_end: string;
  amount: number;
  status: string;
  generated_at: string | null;
  created_at: string;
}

export const useContracts = (companyId?: string) => { const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContracts = useCallback(async () => { if (!companyId) { setLoading(false); return; }
    try { const { data, error } = await supabase
        .from("service_contracts")
        .select("*, customer:customers(name, org_number)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setContracts(data || []);
    } catch (e) { console.error("Error loading contracts:", e);
    } finally { setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const createContract = async (contract: Partial<ServiceContract>) => { const { data: { user } } = await supabase.auth.getUser();
    if (!user || !companyId) return null;
    const { data, error } = await supabase
      .from("service_contracts")
      .insert([{ ...contract, company_id: companyId, created_by: user.id, contract_number: "" } as any])
      .select()
      .maybeSingle();
    if (error) { toast.error("Kunde inte skapa avtal"); console.error(error); return null; }
    toast.success("Avtal skapat");
    loadContracts();
    return data;
  };

  const updateContract = async (id: string, updates: Partial<ServiceContract>) => { const { error } = await supabase.from("service_contracts").update(updates as Record<string, unknown>).eq("id", id);
    if (error) { toast.error("Kunde inte uppdatera avtal"); return false; }
    toast.success("Avtal uppdaterat");
    loadContracts();
    return true;
  };

  const deleteContract = async (id: string) => { const { error } = await supabase.from("service_contracts").delete().eq("id", id);
    if (error) { toast.error("Kunde inte radera avtal"); return false; }
    toast.success("Avtal raderat");
    loadContracts();
    return true;
  };

  // Contract items
  const loadItems = async (contractId: string): Promise<ContractItem[]> => { const { data, error } = await supabase
      .from("contract_items")
      .select("*")
      .eq("contract_id", contractId)
      .order("sort_order");
    if (error) { console.error(error); return []; }
    return data || [];
  };

  const addItem = async (contractId: string, item: Partial<ContractItem>) => { const { error } = await supabase.from("contract_items").insert([{ ...item, contract_id: contractId } as any]);
    if (error) { toast.error("Kunde inte lägga till rad"); return false; }
    return true;
  };

  // Contract invoices
  const loadInvoices = async (contractId: string): Promise<ContractInvoice[]> => { const { data, error } = await supabase
      .from("contract_invoices")
      .select("*")
      .eq("contract_id", contractId)
      .order("period_start", { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  };

  // Stats
  const stats = { total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    mrr: contracts.filter(c => c.status === 'active').reduce((sum, c) => { const monthly = c.billing_interval === 'monthly' ? c.total_amount
        : c.billing_interval === 'quarterly' ? c.total_amount / 3
        : c.billing_interval === 'semi_annually' ? c.total_amount / 6
        : c.total_amount / 12;
      return sum + monthly;
    }, 0),
    arr: 0,
    pendingRenewal: contracts.filter(c => c.status === 'pending_renewal').length,
    avgChurnRisk: contracts.filter(c => c.churn_risk_score != null).length > 0
      ? contracts.filter(c => c.churn_risk_score != null).reduce((s, c) => s + (c.churn_risk_score || 0), 0) / contracts.filter(c => c.churn_risk_score != null).length
      : 0,
  };
  stats.arr = stats.mrr * 12;

  return { contracts, loading, stats, createContract, updateContract, deleteContract, loadItems, addItem, loadInvoices, reload: loadContracts };
};
