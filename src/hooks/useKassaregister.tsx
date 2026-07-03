import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { toast } from "sonner";
import { useState, useEffect } from "react";

function useCompanyId() { const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

export interface PosConnection { id: string;
  company_id: string;
  provider: string;
  provider_name: string;
  is_active: boolean;
  last_synced_at: string | null;
  config: Record<string, any>;
  created_at: string;
}

export interface PosDailySales { id: string;
  company_id: string;
  sale_date: string;
  total_sales: number;
  cash_amount: number;
  card_amount: number;
  swish_amount: number;
  other_amount: number;
  transaction_count: number;
  vat_breakdown: any[];
  is_booked: boolean;
  journal_entry_id: string | null;
  closed_by: string | null;
  closed_at: string | null;
}

export interface PosVatCategory { id: string;
  company_id: string;
  pos_category: string;
  vat_rate: number;
  account_number: string;
  account_name: string | null;
  description: string | null;
}

export interface PosZReport { id: string;
  company_id: string;
  report_date: string;
  report_number: string | null;
  total_sales: number;
  cash_amount: number | null;
  card_amount: number | null;
  swish_amount: number | null;
  returns_amount: number;
  source: string;
  notes: string | null;
  created_at: string;
}

// === POS Connection ===
export function usePosConnection() { const companyId = useCompanyId();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["pos_connections", companyId],
    queryFn: async () => { if (!companyId) return null;
      const { data, error } = await supabase
        .from("pos_connections")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as PosConnection | null;
    },
    enabled: !!companyId,
  });

  const createConnection = useMutation({ mutationFn: async (conn: { provider: string; provider_name: string; config?: Record<string, any> }) => { if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("pos_connections").insert({ company_id: companyId,
        ...conn,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_connections"] });
      toast.success("Kassasystem anslutet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { connection: query.data, isLoading: query.isLoading, createConnection };
}

// === Daily Sales ===
export function usePosDailySales(month?: string) { const companyId = useCompanyId();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["pos_daily_sales", companyId, month],
    queryFn: async () => { if (!companyId) return [];
      let q = supabase
        .from("pos_daily_sales")
        .select("*")
        .eq("company_id", companyId)
        .order("sale_date", { ascending: false });
      if (month) { q = q.gte("sale_date", `${month}-01`).lte("sale_date", `${month}-31`);
      }
      const { data, error } = await q.limit(31);
      if (error) throw error;
      return (data || []) as PosDailySales[];
    },
    enabled: !!companyId,
  });

  const upsertSales = useMutation({ mutationFn: async (sales: Omit<PosDailySales, "id" | "created_at" | "updated_at" | "is_booked" | "journal_entry_id" | "closed_by" | "closed_at">) => { const { error } = await supabase.from("pos_daily_sales").upsert({ ...sales,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,sale_date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_daily_sales"] });
      toast.success("Daglig försäljning sparad");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDaySales = useMutation({ mutationFn: async ({ id, userId }: { id: string; userId: string }) => { const { error } = await supabase
        .from("pos_daily_sales")
        .update({ is_booked: true, closed_by: userId, closed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_daily_sales"] });
      toast.success("Dagen stängd och bokförd");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { sales: query.data || [], isLoading: query.isLoading, upsertSales, closeDaySales };
}

// === VAT Categories ===
export function usePosVatCategories() { const companyId = useCompanyId();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["pos_vat_categories", companyId],
    queryFn: async () => { if (!companyId) return [];
      const { data, error } = await supabase
        .from("pos_vat_categories")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data || []) as PosVatCategory[];
    },
    enabled: !!companyId,
  });

  const addCategory = useMutation({ mutationFn: async (cat: Omit<PosVatCategory, "id" | "created_at">) => { const { error } = await supabase.from("pos_vat_categories").insert(cat);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_vat_categories"] });
      toast.success("Momskategori tillagd");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { categories: query.data || [], isLoading: query.isLoading, addCategory };
}

// === Z-Reports ===
export function usePosZReports() { const companyId = useCompanyId();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["pos_z_reports", companyId],
    queryFn: async () => { if (!companyId) return [];
      const { data, error } = await supabase
        .from("pos_z_reports")
        .select("*")
        .eq("company_id", companyId)
        .order("report_date", { ascending: false })
        .limit(90);
      if (error) throw error;
      return (data || []) as PosZReport[];
    },
    enabled: !!companyId,
  });

  const addReport = useMutation({ mutationFn: async (report: Omit<PosZReport, "id" | "created_at">) => { const { error } = await supabase.from("pos_z_reports").insert(report);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_z_reports"] });
      toast.success("Z-rapport sparad");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { reports: query.data || [], isLoading: query.isLoading, addReport };
}

// Helpers
export const formatKr = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export const formatPercent = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 }).format(n) + "%";
