import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { useState, useEffect } from "react";

export interface Project { id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  client_name: string | null;
  client_id: string | null;
  status: string;
  project_type: string;
  budget_revenue: number | null;
  budget_cost: number | null;
  estimated_hours: number | null;
  logged_hours: number | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTransaction { id: string;
  project_id: string;
  journal_entry_id: string | null;
  invoice_id: string | null;
  transaction_type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  auto_linked: boolean;
  created_at: string;
}

export function useProjects() { const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => { const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setSelectedCompanyId(stored);
  }, []);
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({ queryKey: ["projects", selectedCompanyId],
    queryFn: async () => { if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Project[];
    },
    enabled: !!selectedCompanyId,
  });

  const createProject = useMutation({ mutationFn: async (project: { name: string;
      client_name?: string;
      start_date: string;
      end_date?: string;
      budget_revenue?: number;
      budget_cost?: number;
      project_type: string;
    }) => { if (!selectedCompanyId || !user) throw new Error("Ingen kontext");

      // Generate project code
      const { data: codeData, error: codeError } = await supabase.rpc(
        "generate_project_code",
        { p_company_id: selectedCompanyId }
      );
      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from("projects")
        .insert({ company_id: selectedCompanyId,
          code: codeData,
          name: project.name,
          client_name: project.client_name || null,
          start_date: project.start_date,
          end_date: project.end_date || null,
          budget_revenue: project.budget_revenue || 0,
          budget_cost: project.budget_cost || 0,
          project_type: project.project_type,
          status: "active",
          is_active: true,
          created_by: user.id,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt skapat");
    },
    onError: (e: any) => toast.error(e.message || "Kunde inte skapa projekt"),
  });

  const updateProject = useMutation({ mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => { const { error } = await supabase
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: Error) => toast.error(error.message || "Projektåtgärden misslyckades"),
  });

  return { projects: projectsQuery.data || [], isLoading: projectsQuery.isLoading, createProject, updateProject };
}

export function useProjectTransactions(projectId: string | undefined) { const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ["project_transactions", projectId],
    queryFn: async () => { if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_transactions")
        .select("*")
        .eq("project_id", projectId)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return (data || []) as ProjectTransaction[];
    },
    enabled: !!projectId,
  });

  const addTransaction = useMutation({ mutationFn: async (tx: Omit<ProjectTransaction, "id" | "created_at">) => { const { error } = await supabase.from("project_transactions").insert(tx);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_transactions", projectId] });
      toast.success("Transaktion tillagd");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeTransaction = useMutation({ mutationFn: async (txId: string) => { const { error } = await supabase.from("project_transactions").delete().eq("id", txId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_transactions", projectId] });
      toast.success("Transaktion borttagen");
    },
    onError: (error: Error) => toast.error(error.message || "Projektåtgärden misslyckades"),
  });

  const transactions = query.data || [];
  const totalRevenue = transactions.filter((t) => t.transaction_type === "revenue").reduce((s, t) => s + t.amount, 0);
  const totalCost = transactions.filter((t) => t.transaction_type === "cost").reduce((s, t) => s + t.amount, 0);

  return { transactions, isLoading: query.isLoading, addTransaction, removeTransaction, totalRevenue, totalCost };
}
